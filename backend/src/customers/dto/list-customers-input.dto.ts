import { IsArray, IsEnum, IsInt, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedInputDto } from '@/common/dto/paginated-input.dto';
import {
  eachNumberTransformer,
  eachUserStatusTransformer,
} from '@/common/helpers/class-transform-helpers';
import { UserStatusList } from '@/common/constants/status';

export class ListCustomersInputDto extends PaginatedInputDto {
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Customer IDs' })
  @Transform(eachNumberTransformer)
  id?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Subscription ID' })
  @Transform(eachNumberTransformer)
  subscriptionId?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Manager IDs' })
  @Transform(eachNumberTransformer)
  managerId?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Manager IDs' })
  @Transform(eachNumberTransformer)
  customerSuccessId?: number[];

  @IsArray()
  @IsEnum(UserStatusList, { each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Statuses',
    enum: UserStatusList,
    isArray: true,
  })
  @Transform(eachUserStatusTransformer)
  status?: string[];
}
