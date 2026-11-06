import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  async approve(orgId: string, id: string, actorUserId: string, reason?: string) {
    const m = await this.prisma.paymentMatch.findFirst({ where: { id, organizationId: orgId } });
    if (!m) throw new NotFoundException('Match not found');
    if (m.status !== 'SUGGESTED') throw new BadRequestException('Only suggested matches can be approved');
    // check over-allocation
    const orderAllocated = await this.allocatedOrder(orgId, m.orderId, id);
    const paymentAllocated = await this.allocatedPayment(orgId, m.paymentId, id);
    const order = await this.prisma.order.findUnique({ where: { id: m.orderId } });
    const payment = await this.prisma.payment.findUnique({ where: { id: m.paymentId } });
    if (!order || !payment) throw new NotFoundException();
    const orderOutstanding = Number(order.amountMinor) - orderAllocated;
    const paymentAvailable = Number(payment.amountMinor) - paymentAllocated;
    const amt = Number(m.amountMinor);
    if (amt > orderOutstanding || amt > paymentAvailable) throw new BadRequestException('Approval would over-allocate');
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentMatch.update({ where: { id }, data: { status: 'APPROVED', reason: reason ?? m.reason } });
      await tx.auditEvent.create({
        data: { organizationId: orgId, actorUserId, action: 'MATCH_APPROVED', entityType: 'PaymentMatch', entityId: id, metadata: { reason } },
      });
    });
    const r = await this.prisma.paymentMatch.findUnique({ where: { id } });
    return r ? { ...r, amountMinor: Number(r.amountMinor) } : r;
  }

  async reject(orgId: string, id: string, actorUserId: string, reason: string) {
    if (!reason) throw new BadRequestException('Reason is required');
    const m = await this.prisma.paymentMatch.findFirst({ where: { id, organizationId: orgId } });
    if (!m) throw new NotFoundException('Match not found');
    if (m.status !== 'SUGGESTED') throw new BadRequestException('Only suggested matches can be rejected');
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentMatch.update({ where: { id }, data: { status: 'REJECTED', reason } });
      await tx.auditEvent.create({
        data: { organizationId: orgId, actorUserId, action: 'MATCH_REJECTED', entityType: 'PaymentMatch', entityId: id, metadata: { reason } },
      });
    });
    const r = await this.prisma.paymentMatch.findUnique({ where: { id } });
    return r ? { ...r, amountMinor: Number(r.amountMinor) } : r;
  }

  async manual(orgId: string, actorUserId: string, dto: { orderId: string; paymentId: string; amountMinor: number; reason: string }) {
    if (!dto.reason) throw new BadRequestException('Reason is required');
    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, organizationId: orgId } });
    const payment = await this.prisma.payment.findFirst({ where: { id: dto.paymentId, organizationId: orgId } });
    if (!order || !payment) throw new NotFoundException('Order or payment not found');
    const orderAllocated = await this.allocatedOrder(orgId, dto.orderId);
    const paymentAllocated = await this.allocatedPayment(orgId, dto.paymentId);
    const orderOutstanding = Number(order.amountMinor) - orderAllocated;
    const paymentAvailable = Number(payment.amountMinor) - paymentAllocated;
    if (dto.amountMinor <= 0) throw new BadRequestException('Amount must be positive');
    if (dto.amountMinor > orderOutstanding) throw new BadRequestException('Over-allocates order');
    if (dto.amountMinor > paymentAvailable) throw new BadRequestException('Over-allocates payment');
    const match = await this.prisma.$transaction(async (tx) => {
      const m = await tx.paymentMatch.create({
        data: {
          organizationId: orgId,
          orderId: dto.orderId,
          paymentId: dto.paymentId,
          amountMinor: BigInt(dto.amountMinor),
          status: 'APPROVED',
          isManual: true,
          reason: dto.reason,
          createdByUserId: actorUserId,
        },
      });
      await tx.auditEvent.create({
        data: { organizationId: orgId, actorUserId, action: 'MANUAL_MATCH', entityType: 'PaymentMatch', entityId: m.id, metadata: { reason: dto.reason } },
      });
      return m;
    });
    return { ...match, amountMinor: Number(match.amountMinor) };
  }

  async reverse(orgId: string, id: string, actorUserId: string, reason: string, role: string) {
    if (role !== 'OWNER' && role !== 'ADMIN') throw new ForbiddenException('Insufficient role');
    if (!reason) throw new BadRequestException('Reason is required');
    const m = await this.prisma.paymentMatch.findFirst({ where: { id, organizationId: orgId } });
    if (!m) throw new NotFoundException('Match not found');
    if (m.status !== 'APPROVED') throw new BadRequestException('Only approved matches can be reversed');
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentMatch.update({
        where: { id },
        data: { status: 'REVERSED', reversedAt: new Date(), reversedReason: reason },
      });
      await tx.auditEvent.create({
        data: { organizationId: orgId, actorUserId, action: 'MATCH_REVERSED', entityType: 'PaymentMatch', entityId: id, metadata: { reason } },
      });
    });
    const r = await this.prisma.paymentMatch.findUnique({ where: { id } });
    return r ? { ...r, amountMinor: Number(r.amountMinor) } : r;
  }

  async history(orgId: string, id: string) {
    const m = await this.prisma.paymentMatch.findFirst({ where: { id, organizationId: orgId } });
    if (!m) throw new NotFoundException('Match not found');
    const events = await this.prisma.auditEvent.findMany({
      where: { organizationId: orgId, entityType: 'PaymentMatch', entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    return { match: { ...m, amountMinor: Number(m.amountMinor) }, events };
  }

  private async allocatedOrder(orgId: string, orderId: string, excludeMatchId?: string) {
    const matches = await this.prisma.paymentMatch.findMany({
      where: { organizationId: orgId, orderId, status: 'APPROVED', ...(excludeMatchId ? { id: { not: excludeMatchId } } : {}) },
    });
    return matches.reduce((s, m) => s + Number(m.amountMinor), 0);
  }

  private async allocatedPayment(orgId: string, paymentId: string, excludeMatchId?: string) {
    const matches = await this.prisma.paymentMatch.findMany({
      where: { organizationId: orgId, paymentId, status: 'APPROVED', ...(excludeMatchId ? { id: { not: excludeMatchId } } : {}) },
    });
    return matches.reduce((s, m) => s + Number(m.amountMinor), 0);
  }
}
