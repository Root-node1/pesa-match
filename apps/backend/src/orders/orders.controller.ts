import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrdersController {
  constructor(private service: OrdersService) {}
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.service.create(user.orgId, dto);
  }
  @Get()
  list(@CurrentUser() user: any, @Query() q: ListOrdersDto) {
    return this.service.list(user.orgId, q);
  }
  @Get(':id')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.get(user.orgId, id);
  }
}
