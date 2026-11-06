import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ReconciliationController } from './reconciliation.controller.js';
import { ReconciliationService } from './reconciliation.service.js';

@Module({ imports: [DatabaseModule, AuthModule, NotificationsModule], controllers: [ReconciliationController], providers: [ReconciliationService], exports: [ReconciliationService] })
export class ReconciliationModule {}
