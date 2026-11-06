import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { ListPaymentsDto } from './dto/list-payments.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PaymentsController {
  constructor(private service: PaymentsService) {}
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentDto) {
    return this.service.create(user.orgId, dto);
  }
  @Get()
  list(@CurrentUser() user: any, @Query() q: ListPaymentsDto) {
    return this.service.list(user.orgId, q);
  }
  @Get(':id')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.get(user.orgId, id);
  }
}
