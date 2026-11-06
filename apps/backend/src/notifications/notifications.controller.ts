import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}
  @Get('preferences')
  prefs(@CurrentUser() user: any) { return this.service.getPreferences(user.orgId); }
  @Patch('preferences')
  @UseGuards(RolesGuard)
  @Roles('OWNER' as any, 'ADMIN' as any)
  updatePrefs(@CurrentUser() user: any, @Body() body: { enabled: boolean; recipient?: string; consent?: boolean }) {
    return this.service.updatePreferences(user.orgId, body.enabled, body.recipient, body.consent);
  }
  @Get('sms')
  list(@CurrentUser() user: any) { return this.service.list(user.orgId); }
  @Get('sms/:id')
  get(@CurrentUser() user: any, @Param('id') id: string) { return this.service.get(user.orgId, id); }
  @Post('sms/:id/retry')
  retry(@CurrentUser() user: any, @Param('id') id: string) { return this.service.retry(user.orgId, id); }
  @Post('process')
  @UseGuards(RolesGuard)
  @Roles('OWNER' as any, 'ADMIN' as any)
  process() { return this.service.processPending(); }
}
