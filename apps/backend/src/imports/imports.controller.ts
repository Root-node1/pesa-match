import { Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ImportsService } from './imports.service.js';

@Controller('imports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ImportsController {
  constructor(private service: ImportsService) {}

  @Post('orders')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  importOrders(@CurrentUser() user: any, @UploadedFile() file: any) {
    return this.service.importOrders(user.orgId, user.sub, file);
  }

  @Post('payments')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  importPayments(@CurrentUser() user: any, @UploadedFile() file: any) {
    return this.service.importPayments(user.orgId, user.sub, file);
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.listBatches(user.orgId);
  }

  @Get(':id')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getBatch(user.orgId, id);
  }
}
