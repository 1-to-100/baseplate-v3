import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTeamDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  customer_id: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  manager_id?: string;

  @IsString()
  @IsNotEmpty()
  team_name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? false)
  is_primary?: boolean = false;
}
