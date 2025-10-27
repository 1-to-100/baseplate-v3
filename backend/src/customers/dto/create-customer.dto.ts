import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Customer name', required: true })
  @MaxLength(255)
  name: string;

  @IsString()
  @ApiProperty({ description: 'Subscription ID', required: true })
  subscriptionId: string;

  @IsString()
  @ApiProperty({ description: 'Customer Manager ID', required: false })
  customerSuccessId?: string;

  @IsString()
  @ApiProperty({ description: 'Owner User ID', required: true })
  ownerId: string;
}
