import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

export class InviteMultipleUsersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  @ApiProperty({ description: 'Email addresses' })
  emails: string[];

  @ApiProperty({ description: 'ID of the Customer these users belong to' })
  @IsOptional()
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'The role that should be assigned to these users',
  })
  @IsOptional()
  @IsString()
  roleId: string;

  @ApiPropertyOptional({
    description: 'Manager ID that should be assigned to these users',
  })
  @IsOptional()
  @IsString()
  managerId: string;
}
