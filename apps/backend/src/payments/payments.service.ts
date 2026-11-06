import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { ListPaymentsDto } from './dto/list-payments.dto.js';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreatePaymentDto, importBatchId?: string) {
    const fingerprint = dto.externalTransactionReference
      ? `ref:${dto.externalTransactionReference}`
      : `manual:${dto.amountMinor}:${dto.paymentDate ?? ''}:${dto.payerReference ?? ''}`;
    const created = await this.prisma.payment.create({
      data: {
        organizationId: orgId,
        sourceReference: dto.externalTransactionReference,
        transactionReference: dto.externalTransactionReference,
        amountMinor: BigInt(dto.amountMinor),
        currency: dto.currency ?? 'KES',
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
        importBatchId,
        fingerprint: `manual:${orgId}:${fingerprint}`,
      },
    });
    return this.serialize(created);
  }

  async list(orgId: string, q: ListPaymentsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const where: Record<string, unknown> = { organizationId: orgId };
    if (q.reconciliationStatus) where.reconciliationStatus = q.reconciliationStatus;
    if (q.reference) where.transactionReference = { contains: q.reference, mode: 'insensitive' };
    if (q.dateFrom || q.dateTo) {
      const pd: Record<string, Date> = {};
      if (q.dateFrom) pd.gte = new Date(q.dateFrom);
      if (q.dateTo) pd.lte = new Date(q.dateTo);
      where.paymentDate = pd;
    }
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { matches: true, importBatch: true },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items: items.map((p) => this.serialize(p)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async get(orgId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId: orgId },
      include: { matches: { include: { order: true } }, importBatch: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    const allocated = payment.matches
      .filter((m) => m.status === 'APPROVED')
      .reduce((s, m) => s + Number(m.amountMinor), 0);
    return { ...this.serialize(payment), allocatedMinor: allocated, availableMinor: Number(payment.amountMinor) - allocated };
  }

  private serialize(p: any) {
    return {
      ...p,
      amountMinor: Number(p.amountMinor),
      matches: (p.matches ?? []).map((m: any) => ({ ...m, amountMinor: Number(m.amountMinor) })),
    };
  }
}
