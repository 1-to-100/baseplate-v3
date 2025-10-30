import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({
    description: 'Customer Success User IDs (array)',
    required: false,
    type: [String],
  })
  customerSuccessIds?: string[];

  @IsString()
  @ApiProperty({ description: 'Owner User ID', required: true })
  ownerId: string;
}
