import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ExportsService } from './exports.service.js';

@Controller('exports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ExportsController {
  constructor(private service: ExportsService) {}
  @Get('reconciliation')
  async reconciliation(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.service.reconciliationCsv(user.orgId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="reconciliation.csv"');
    res.send(csv);
  }
  @Get('exceptions')
  async exceptions(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.service.exceptionsCsv(user.orgId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="exceptions.csv"');
    res.send(csv);
  }
}
