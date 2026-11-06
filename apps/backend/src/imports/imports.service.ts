import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import * as crypto from 'crypto';
import { parse } from 'csv-parse/sync';

type RowResult = { row: number; status: 'imported' | 'duplicate' | 'rejected'; reason?: string };

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

  async importOrders(orgId: string, userId: string, file: any) {
    return this.importCsv(orgId, userId, 'ORDERS', file, {
      required: ['amountMinor'],
      optional: ['externalReference', 'customerName', 'description', 'currency', 'orderDate'],
      validateRow: (row, i) => this.validateOrderRow(row, i),
      fingerprint: (orgId, row) => this.orderFingerprint(orgId, row),
      create: (orgId, row, batchId) =>
        this.prisma.order.create({
          data: {
            organizationId: orgId,
            sourceReference: row.externalReference || null,
            customerName: row.customerName || null,
            description: row.description || null,
            amountMinor: BigInt(row.amountMinor),
            currency: row.currency || 'KES',
            orderDate: row.orderDate ? new Date(row.orderDate) : null,
            importBatchId: batchId,
            fingerprint: row.__fingerprint,
          },
        }),
    });
  }

  async importPayments(orgId: string, userId: string, file: any) {
    return this.importCsv(orgId, userId, 'PAYMENTS', file, {
      required: ['amountMinor'],
      optional: ['externalTransactionReference', 'currency', 'paymentDate', 'paymentMethod', 'payerReference', 'description'],
      validateRow: (row, i) => this.validatePaymentRow(row, i),
      fingerprint: (orgId, row) => this.paymentFingerprint(orgId, row),
      create: (orgId, row, batchId) =>
        this.prisma.payment.create({
          data: {
            organizationId: orgId,
            sourceReference: row.externalTransactionReference || null,
            transactionReference: row.externalTransactionReference || null,
            amountMinor: BigInt(row.amountMinor),
            currency: row.currency || 'KES',
            paymentDate: row.paymentDate ? new Date(row.paymentDate) : null,
            importBatchId: batchId,
            fingerprint: row.__fingerprint,
          },
        }),
    });
  }

  private async importCsv(
    orgId: string,
    userId: string,
    type: 'ORDERS' | 'PAYMENTS',
    file: any,
    cfg: {
      required: string[];
      optional: string[];
      validateRow: (row: any, i: number) => string | null;
      fingerprint: (orgId: string, row: any) => string;
      create: (orgId: string, row: any, batchId: string) => Promise<any>;
    },
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('File too large (max 5MB)');
    const text = file.buffer.toString('utf8');
    let records: any[];
    try {
      records = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });
    } catch {
      throw new BadRequestException('Invalid CSV');
    }
    if (!Array.isArray(records) || records.length === 0) throw new BadRequestException('Empty CSV');
    if (records.length > 10000) throw new BadRequestException('Too many rows (max 10000)');

    const headers = Object.keys(records[0]);
    for (const r of cfg.required) {
      if (!headers.includes(r)) throw new BadRequestException(`Missing required header: ${r}`);
    }

    const batch = await this.prisma.importBatch.create({
      data: { organizationId: orgId, type, sourceName: file.originalname, totalRows: records.length },
    });

    const results: RowResult[] = [];
    let imported = 0;
    let duplicates = 0;
    const rejected: { row: number; reason: string }[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2;
        const err = cfg.validateRow(row, rowNum);
        if (err) {
          rejected.push({ row: rowNum, reason: err });
          results.push({ row: rowNum, status: 'rejected', reason: err });
          continue;
        }
        const fp = cfg.fingerprint(orgId, row);
        row.__fingerprint = fp;
        const model = type === 'ORDERS' ? 'order' : 'payment';
        const existing = await (tx as any)[model].findFirst({ where: { organizationId: orgId, fingerprint: fp } });
        if (existing) {
          duplicates++;
          results.push({ row: rowNum, status: 'duplicate' });
          continue;
        }
        try {
          await (type === 'ORDERS'
            ? tx.order.create({
                data: {
                  organizationId: orgId,
                  sourceReference: row.externalReference || null,
                  customerName: row.customerName || null,
                  description: row.description || null,
                  amountMinor: BigInt(row.amountMinor),
                  currency: row.currency || 'KES',
                  orderDate: row.orderDate ? new Date(row.orderDate) : null,
                  importBatchId: batch.id,
                  fingerprint: fp,
                },
              })
            : tx.payment.create({
                data: {
                  organizationId: orgId,
                  sourceReference: row.externalTransactionReference || null,
                  transactionReference: row.externalTransactionReference || null,
                  amountMinor: BigInt(row.amountMinor),
                  currency: row.currency || 'KES',
                  paymentDate: row.paymentDate ? new Date(row.paymentDate) : null,
                  importBatchId: batch.id,
                  fingerprint: fp,
                },
              }));
          imported++;
          results.push({ row: rowNum, status: 'imported' });
        } catch {
          rejected.push({ row: rowNum, reason: 'Database error' });
          results.push({ row: rowNum, status: 'rejected', reason: 'Database error' });
        }
      }
      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          importedRows: imported,
          failedRows: rejected.length,
          status: 'COMPLETED',
          errorSummary: { rejected, duplicates, imported, total: records.length },
        },
      });
    });

    return {
      batchId: batch.id,
      totalRows: records.length,
      importedRows: imported,
      rejectedRows: rejected.length,
      duplicateRows: duplicates,
      rejected,
    };
  }

  private validateOrderRow(row: any, _rowNum: number): string | null {
    if (!row.amountMinor) return 'Missing amountMinor';
    if (!/^-?\d+$/.test(String(row.amountMinor))) return 'amountMinor must be integer minor units';
    const amt = Number(row.amountMinor);
    if (!Number.isSafeInteger(amt) || amt <= 0) return 'Invalid amountMinor';
    if (row.currency && row.currency !== 'KES') return 'Unsupported currency';
    if (row.orderDate && isNaN(Date.parse(row.orderDate))) return 'Invalid orderDate';
    return null;
  }

  private validatePaymentRow(row: any, _rowNum: number): string | null {
    if (!row.amountMinor) return 'Missing amountMinor';
    if (!/^-?\d+$/.test(String(row.amountMinor))) return 'amountMinor must be integer minor units';
    const amt = Number(row.amountMinor);
    if (!Number.isSafeInteger(amt) || amt <= 0) return 'Invalid amountMinor';
    if (row.currency && row.currency !== 'KES') return 'Unsupported currency';
    if (row.paymentDate && isNaN(Date.parse(row.paymentDate))) return 'Invalid paymentDate';
    return null;
  }

  private orderFingerprint(orgId: string, row: any): string {
    if (row.externalReference) return `imp:order:ref:${row.externalReference}`;
    const basis = JSON.stringify({
      c: row.customerName ?? '',
      a: row.amountMinor,
      d: row.orderDate ?? '',
      desc: row.description ?? '',
    });
    return `imp:order:fp:${crypto.createHash('sha256').update(orgId + basis).digest('hex')}`;
  }

  private paymentFingerprint(orgId: string, row: any): string {
    if (row.externalTransactionReference) return `imp:payment:ref:${row.externalTransactionReference}`;
    const basis = JSON.stringify({
      a: row.amountMinor,
      d: row.paymentDate ?? '',
      p: row.payerReference ?? '',
    });
    return `imp:payment:fp:${crypto.createHash('sha256').update(orgId + basis).digest('hex')}`;
  }

  async listBatches(orgId: string) {
    return this.prisma.importBatch.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } });
  }

  async getBatch(orgId: string, id: string) {
    const b = await this.prisma.importBatch.findFirst({ where: { id, organizationId: orgId } });
    if (!b) throw new (await import('@nestjs/common')).NotFoundException('Import batch not found');
    return b;
  }
}
