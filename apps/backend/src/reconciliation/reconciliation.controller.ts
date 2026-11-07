import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReconciliationService } from './reconciliation.service.js';

@Controller('reconciliation')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReconciliationController {
  constructor(private service: ReconciliationService) {}
  @Post('run')
  @UseGuards(RolesGuard)
  @Roles('OWNER' as any, 'ADMIN' as any, 'FINANCE' as any)
  run(@CurrentUser() user: any, @Body() body?: { periodStart?: string; periodEnd?: string }) {
    return this.service.run(user.orgId, user.sub, body?.periodStart, body?.periodEnd);
  }
  @Post('runs')
  @UseGuards(RolesGuard)
  @Roles('OWNER' as any, 'ADMIN' as any, 'FINANCE' as any)
  createRun(@CurrentUser() user: any, @Body() body: { periodStart: string; periodEnd: string }) {
    return this.service.run(user.orgId, user.sub, body.periodStart, body.periodEnd);
  }
  @Get('runs')
  runs(@CurrentUser() user: any) { return this.service.listRuns(user.orgId); }
  @Get('runs/:id')
  getRun(@CurrentUser() user: any, @Param("id") id: string) { return this.service.getRun(user.orgId, id); }
  @Post('runs/:id/complete')
  @UseGuards(RolesGuard)
  @Roles('OWNER' as any, 'ADMIN' as any, 'FINANCE' as any)
  complete(@CurrentUser() user: any, @Param('id') id: string) { return this.service.completeRun(user.orgId, id, user.sub); }
  @Post('runs/:id/reopen')
  @UseGuards(RolesGuard)
  @Roles('OWNER' as any, 'ADMIN' as any)
  reopen(@CurrentUser() user: any, @Param('id') id: string) {
    const role = user.roles?.[0];
    return this.service.reopenRun(user.orgId, id, user.sub, role);
  }
  @Get('summary')
  summary(@CurrentUser() user: any) { return this.service.summary(user.orgId); }
  @Get('exceptions')
  exceptions(@CurrentUser() user: any) {
    return this.service.exceptions(user.orgId);
  }
  @Get('exception-records')
  exceptionRecords(@CurrentUser() user: any, @Query('status') status?: string, @Query('type') type?: string, @Query('runId') runId?: string) {
    return this.service.listExceptions(user.orgId, { status, type, runId });
  }
  @Post('exceptions/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles('OWNER' as any, 'ADMIN' as any, 'FINANCE' as any)
  resolveException(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { resolution: string; reason: string }) {
    return this.service.resolveException(user.orgId, id, user.sub, body.resolution, body.reason);
  }
  @Get('matches')
  matches(@CurrentUser() user: any, @Query('status') status?: string) { return this.service.matches(user.orgId, status); }
}
