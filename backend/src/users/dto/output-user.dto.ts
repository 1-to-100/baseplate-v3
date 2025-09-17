import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { UserStatusList } from '@/common/constants/status';

export class OutputUserDto {
  @ApiProperty({ description: 'Email address' })
  id: number;

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
  customerId: number | null = null;

  @ApiPropertyOptional({
    description: 'Customer associated with the user',
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Customer ID' },
      name: { type: 'string', description: 'Customer name' },
    },
  })
  customer?: {
    id: number;
    name: string;
  };

  @ApiProperty({ description: 'The role of the user' })
  @IsOptional()
  roleId: number | null = null;

  @ApiPropertyOptional({ description: 'Manager ID' })
  @IsOptional()
  managerId: number | null = null;

  @ApiPropertyOptional({
    description: 'Status (optional). Default: inactive',
    enum: UserStatusList,
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Is Superadmin' })
  @IsOptional()
  isSuperadmin?: boolean | null;

  @ApiPropertyOptional({ description: 'Is Customer Success' })
  @IsOptional()
  isCustomerSuccess?: boolean | null;

  @ApiPropertyOptional({ description: 'List of permissions' })
  @IsOptional()
  permissions?: string[];
}
