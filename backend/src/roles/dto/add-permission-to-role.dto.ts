import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class AddPermissionToRoleDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  role_id: string;

  @IsString()
  @IsUUID()
  @IsNotEmpty()
  permission_id: string;
}

