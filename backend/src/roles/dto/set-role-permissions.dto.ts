import { IsArray, IsString, IsUUID } from 'class-validator';

export class SetRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  permission_ids: string[];
}

