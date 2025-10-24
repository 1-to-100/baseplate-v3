import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @IsUUID()
  @IsOptional()
  manager_id?: string;

  @IsString()
  @IsOptional()
  team_name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}

