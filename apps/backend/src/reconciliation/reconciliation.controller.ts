import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReconciliationService } from './reconciliation.service.js';

@Controller('reconciliation')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReconciliationController {
  constructor(private service: ReconciliationService) {}
  @Post('run')
  run(@CurrentUser() user: any) {
    return this.service.run(user.orgId, user.sub);
  }
  @Get('summary')
  summary(@CurrentUser() user: any) {
    return this.service.summary(user.orgId);
  }
  @Get('exceptions')
  exceptions(@CurrentUser() user: any) {
    return this.service.exceptions(user.orgId);
  }
  @Get('matches')
  matches(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.service.matches(user.orgId, status);
  }
}
