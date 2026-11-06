import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class ReconciliationService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async run(orgId: string, actorUserId: string | null) {
    return this.prisma.$transaction(
      async (tx) => {
        // Duplicate detection by transaction reference
        const payments = await tx.payment.findMany({ where: { organizationId: orgId } });
        const groups = new Map<string, typeof payments>();
        for (const p of payments) {
          if (!p.transactionReference) continue;
          const arr = groups.get(p.transactionReference) ?? [];
          arr.push(p);
          groups.set(p.transactionReference, arr);
        }
        const duplicateIds = new Set<string>();
        for (const [, arr] of groups) {
          if (arr.length > 1) arr.forEach((p) => duplicateIds.add(p.id));
        }
        if (duplicateIds.size > 0) {
          await tx.payment.updateMany({
            where: { id: { in: [...duplicateIds] } },
            data: { status: 'DUPLICATE_SUSPECTED', reconciliationStatus: 'DUPLICATE_SUSPECTED' },
          });
        }

        const orders = await tx.order.findMany({ where: { organizationId: orgId } });
        const allPayments = await tx.payment.findMany({ where: { organizationId: orgId } });
        const matches = await tx.paymentMatch.findMany({ where: { organizationId: orgId } });

        const orderAllocated = new Map<string, number>();
        const paymentAllocated = new Map<string, number>();
        for (const o of orders) orderAllocated.set(o.id, 0);
        for (const p of allPayments) paymentAllocated.set(p.id, 0);
        for (const m of matches) {
          if (m.status !== 'APPROVED') continue;
          orderAllocated.set(m.orderId, (orderAllocated.get(m.orderId) ?? 0) + Number(m.amountMinor));
          paymentAllocated.set(m.paymentId, (paymentAllocated.get(m.paymentId) ?? 0) + Number(m.amountMinor));
        }

        let autoMatches = 0;
        let suggestions = 0;

        const eligiblePayments = allPayments
          .filter((p) => !duplicateIds.has(p.id))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        for (const payment of eligiblePayments) {
          const available = Number(payment.amountMinor) - (paymentAllocated.get(payment.id) ?? 0);
          if (available <= 0) continue;

          // Rule 1: exact transaction reference match
          const refOrders = orders.filter((o) => o.sourceReference && o.sourceReference === payment.transactionReference);
          if (refOrders.length === 1) {
            const order = refOrders[0];
            const outstanding = Number(order.amountMinor) - (orderAllocated.get(order.id) ?? 0);
            if (outstanding > 0) {
              const alloc = Math.min(available, outstanding);
              const existing = matches.find((m) => m.orderId === order.id && m.paymentId === payment.id && m.status === 'APPROVED');
              if (!existing) {
                await tx.paymentMatch.create({
                  data: {
                    organizationId: orgId,
                    orderId: order.id,
                    paymentId: payment.id,
                    amountMinor: BigInt(alloc),
                    status: 'APPROVED',
                    isManual: false,
                    reason: 'Exact transaction reference match',
                    createdByUserId: actorUserId,
                  },
                });
                orderAllocated.set(order.id, (orderAllocated.get(order.id) ?? 0) + alloc);
                paymentAllocated.set(payment.id, (paymentAllocated.get(payment.id) ?? 0) + alloc);
                autoMatches++;
              }
            } else if (outstanding <= 0) {
              // reference matches but order already paid -> suggestion
              const exists = matches.find((m) => m.orderId === order.id && m.paymentId === payment.id);
              if (!exists) {
                await tx.paymentMatch.create({
                  data: {
                    organizationId: orgId,
                    orderId: order.id,
                    paymentId: payment.id,
                    amountMinor: BigInt(Math.min(available, Number(payment.amountMinor))),
                    status: 'SUGGESTED',
                    isManual: false,
                    reason: 'Transaction reference match but order already fully allocated (review)',
                    createdByUserId: actorUserId,
                  },
                });
                suggestions++;
              }
            }
            continue;
          }
          if (refOrders.length > 1) {
            // ambiguous -> suggestion for each? create one suggestion to first? Instead mark review without allocation
            // Create a single suggested match to the first candidate
            const order = refOrders[0];
            const exists = matches.find((m) => m.orderId === order.id && m.paymentId === payment.id);
            if (!exists) {
              await tx.paymentMatch.create({
                data: {
                  organizationId: orgId,
                  orderId: order.id,
                  paymentId: payment.id,
                  amountMinor: BigInt(Math.min(available, Number(order.amountMinor))),
                  status: 'SUGGESTED',
                  isManual: false,
                  reason: 'Ambiguous transaction reference match (multiple orders) - requires review',
                  createdByUserId: actorUserId,
                },
              });
              suggestions++;
            }
            continue;
          }

          // Rule 2: exact outstanding amount single candidate -> suggestion
          const candidates = orders.filter((o) => {
            const outstanding = Number(o.amountMinor) - (orderAllocated.get(o.id) ?? 0);
            return outstanding > 0 && outstanding === available;
          });
          if (candidates.length === 1) {
            const order = candidates[0];
            const exists = matches.find((m) => m.orderId === order.id && m.paymentId === payment.id);
            if (!exists) {
              await tx.paymentMatch.create({
                data: {
                  organizationId: orgId,
                  orderId: order.id,
                  paymentId: payment.id,
                  amountMinor: BigInt(available),
                  status: 'SUGGESTED',
                  isManual: false,
                  reason: 'Exact outstanding amount match (requires review)',
                  createdByUserId: actorUserId,
                },
              });
              suggestions++;
            }
          }
        }

        // Update statuses
        for (const order of orders) {
          const allocated = orderAllocated.get(order.id) ?? 0;
          const total = Number(order.amountMinor);
          const hasSuggested = matches.some((m) => m.orderId === order.id && m.status === 'SUGGESTED') ||
            (await tx.paymentMatch.count({ where: { orderId: order.id, status: 'SUGGESTED' } })) > 0;
          let status: string;
          let recon: string;
          if (allocated >= total && total > 0) { status = 'PAID'; recon = 'MATCHED'; }
          else if (allocated > 0) { status = 'PARTIALLY_PAID'; recon = 'PARTIALLY_PAID'; }
          else { status = 'OPEN'; recon = hasSuggested ? 'REVIEW_REQUIRED' : 'UNMATCHED'; }
          await tx.order.update({ where: { id: order.id }, data: { status: status as any, reconciliationStatus: recon as any } });
        }
        for (const payment of allPayments) {
          if (duplicateIds.has(payment.id)) continue;
          const allocated = paymentAllocated.get(payment.id) ?? 0;
          const total = Number(payment.amountMinor);
          const hasSuggested = (await tx.paymentMatch.count({ where: { paymentId: payment.id, status: 'SUGGESTED' } })) > 0;
          let status: string;
          let recon: string;
          if (allocated >= total && total > 0) { status = 'FULLY_ALLOCATED'; recon = 'MATCHED'; }
          else if (allocated > 0) { status = 'PARTIALLY_ALLOCATED'; recon = 'PARTIALLY_PAID'; }
          else { status = 'UNALLOCATED'; recon = hasSuggested ? 'REVIEW_REQUIRED' : 'UNMATCHED'; }
          await tx.payment.update({ where: { id: payment.id }, data: { status: status as any, reconciliationStatus: recon as any } });
        }

        const partialPayments = allPayments.filter((p) => {
          const allocated = paymentAllocated.get(p.id) ?? 0;
          return allocated > 0 && allocated < Number(p.amountMinor);
        }).length;
        const auditEvent = await tx.auditEvent.create({
          data: {
            organizationId: orgId,
            actorUserId,
            action: 'RECONCILIATION_RUN',
            entityType: 'Organization',
            entityId: orgId,
            metadata: { autoMatches, suggestions, duplicates: duplicateIds.size },
          },
        });

        await this.notifications.queueReconciliationSummary(orgId, autoMatches, suggestions, partialPayments, `recon:${orgId}:${auditEvent.id}`);
        return { autoMatches, suggestions, duplicates: duplicateIds.size };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async summary(orgId: string) {
    const orders = await this.prisma.order.findMany({ where: { organizationId: orgId } });
    const payments = await this.prisma.payment.findMany({ where: { organizationId: orgId } });
    const matches = await this.prisma.paymentMatch.findMany({ where: { organizationId: orgId, status: 'APPROVED' } });
    const totalOrderValue = orders.reduce((s, o) => s + Number(o.amountMinor), 0);
    const totalPaymentValue = payments.reduce((s, p) => s + Number(p.amountMinor), 0);
    const totalAllocated = matches.reduce((s, m) => s + Number(m.amountMinor), 0);
    const outstanding = orders.reduce((s, o) => s + Number(o.amountMinor), 0) - totalAllocated;
    return {
      currency: 'KES',
      totalOrderValueMinor: totalOrderValue,
      totalPaymentValueMinor: totalPaymentValue,
      totalAllocatedMinor: totalAllocated,
      outstandingBalanceMinor: outstanding < 0 ? 0 : outstanding,
      orders: {
        total: orders.length,
        fullyPaid: orders.filter((o) => o.status === 'PAID').length,
        partiallyPaid: orders.filter((o) => o.status === 'PARTIALLY_PAID').length,
        unmatched: orders.filter((o) => o.reconciliationStatus === 'UNMATCHED').length,
        reviewRequired: orders.filter((o) => o.reconciliationStatus === 'REVIEW_REQUIRED').length,
      },
      payments: {
        total: payments.length,
        fullyAllocated: payments.filter((p) => p.status === 'FULLY_ALLOCATED').length,
        partiallyAllocated: payments.filter((p) => p.status === 'PARTIALLY_ALLOCATED').length,
        unmatched: payments.filter((p) => p.reconciliationStatus === 'UNMATCHED').length,
        reviewRequired: payments.filter((p) => p.reconciliationStatus === 'REVIEW_REQUIRED').length,
        suspectedDuplicates: payments.filter((p) => p.status === 'DUPLICATE_SUSPECTED').length,
      },
      reviewRequiredRecords: orders.filter((o) => o.reconciliationStatus === 'REVIEW_REQUIRED').length +
        payments.filter((p) => p.reconciliationStatus === 'REVIEW_REQUIRED').length,
      suspectedDuplicates: payments.filter((p) => p.status === 'DUPLICATE_SUSPECTED').length,
    };
  }

  async exceptions(orgId: string) {
    const orders = await this.prisma.order.findMany({
      where: { organizationId: orgId, reconciliationStatus: { in: ['UNMATCHED', 'PARTIALLY_PAID', 'REVIEW_REQUIRED', 'DUPLICATE_SUSPECTED'] } },
      include: { matches: true },
    });
    const payments = await this.prisma.payment.findMany({
      where: { organizationId: orgId, reconciliationStatus: { in: ['UNMATCHED', 'PARTIALLY_PAID', 'REVIEW_REQUIRED', 'DUPLICATE_SUSPECTED'] } },
      include: { matches: true },
    });
    const suggested = await this.prisma.paymentMatch.findMany({
      where: { organizationId: orgId, status: 'SUGGESTED' },
      include: { order: true, payment: true },
    });
    return {
      orders: orders.map((o) => ({ ...o, amountMinor: Number(o.amountMinor), matches: (o.matches ?? []).map((m: any) => ({ ...m, amountMinor: Number(m.amountMinor) })) })),
      payments: payments.map((p) => ({ ...p, amountMinor: Number(p.amountMinor), matches: (p.matches ?? []).map((m: any) => ({ ...m, amountMinor: Number(m.amountMinor) })) })),
      suggestedMatches: suggested.map((m) => ({ ...m, amountMinor: Number(m.amountMinor), order: m.order ? { ...m.order, amountMinor: Number(m.order.amountMinor) } : m.order, payment: m.payment ? { ...m.payment, amountMinor: Number(m.payment.amountMinor) } : m.payment })),
    };
  }

  async matches(orgId: string, status?: string) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    const items = await this.prisma.paymentMatch.findMany({
      where,
      include: { order: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((m) => ({ ...m, amountMinor: Number(m.amountMinor), order: { ...m.order, amountMinor: Number(m.order.amountMinor) }, payment: { ...m.payment, amountMinor: Number(m.payment.amountMinor) } }));
  }
}
