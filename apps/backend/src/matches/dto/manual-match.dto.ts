import { IsString, IsInt, Min } from 'class-validator';

export class ManualMatchDto {
  @IsString() orderId!: string;
  @IsString() paymentId!: string;
  @IsInt() @Min(1) amountMinor!: number;
  @IsString() reason!: string;
}
