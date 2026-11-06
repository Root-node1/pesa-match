import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateOrderDto, importBatchId?: string) {
    const fingerprint = dto.externalReference
      ? `ref:${dto.externalReference}`
      : `manual:${dto.amountMinor}:${dto.orderDate ?? ''}:${dto.description ?? ''}:${dto.customerName ?? ''}`;
    const created = await this.prisma.order.create({
      data: {
        organizationId: orgId,
        sourceReference: dto.externalReference,
        customerName: dto.customerName,
        description: dto.description,
        amountMinor: BigInt(dto.amountMinor),
        currency: dto.currency ?? 'KES',
        orderDate: dto.orderDate ? new Date(dto.orderDate) : null,
        importBatchId,
        fingerprint: `manual:${orgId}:${fingerprint}`,
      },
    });
    return this.serialize(created);
  }

  async list(orgId: string, q: ListOrdersDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const where: Record<string, unknown> = { organizationId: orgId };
    if (q.status) where.status = q.status;
    if (q.reconciliationStatus) where.reconciliationStatus = q.reconciliationStatus;
    if (q.reference) where.sourceReference = { contains: q.reference, mode: 'insensitive' };
    if (q.dateFrom || q.dateTo) {
      const od: Record<string, Date> = {};
      if (q.dateFrom) od.gte = new Date(q.dateFrom);
      if (q.dateTo) od.lte = new Date(q.dateTo);
      where.orderDate = od;
    }
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { matches: true, importBatch: true },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: items.map((o) => this.serialize(o)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async get(orgId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, organizationId: orgId },
      include: { matches: { include: { payment: true } }, importBatch: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const allocated = order.matches
      .filter((m) => m.status === 'APPROVED')
      .reduce((s, m) => s + Number(m.amountMinor), 0);
    return { ...this.serialize(order), allocatedMinor: allocated, outstandingMinor: Number(order.amountMinor) - allocated };
  }

  private serialize(o: any) {
    return {
      ...o,
      amountMinor: Number(o.amountMinor),
      matches: (o.matches ?? []).map((m: any) => ({ ...m, amountMinor: Number(m.amountMinor) })),
    };
  }
}
