import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';

const prisma = new PrismaClient();
const DEMO_EMAIL = 'demo@pesamatch.local';
const DEMO_PASSWORD = 'DemoPass!2026';

async function main() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (user) { console.log('Demo data already exists; skipping.'); return; }
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  user = await prisma.user.create({ data: { email: DEMO_EMAIL, passwordHash, firstName: 'Demo', lastName: 'Owner' } });
  const org = await prisma.organization.create({ data: { name: 'PesaMatch Demo Merchant', currency: 'KES' } });
  await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role: 'OWNER' } });

  const o1 = await prisma.order.create({ data: { organizationId: org.id, sourceReference: 'ORD-1001', customerName: 'Acme Ltd', amountMinor: BigInt(100000), currency: 'KES', status: 'PAID', reconciliationStatus: 'MATCHED', fingerprint: `demo:order:o1` } });
  const o2 = await prisma.order.create({ data: { organizationId: org.id, sourceReference: 'ORD-1002', customerName: 'Beta Traders', amountMinor: BigInt(150000), currency: 'KES', status: 'PAID', reconciliationStatus: 'MATCHED', fingerprint: `demo:order:o2` } });
  const o3 = await prisma.order.create({ data: { organizationId: org.id, sourceReference: 'ORD-1003', customerName: 'Gamma Shop', amountMinor: BigInt(200000), currency: 'KES', status: 'OPEN', reconciliationStatus: 'UNMATCHED', fingerprint: `demo:order:o3` } });
  const o4 = await prisma.order.create({ data: { organizationId: org.id, sourceReference: 'ORD-1004', customerName: 'Delta Co', amountMinor: BigInt(75000), currency: 'KES', status: 'OPEN', reconciliationStatus: 'REVIEW_REQUIRED', fingerprint: `demo:order:o4` } });

  const p1 = await prisma.payment.create({ data: { organizationId: org.id, sourceReference: 'TX-1001', transactionReference: 'TX-1001', amountMinor: BigInt(100000), currency: 'KES', status: 'FULLY_ALLOCATED', reconciliationStatus: 'MATCHED', fingerprint: `demo:pay:p1` } });
  const p2 = await prisma.payment.create({ data: { organizationId: org.id, sourceReference: 'TX-1002a', transactionReference: 'TX-1002a', amountMinor: BigInt(50000), currency: 'KES', status: 'FULLY_ALLOCATED', reconciliationStatus: 'MATCHED', fingerprint: `demo:pay:p2` } });
  const p3 = await prisma.payment.create({ data: { organizationId: org.id, sourceReference: 'TX-1002b', transactionReference: 'TX-1002b', amountMinor: BigInt(100000), currency: 'KES', status: 'FULLY_ALLOCATED', reconciliationStatus: 'MATCHED', fingerprint: `demo:pay:p3` } });
  const p4 = await prisma.payment.create({ data: { organizationId: org.id, sourceReference: 'TX-1005', transactionReference: 'TX-1005', amountMinor: BigInt(30000), currency: 'KES', status: 'UNALLOCATED', reconciliationStatus: 'UNMATCHED', fingerprint: `demo:pay:p4` } });
  const p5 = await prisma.payment.create({ data: { organizationId: org.id, sourceReference: 'TX-1002a', transactionReference: 'TX-1002a', amountMinor: BigInt(50000), currency: 'KES', status: 'DUPLICATE_SUSPECTED', reconciliationStatus: 'DUPLICATE_SUSPECTED', fingerprint: `demo:pay:p5` } });
  const p6 = await prisma.payment.create({ data: { organizationId: org.id, sourceReference: 'TX-1006', transactionReference: 'TX-1006', amountMinor: BigInt(75000), currency: 'KES', status: 'UNALLOCATED', reconciliationStatus: 'REVIEW_REQUIRED', fingerprint: `demo:pay:p6` } });

  await prisma.paymentMatch.create({ data: { organizationId: org.id, orderId: o1.id, paymentId: p1.id, amountMinor: BigInt(100000), status: 'APPROVED', reason: 'Exact reference match', createdByUserId: user.id } });
  await prisma.paymentMatch.create({ data: { organizationId: org.id, orderId: o2.id, paymentId: p2.id, amountMinor: BigInt(50000), status: 'APPROVED', reason: 'Partial payment', createdByUserId: user.id } });
  await prisma.paymentMatch.create({ data: { organizationId: org.id, orderId: o2.id, paymentId: p3.id, amountMinor: BigInt(100000), status: 'APPROVED', reason: 'Partial payment', createdByUserId: user.id } });
  await prisma.paymentMatch.create({ data: { organizationId: org.id, orderId: o4.id, paymentId: p6.id, amountMinor: BigInt(75000), status: 'SUGGESTED', reason: 'Exact outstanding amount match (requires review)', createdByUserId: user.id } });

  console.log('Demo data created.');
  console.log('Login:', DEMO_EMAIL, '/', DEMO_PASSWORD);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
