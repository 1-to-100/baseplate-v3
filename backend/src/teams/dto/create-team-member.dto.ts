import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateTeamMemberDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  team_id: string;

  @IsString()
  @IsUUID()
  @IsNotEmpty()
  user_id: string;
}

