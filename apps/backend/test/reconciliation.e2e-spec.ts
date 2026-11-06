import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import cookieParser from 'cookie-parser';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://pesa:pesa@localhost:5434/pesa_match_test?schema=public';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret-at-least-32-characters-long!!';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

describe('Reconciliation (e2e)', () => {
  let app: INestApplication;
  let token = '';
  let _orgId = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    const prisma = app.get(PrismaService);
    await prisma.notificationOutbox.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.paymentMatch.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.importBatch.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    const reg = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'rec@example.com', password: 'password123', organizationName: 'Rec Org', firstName: 'R', lastName: 'U',
    });
    token = reg.body.data.accessToken;
    _orgId = reg.body.data.organizationId;
  });

  afterAll(async () => { if (app) await app.close(); });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('creates order and payment', async () => {
    const o = await request(app.getHttpServer()).post('/api/v1/orders').set(auth()).send({ amountMinor: 500000 }).expect(201);
    expect(o.body.amountMinor).toBe(500000);
    const p = await request(app.getHttpServer()).post('/api/v1/payments').set(auth()).send({ amountMinor: 200000 }).expect(201);
    expect(p.body.amountMinor).toBe(200000);
  });

  it('runs reconciliation and reports partial', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/reconciliation/run').set(auth()).expect(201);
    expect(res.body).toBeDefined();
    const sum = await request(app.getHttpServer()).get('/api/v1/reconciliation/summary').set(auth()).expect(200);
    expect(sum.body.outstandingBalanceMinor).toBe(500000);
  });

  it('creates suggestion for exact amount and approves', async () => {
    await request(app.getHttpServer()).post('/api/v1/orders').set(auth()).send({ amountMinor: 100000 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/payments').set(auth()).send({ amountMinor: 100000 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/reconciliation/run').set(auth()).expect(201);
    const exc = await request(app.getHttpServer()).get('/api/v1/reconciliation/exceptions').set(auth()).expect(200);
    expect(exc.body.suggestedMatches.length).toBeGreaterThanOrEqual(1);
    const sid = exc.body.suggestedMatches[0].id;
    await request(app.getHttpServer()).post(`/api/v1/matches/${sid}/approve`).set(auth()).send({}).expect(201);
    const sum = await request(app.getHttpServer()).get('/api/v1/reconciliation/summary').set(auth()).expect(200);
    expect(sum.body.totalAllocatedMinor).toBeGreaterThanOrEqual(100000);
  });

  it('rejects over-allocation on manual match', async () => {
    const orders = await request(app.getHttpServer()).get('/api/v1/orders').set(auth()).expect(200);
    const payments = await request(app.getHttpServer()).get('/api/v1/payments').set(auth()).expect(200);
    await request(app.getHttpServer()).post('/api/v1/matches/manual').set(auth()).send({
      orderId: orders.body.items[0].id,
      paymentId: payments.body.items[0].id,
      amountMinor: 999999999,
      reason: 'test',
    }).expect(400);
  });

  it('imports CSV and is idempotent', async () => {
    const csv = 'externalReference,amountMinor\nIMP-1,123456\n';
    const r1 = await request(app.getHttpServer()).post('/api/v1/imports/orders').set(auth())
      .attach('file', Buffer.from(csv), { filename: 'o.csv', contentType: 'text/csv' }).expect(201);
    expect(r1.body.importedRows).toBe(1);
    const r2 = await request(app.getHttpServer()).post('/api/v1/imports/orders').set(auth())
      .attach('file', Buffer.from(csv), { filename: 'o.csv', contentType: 'text/csv' }).expect(201);
    expect(r2.body.duplicateRows).toBe(1);
  });

  it('rejects invalid CSV headers', async () => {
    const csv = 'foo,bar\n1,2\n';
    await request(app.getHttpServer()).post('/api/v1/imports/orders').set(auth())
      .attach('file', Buffer.from(csv), { filename: 'bad.csv', contentType: 'text/csv' }).expect(400);
  });

  it('enforces org isolation', async () => {
    const reg2 = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'other2@example.com', password: 'password123', organizationName: 'Other', firstName: 'O', lastName: 'U',
    });
    const t2 = reg2.body.data.accessToken;
    // access an order from org1 with org2 token should 404
    const orders = await request(app.getHttpServer()).get('/api/v1/orders').set(auth()).expect(200);
    const id = orders.body.items[0].id;
    await request(app.getHttpServer()).get(`/api/v1/orders/${id}`).set('Authorization', `Bearer ${t2}`).expect(404);
  });

  it('exports CSV', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/exports/reconciliation').set(auth()).expect(200);
    expect(res.text).toContain('orderId');
    const res2 = await request(app.getHttpServer()).get('/api/v1/exports/exceptions').set(auth()).expect(200);
    expect(res2.text).toContain('paymentId');
  });
});
