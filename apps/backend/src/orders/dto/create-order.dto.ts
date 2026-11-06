import { IsOptional, IsString, IsInt, Min, MaxLength, IsDateString, IsIn } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsOptional()
  @IsString()
  @IsIn(['KES'])
  currency?: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;
}
