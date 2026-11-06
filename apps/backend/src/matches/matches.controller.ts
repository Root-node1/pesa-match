import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MatchesService } from './matches.service.js';
import { ManualMatchDto } from './dto/manual-match.dto.js';

@Controller('matches')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MatchesController {
  constructor(private service: MatchesService) {}

  @Post(':id/approve')
  approve(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.approve(user.orgId, id, user.sub, body?.reason);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.reject(user.orgId, id, user.sub, body?.reason);
  }

  @Post('manual')
  manual(@CurrentUser() user: any, @Body() dto: ManualMatchDto) {
    return this.service.manual(user.orgId, user.sub, dto);
  }

  @Post(':id/reverse')
  @UseGuards(RolesGuard)
  @Roles('OWNER' as any, 'ADMIN' as any)
  reverse(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { reason: string }) {
    const role = user.roles?.[0];
    return this.service.reverse(user.orgId, id, user.sub, body?.reason, role);
  }

  @Get(':id/history')
  history(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.history(user.orgId, id);
  }
}
