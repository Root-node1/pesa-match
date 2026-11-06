import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [ImportsController], providers: [ImportsService], exports: [ImportsService] })
export class ImportsModule {}
