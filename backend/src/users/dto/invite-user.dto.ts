import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'ID of the Customer this user belongs to' })
  @IsOptional()
  @IsInt()
  customerId: number;

  @ApiProperty({ description: 'The role of the user' })
  @IsOptional()
  @IsInt()
  roleId: number;

  @ApiPropertyOptional({ description: 'Manager ID' })
  @IsOptional()
  @IsInt()
  managerId?: number;
}
