import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class ListPaymentsDto {
  @IsOptional() @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsString() reconciliationStatus?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
}
