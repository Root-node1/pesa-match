import { IsOptional, IsString, IsInt, Min, MaxLength, IsDateString, IsIn } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalTransactionReference?: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsOptional()
  @IsString()
  @IsIn(['KES'])
  currency?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  payerReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
