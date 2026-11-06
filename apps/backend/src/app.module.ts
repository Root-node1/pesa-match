import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { validateEnv } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ImportsModule } from './imports/imports.module.js';
import { ReconciliationModule } from './reconciliation/reconciliation.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { ExportsModule } from './exports/exports.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env', 'apps/backend/.env'],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
    OrdersModule,
    PaymentsModule,
    ImportsModule,
    ReconciliationModule,
    MatchesModule,
    ExportsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
