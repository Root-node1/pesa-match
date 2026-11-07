import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class ReconciliationService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  private defaultPeriod() {
    return { start: new Date('1970-01-01T00:00:00.000Z'), end: new Date() };
  }

  async run(orgId: string, actorUserId: string | null, periodStart?: string, periodEnd?: string) {
    const start = periodStart ? new Date(periodStart) : this.defaultPeriod().start;
    const end = periodEnd ? new Date(periodEnd) : this.defaultPeriod().end;

    return this.prisma.$transaction(
      async (tx) => {
        const run = await tx.reconciliationRun.create({
          data: {
            organizationId: orgId,
            periodStart: start,
            periodEnd: end,
            currency: 'KES',
            status: 'RUNNING',
            createdByUserId: actorUserId,
          },
        });

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

          const refOrders = orders.filter((o) => o.sourceReference && o.sourceReference === payment.transactionReference);
          if (refOrders.length === 1) {
            const order = refOrders[0];
            const outstanding = Number(order.amountMinor) - (orderAllocated.get(order.id) ?? 0);
            if (outstanding > 0 && Number(payment.amountMinor) === outstanding) {
              const existing = matches.find((m) => m.orderId === order.id && m.paymentId === payment.id && m.status === 'APPROVED');
              if (!existing) {
                await tx.paymentMatch.create({
                  data: {
                    organizationId: orgId,
                    runId: run.id,
                    orderId: order.id,
                    paymentId: payment.id,
                    amountMinor: BigInt(Math.min(available, outstanding)),
                    status: 'APPROVED',
                    isManual: false,
                    reason: 'Exact transaction reference and amount match',
                    createdByUserId: actorUserId,
                  },
                });
                orderAllocated.set(order.id, (orderAllocated.get(order.id) ?? 0) + Math.min(available, outstanding));
                paymentAllocated.set(payment.id, (paymentAllocated.get(payment.id) ?? 0) + Math.min(available, outstanding));
                autoMatches++;
              }
            } else if (refOrders.length === 1 && outstanding > 0) {
              // amount mismatch
              const exists = matches.find((m) => m.orderId === refOrders[0].id && m.paymentId === payment.id);
              if (!exists) {
                await tx.paymentMatch.create({
                  data: {
                    organizationId: orgId,
                    runId: run.id,
                    orderId: refOrders[0].id,
                    paymentId: payment.id,
                    amountMinor: BigInt(Math.min(available, Number(refOrders[0].amountMinor))),
                    status: 'SUGGESTED',
                    isManual: false,
                    reason: 'Transaction reference match with amount mismatch (requires review)',
                    createdByUserId: actorUserId,
                  },
                });
                suggestions++;
              }
              // create amount mismatch exception
              await tx.reconciliationException.create({
                data: {
                  organizationId: orgId,
                  runId: run.id,
                  type: 'AMOUNT_MISMATCH',
                  orderId: refOrders[0].id,
                  paymentId: payment.id,
                  expectedMinor: BigInt(refOrders[0].amountMinor),
                  actualMinor: BigInt(payment.amountMinor),
                  differenceMinor: BigInt(Number(payment.amountMinor) - Number(refOrders[0].amountMinor)),
                  description: 'Transaction reference matches but amounts differ',
                },
              }).catch(() => undefined);
            } else if (outstanding <= 0) {
              const exists = matches.find((m) => m.orderId === order.id && m.paymentId === payment.id);
              if (!exists) {
                await tx.paymentMatch.create({
                  data: {
                    organizationId: orgId,
                    runId: run.id,
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
            const order = refOrders[0];
            const exists = matches.find((m) => m.orderId === order.id && m.paymentId === payment.id);
            if (!exists) {
              await tx.paymentMatch.create({
                data: {
                  organizationId: orgId,
                  runId: run.id,
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
                    runId: run.id,
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
          const hasSuggested = (await tx.paymentMatch.count({ where: { orderId: order.id, status: 'SUGGESTED' } })) > 0;
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

        // Create exceptions
        for (const payment of allPayments) {
          if (duplicateIds.has(payment.id)) {
            await tx.reconciliationException.create({
              data: { organizationId: orgId, runId: run.id, type: 'SUSPECTED_DUPLICATE', paymentId: payment.id, description: 'Suspected duplicate payment by transaction reference' },
            }).catch(() => undefined);
            continue;
          }
          const allocated = paymentAllocated.get(payment.id) ?? 0;
          if (allocated === 0) {
            await tx.reconciliationException.create({
              data: { organizationId: orgId, runId: run.id, type: 'UNMATCHED_PAYMENT', paymentId: payment.id, description: 'Payment has no allocation' },
            }).catch(() => undefined);
          }
        }
        for (const order of orders) {
          const allocated = orderAllocated.get(order.id) ?? 0;
          if (allocated === 0) {
            await tx.reconciliationException.create({
              data: { organizationId: orgId, runId: run.id, type: 'UNMATCHED_ORDER', orderId: order.id, description: 'Order has no payment allocation' },
            }).catch(() => undefined);
          }
        }
        // import validation errors
        const badBatches = await tx.importBatch.findMany({ where: { organizationId: orgId, failedRows: { gt: 0 } } });
        for (const b of badBatches) {
          await tx.reconciliationException.create({
            data: { organizationId: orgId, runId: run.id, type: 'IMPORT_VALIDATION_ERROR', importBatchId: b.id, description: `${b.failedRows} rejected rows in import batch` },
          }).catch(() => undefined);
        }
        const expected = orders.reduce((s, o) => s + Number(o.amountMinor), 0);
        const received = allPayments.reduce((s, p) => s + Number(p.amountMinor), 0);
        const allocated = orderAllocated && matches ? Array.from(orderAllocated.values()).reduce((a, b) => a + b, 0) : 0;
        if (expected !== received) {
          await tx.reconciliationException.create({
            data: { organizationId: orgId, runId: run.id, type: 'UNRESOLVED_DIFFERENCE', expectedMinor: BigInt(expected), actualMinor: BigInt(received), differenceMinor: BigInt(received - expected), description: 'Total order value differs from total payment value' },
          }).catch(() => undefined);
        }

        const partialPayments = allPayments.filter((p) => {
          const allocated = paymentAllocated.get(p.id) ?? 0;
          return allocated > 0 && allocated < Number(p.amountMinor);
        }).length;

        await tx.reconciliationRun.update({
          where: { id: run.id },
          data: {
            expectedOrderValueMinor: BigInt(expected),
            receivedPaymentValueMinor: BigInt(received),
            matchedValueMinor: BigInt(allocated),
            outstandingValueMinor: BigInt(expected - allocated < 0 ? 0 : expected - allocated),
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        const auditEvent = await tx.auditEvent.create({
          data: {
            organizationId: orgId,
            actorUserId,
            action: 'RECONCILIATION_RUN',
            entityType: 'ReconciliationRun',
            entityId: run.id,
            metadata: { autoMatches, suggestions, duplicates: duplicateIds.size, runId: run.id },
          },
        });

        await this.notifications.queueReconciliationSummary(orgId, autoMatches, suggestions, partialPayments, `recon:${orgId}:${auditEvent.id}`);
        return { runId: run.id, autoMatches, suggestions, duplicates: duplicateIds.size };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async listRuns(orgId: string) {
    return this.prisma.reconciliationRun.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } });
  }

  async getRun(orgId: string, id: string) {
    const run = await this.prisma.reconciliationRun.findFirst({ where: { id, organizationId: orgId }, include: { exceptions: true, matches: true } });
    if (!run) throw new NotFoundException('Run not found');
    return run;
  }

  async completeRun(orgId: string, id: string, _actorUserId: string) {
    const run = await this.prisma.reconciliationRun.findFirst({ where: { id, organizationId: orgId } });
    if (!run) throw new NotFoundException('Run not found');
    if (run.status === 'COMPLETED') return run;
    return this.prisma.reconciliationRun.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } });
  }

  async reopenRun(orgId: string, id: string, actorUserId: string, role: string) {
    if (role !== 'OWNER' && role !== 'ADMIN') throw new ForbiddenException('Insufficient role');
    const run = await this.prisma.reconciliationRun.findFirst({ where: { id, organizationId: orgId } });
    if (!run) throw new NotFoundException('Run not found');
    return this.prisma.reconciliationRun.update({ where: { id }, data: { status: 'REOPENED', reopenedAt: new Date() } });
  }

  async listExceptions(orgId: string, filters: { status?: string; type?: string; runId?: string }) {
    const where: any = { organizationId: orgId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.runId) where.runId = filters.runId;
    return this.prisma.reconciliationException.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async resolveException(orgId: string, id: string, actorUserId: string, resolution: string, reason: string) {
    if (!reason) throw new BadRequestException('Reason is required');
    const ex = await this.prisma.reconciliationException.findFirst({ where: { id, organizationId: orgId } });
    if (!ex) throw new NotFoundException('Exception not found');
    if (ex.status !== 'OPEN') throw new BadRequestException('Exception already resolved');
    const updated = await this.prisma.reconciliationException.update({
      where: { id },
      data: { status: 'RESOLVED', resolution, resolutionReason: reason, resolvedByUserId: actorUserId, resolvedAt: new Date() },
    });
    await this.prisma.auditEvent.create({
      data: { organizationId: orgId, actorUserId, action: 'EXCEPTION_RESOLVED', entityType: 'ReconciliationException', entityId: id, metadata: { resolution, reason } },
    });
    return updated;
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
