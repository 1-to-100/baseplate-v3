import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail(
    { blacklisted_chars: '\\/%^$#!~*()[]{}<>?|' },
    { message: 'Invalid email format' },
  )
  @IsNotEmpty()
  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'First Name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Last Name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ description: 'Phone Number' })
  @IsPhoneNumber('US')
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ description: 'ID of the Customer this user belongs to' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: 'The role of the user' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Manager ID' })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({
    description: 'Status (optional). Default: inactive',
    enum: ['inactive', 'active', 'suspended'],
  })
  @IsOptional()
  @IsIn(['inactive', 'active', 'suspended'])
  status?: string;
}
