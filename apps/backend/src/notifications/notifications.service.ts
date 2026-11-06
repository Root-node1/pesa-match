import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { SmsProvider } from '../sms/sms-provider.interface.js';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';

function normalizeKenyanPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;
  throw new BadRequestException('Invalid Kenyan phone number');
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, @Inject('SMS_PROVIDER') private provider: SmsProvider, private config: ConfigService) {}

  async getPreferences(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException();
    return {
      enabled: org.smsNotificationsEnabled,
      recipient: org.smsRecipient,
      consentGrantedAt: org.smsConsentGrantedAt,
      consentWithdrawnAt: org.smsConsentWithdrawnAt,
      provider: this.provider.name,
    };
  }

  async updatePreferences(orgId: string, enabled: boolean, recipient?: string, consent?: boolean) {
    const data: any = {};
    if (recipient !== undefined) {
      data.smsRecipient = recipient ? normalizeKenyanPhone(recipient) : null;
    }
    if (enabled) {
      const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
      if (!org?.smsRecipient && !recipient) throw new BadRequestException('Recipient required to enable SMS');
      if (consent !== true) throw new BadRequestException('Explicit consent required');
      data.smsNotificationsEnabled = true;
      data.smsConsentGrantedAt = new Date();
      data.smsConsentWithdrawnAt = null;
    } else {
      data.smsNotificationsEnabled = false;
      data.smsConsentWithdrawnAt = new Date();
    }
    return this.prisma.organization.update({ where: { id: orgId }, data });
  }

  async queueReconciliationSummary(orgId: string, matched: number, review: number, partial: number, idempotencyKey: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || !org.smsNotificationsEnabled || !org.smsRecipient || !org.smsConsentGrantedAt || org.smsConsentWithdrawnAt) return null;
    const message = `PesaMatch: Your reconciliation is complete. ${matched} payments matched, ${review} require review and ${partial} are partially paid. Sign in to view details.`;
    try {
      return await this.prisma.notificationOutbox.create({
        data: {
          organizationId: orgId,
          recipient: org.smsRecipient,
          body: message,
          status: 'PENDING',
          idempotencyKey,
        },
      });
    } catch {
      // duplicate idempotency key -> already queued
      return null;
    }
  }

  async list(orgId: string) {
    return this.prisma.notificationOutbox.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } });
  }

  async get(orgId: string, id: string) {
    const n = await this.prisma.notificationOutbox.findFirst({ where: { id, organizationId: orgId } });
    if (!n) throw new NotFoundException();
    return n;
  }

  async retry(orgId: string, id: string) {
    const n = await this.prisma.notificationOutbox.findFirst({ where: { id, organizationId: orgId } });
    if (!n) throw new NotFoundException();
    if (n.status !== 'FAILED' && n.status !== 'PENDING') throw new BadRequestException('Not retryable');
    return this.prisma.notificationOutbox.update({ where: { id }, data: { status: 'PENDING', lastError: null } });
  }

  async processPending() {
    const pending = await this.prisma.notificationOutbox.findMany({ where: { status: 'PENDING' }, take: 50 });
    const results: any[] = [];
    for (const n of pending) {
      await this.prisma.notificationOutbox.update({ where: { id: n.id }, data: { status: 'PROCESSING', attempts: { increment: 1 } } });
      try {
        const res = await this.provider.send({ to: n.recipient, message: n.body });
        await this.prisma.notificationOutbox.update({
          where: { id: n.id },
          data: {
            status: res.accepted ? 'SUBMITTED' : 'FAILED',
            providerMessageId: res.providerMessageId,
            lastError: res.errorMessage,
            sentAt: res.accepted ? new Date() : null,
          },
        });
        results.push({ id: n.id, accepted: res.accepted });
      } catch (e: any) {
        await this.prisma.notificationOutbox.update({
          where: { id: n.id },
          data: { status: 'FAILED', lastError: String(e?.message ?? e) },
        });
        results.push({ id: n.id, accepted: false, error: String(e?.message ?? e) });
      }
    }
    return { processed: results.length, results };
  }
}
