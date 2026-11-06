import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import cookieParser from 'cookie-parser';

process.env.DATABASE_URL = 'postgresql://pesa:pesa@localhost:5434/pesa_match_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-secret-at-least-32-characters-long!!';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

describe('Auth (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  const base = '/api/v1/auth';
  let accessToken = '';
  let refreshCookie = '';

  it('registers a new user and organization', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/register`)
      .send({
        email: 'owner@example.com',
        password: 'password123',
        organizationName: 'Acme Ltd',
        firstName: 'Jane',
        lastName: 'Doe',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('owner@example.com');
    expect(res.body.data.organizationId).toBeDefined();
    accessToken = res.body.data.accessToken;
    refreshCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(refreshCookie).toContain('pesa_refresh');
  });

  it('rejects duplicate registration', async () => {
    await request(app.getHttpServer())
      .post(`${base}/register`)
      .send({
        email: 'owner@example.com',
        password: 'password123',
        organizationName: 'Acme Ltd',
        firstName: 'Jane',
        lastName: 'Doe',
      })
      .expect(409);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email: 'owner@example.com', password: 'password123' })
      .expect(200);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
    refreshCookie = res.headers['set-cookie']?.[0] ?? '';
  });

  it('rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email: 'owner@example.com', password: 'wrong' })
      .expect(401);
  });

  it('protects /auth/me', async () => {
    await request(app.getHttpServer()).get(`${base}/me`).expect(401);
    const res = await request(app.getHttpServer())
      .get(`${base}/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data.user.email).toBe('owner@example.com');
    expect(res.body.data.memberships).toHaveLength(1);
    expect(res.body.data.memberships[0].role).toBe('OWNER');
  });

  it('refreshes and rotates refresh token', async () => {
    const agent = request.agent(app.getHttpServer());
    // login to get cookie
    const login = await agent
      .post(`${base}/login`)
      .send({ email: 'owner@example.com', password: 'password123' })
      .expect(200);
    const cookie1 = login.headers['set-cookie']?.[0];
    expect(cookie1).toBeDefined();

    const r1 = await agent.post(`${base}/refresh`).expect(200);
    expect(r1.body.data.accessToken).toBeDefined();
    const cookie2 = r1.headers['set-cookie']?.[0];
    expect(cookie2).toBeDefined();

    // old cookie should now be revoked
    await request(app.getHttpServer())
      .post(`${base}/refresh`)
      .set('Cookie', cookie1!.split(';')[0])
      .expect(401);
  });

  it('revokes session on logout', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post(`${base}/login`)
      .send({ email: 'owner@example.com', password: 'password123' })
      .expect(200);
    const cookie = login.headers['set-cookie']?.[0]!.split(';')[0];
    await agent.post(`${base}/logout`).expect(200);
    await request(app.getHttpServer())
      .post(`${base}/refresh`)
      .set('Cookie', cookie)
      .expect(401);
  });

  it('enforces organization isolation between users', async () => {
    await request(app.getHttpServer()).post(`${base}/register`).send({
      email: 'other@example.com',
      password: 'password123',
      organizationName: 'Other Org',
      firstName: 'Bob',
      lastName: 'Smith',
    });
    const res = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email: 'other@example.com', password: 'password123' })
      .expect(200);
    const otherToken = res.body.data.accessToken;
    const me = await request(app.getHttpServer())
      .get(`${base}/me`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(me.body.data.memberships[0].organization.name).toBe('Other Org');
    // original user's token still only sees Acme
    const me2 = await request(app.getHttpServer())
      .get(`${base}/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me2.body.data.memberships[0].organization.name).toBe('Acme Ltd');
  });
});
