import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
} from 'class-validator';

export class InviteMultipleUsersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  @ApiProperty({ description: 'Email addresses' })
  emails: string[];

  @ApiProperty({ description: 'ID of the Customer these users belong to' })
  @IsOptional()
  @IsInt()
  customerId: number;

  @ApiProperty({
    description: 'The role that should be assigned to these users',
  })
  @IsOptional()
  @IsInt()
  roleId: number;

  @ApiPropertyOptional({
    description: 'Manager ID that should be assigned to these users',
  })
  @IsOptional()
  @IsInt()
  managerId: number;
}
