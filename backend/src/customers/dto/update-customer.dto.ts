import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateCustomerDto } from '@/customers/dto/create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Customer name', required: true })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Subscription ID', required: true })
  subscriptionId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Owner User ID', required: true })
  ownerId: string;
}
