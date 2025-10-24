import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { PaginatedInputDto } from '@/common/dto/paginated-input.dto';
import {
  UserOrderByFields,
  UserOrderByFieldsType,
  UserStatusList,
  UserStatusType,
} from '@/common/constants/status';
import {
  eachUserStatusTransformer,
  eachStringTransformer,
  toBoolean,
} from '@/common/helpers/class-transform-helpers';

export class ListUsersInputDto extends PaginatedInputDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(eachStringTransformer)
  @ApiPropertyOptional({ description: 'Role IDs', type: [String] })
  roleId?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(eachStringTransformer)
  @ApiPropertyOptional({ description: 'Customer IDs', type: [String] })
  customerId?: string[];

  @IsOptional()
  // @IsArray()
  @Type(() => String) // First transform to string array
  @Transform(eachUserStatusTransformer) // Finally transform to StatusType[]
  @IsEnum(UserStatusList, { each: true }) // Then validate each value against StatusList
  @ApiPropertyOptional({
    description: 'Statuses',
    enum: UserStatusList,
    isArray: true,
  })
  status?: UserStatusType[];

  @ApiPropertyOptional({
    description: 'Order by column',
    isArray: false,
    example: 'id',
    enum: Object.values(UserOrderByFields),
  })
  @IsString()
  @IsOptional()
  declare orderBy?: UserOrderByFieldsType;

  @ApiPropertyOptional({
    description: 'Filter by users who have customers',
  })
  @Type(() => String)
  @IsOptional()
  @Transform(toBoolean)
  hasCustomer?: boolean;
}
