import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserStatusList, UserStatusType } from '@/common/constants/status';
import { CreateCustomerDto } from '@/customers/dto/create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsEnum(UserStatusList, {
    message: `Status must be one of the following: ${Object.values(UserStatusList).join(', ')}`,
  })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Status (optional). Default: inactive',
    enum: UserStatusList,
    isArray: false,
  })
  status?: UserStatusType;
}
