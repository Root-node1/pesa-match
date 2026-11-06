import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ReconciliationController } from './reconciliation.controller.js';
import { ReconciliationService } from './reconciliation.service.js';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [ReconciliationController], providers: [ReconciliationService], exports: [ReconciliationService] })
export class ReconciliationModule {}
