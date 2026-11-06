import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

function csvEscape(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value as string | number | boolean);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

@Injectable()
export class ExportsService {
  constructor(private prisma: PrismaService) {}

  async reconciliationCsv(orgId: string): Promise<string> {
    const orders = await this.prisma.order.findMany({ where: { organizationId: orgId }, include: { matches: true } });
    const header = ['orderId', 'externalReference', 'amountMinor', 'allocatedMinor', 'outstandingMinor', 'status', 'reconciliationStatus'];
    const lines = [header.join(',')];
    for (const o of orders) {
      const allocated = o.matches.filter((m) => m.status === 'APPROVED').reduce((s, m) => s + Number(m.amountMinor), 0);
      lines.push([
        csvEscape(o.id),
        csvEscape(o.sourceReference),
        csvEscape(Number(o.amountMinor)),
        csvEscape(allocated),
        csvEscape(Number(o.amountMinor) - allocated),
        csvEscape(o.status),
        csvEscape(o.reconciliationStatus),
      ].join(','));
    }
    return lines.join('\n');
  }

  async exceptionsCsv(orgId: string): Promise<string> {
    const payments = await this.prisma.payment.findMany({ where: { organizationId: orgId, reconciliationStatus: { in: ['UNMATCHED', 'REVIEW_REQUIRED', 'DUPLICATE_SUSPECTED'] } } });
    const header = ['paymentId', 'transactionReference', 'amountMinor', 'status', 'reconciliationStatus', 'paymentDate'];
    const lines = [header.join(',')];
    for (const p of payments) {
      lines.push([
        csvEscape(p.id),
        csvEscape(p.transactionReference),
        csvEscape(Number(p.amountMinor)),
        csvEscape(p.status),
        csvEscape(p.reconciliationStatus),
        csvEscape(p.paymentDate?.toISOString() ?? ''),
      ].join(','));
    }
    return lines.join('\n');
  }
}
