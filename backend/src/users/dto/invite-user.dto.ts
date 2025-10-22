import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'ID of the Customer this user belongs to' })
  @IsOptional()
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'The role of the user' })
  @IsOptional()
  @IsString()
  roleId: string;

  @ApiPropertyOptional({ description: 'Manager ID' })
  @IsOptional()
  @IsString()
  managerId?: string;
}
