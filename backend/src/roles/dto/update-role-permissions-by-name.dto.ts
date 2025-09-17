import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsByNameDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  permissionNames: string[];
}
