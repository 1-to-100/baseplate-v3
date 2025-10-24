import { IsString, IsUUID, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

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
  is_primary?: boolean;
}

