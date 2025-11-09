import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedInputDto } from '@/common/dto/paginated-input.dto';
import {
  eachStringTransformer,
  eachUserStatusTransformer,
} from '@/common/helpers/class-transform-helpers';
import { UserStatusList } from '@/common/constants/status';

export class ListCustomersInputDto extends PaginatedInputDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(eachStringTransformer)
  @ApiPropertyOptional({ description: 'Customer IDs' })
  id?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(eachStringTransformer)
  @ApiPropertyOptional({ description: 'Subscription ID' })
  subscriptionId?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(eachStringTransformer)
  @ApiPropertyOptional({ description: 'Manager IDs' })
  managerId?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(eachStringTransformer)
  @ApiPropertyOptional({ description: 'Manager IDs' })
  customerSuccessId?: string[];

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
