import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { UserStatusList } from '@/common/constants/status';

export class OutputUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'First Name' })
  firstName: string | null = null;

  @ApiProperty({ description: 'Last Name' })
  lastName: string | null = null;

  @ApiPropertyOptional({ description: 'Phone Number' })
  phoneNumber?: string | null = null;

  @ApiProperty({ description: 'ID of the Customer this user belongs to' })
  @IsOptional()
  customerId: string | null = null;

  @ApiPropertyOptional({
    description: 'Customer associated with the user',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Customer ID' },
      name: { type: 'string', description: 'Customer name' },
    },
  })
  customer?: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'The role of the user' })
  @IsOptional()
  roleId: string | null = null;

  @ApiPropertyOptional({ description: 'Manager ID' })
  @IsOptional()
  managerId: string | null = null;

  @ApiPropertyOptional({
    description: 'Status (optional). Default: inactive',
    enum: UserStatusList,
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'User role information' })
  @IsOptional()
  role?: {
    id: string;
    name: string;
    description: string | null;
    systemRole: boolean;
  };

  @ApiPropertyOptional({ description: 'List of permissions' })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Date when user was deleted' })
  @IsOptional()
  deletedAt?: string | null;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  @IsOptional()
  avatar?: string | null;

  @ApiPropertyOptional({
    description: 'User unique identifier from auth system',
  })
  @IsOptional()
  uid?: string | null;

  @ApiPropertyOptional({ description: 'Email verification status' })
  @IsOptional()
  emailVerified?: boolean | null;

  @ApiPropertyOptional({ description: 'Creation date' })
  @IsOptional()
  createdAt?: string | null;

  @ApiPropertyOptional({ description: 'Last update date' })
  @IsOptional()
  updatedAt?: string | null;
}
