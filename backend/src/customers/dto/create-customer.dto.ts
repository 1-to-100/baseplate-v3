import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Customer name', required: true })
  @MaxLength(255)
  name: string;

  @IsInt()
  @ApiProperty({ description: 'Subscription ID', required: true })
  subscriptionId: number;

  @IsInt()
  @ApiProperty({ description: 'Customer Manager ID', required: false })
  customerSuccessId?: number;

  @IsInt()
  @ApiProperty({ description: 'Owner User ID', required: true })
  ownerId: number;
}
