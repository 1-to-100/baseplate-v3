import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { RequiredSuperUser } from '@/common/decorators/superuser.decorator';
import { SystemRoles } from '@/common/decorators/system-roles.decorator';
import { SYSTEM_ROLES } from '@/common/constants/system-roles';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { RequireSuperuserGuard } from '@/auth/guards/require-superuser/require-superuser.guard';
import { SystemRoleGuard } from '@/auth/guards/system-role/system-role.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { RolesService } from '@/roles/roles.service';
import { CreateRoleDto } from '@/roles/dto/create-role.dto';
import { ListRolesDto } from '@/roles/dto/list-roles.dto';
import { OutputRoleDto } from '@/roles/dto/output-role.dto';
import { UpdateRoleDto } from '@/roles/dto/update-role.dto';
import { UpdateRolePermissionsByNameDto } from '@/roles/dto/update-role-permissions-by-name.dto';
import type { RoleWithDetails } from '@/roles/roles.service';

@Controller('roles')
@UseGuards(
  DynamicAuthGuard,
  ImpersonationGuard,
  RequireSuperuserGuard,
  SystemRoleGuard,
  PermissionGuard,
)
@SystemRoles(SYSTEM_ROLES.SYSTEM_ADMINISTRATOR)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequiredSuperUser('superAdmin')
  @Permissions('RoleManagement:createRoles')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @RequiredSuperUser('superAdmin')
  @Permissions('RoleManagement:viewRoles')
  findAll(@Query() listRolesDto: ListRolesDto): Promise<RoleWithDetails[]> {
    return this.rolesService.findAll(listRolesDto.search);
  }

  @Get(':id')
  @RequiredSuperUser('superAdmin')
  @Permissions('RoleManagement:viewRoles')
  async findOne(@Param('id') id: string): Promise<OutputRoleDto> {
    const role = await this.rolesService.findOne(id);
    const outputRole: OutputRoleDto = {
      id: role.role_id.toString(),
      name: role.name ?? null,
      display_name: role.display_name ?? null,
      description: role.description ?? null,
      permissions: {},
    };

    const rolePermissions = role.permissions;

    // If permissions is a simple array of strings (JSONB), convert to expected format
    if (
      Array.isArray(rolePermissions) &&
      typeof rolePermissions[0] === 'string'
    ) {
      outputRole.permissions = rolePermissions.reduce<
        Record<string, Array<{ id: string; name: string; label: string }>>
      >((acc, permName: string) => {
        const prefix = permName.split(':')[0];
        acc[prefix] ??= [];
        acc[prefix].push({
          id: permName,
          name: permName,
          label: permName,
        });
        return acc;
      }, {});
    } else if (Array.isArray(rolePermissions)) {
      // Handle old format if it exists
      outputRole.permissions = rolePermissions.reduce<
        Record<string, Array<{ id: string; name: string; label: string }>>
      >(
        (
          acc: Record<
            string,
            Array<{ id: string; name: string; label: string }>
          >,
          permission: {
            permission:
              | {
                  id?: string;
                  name: string;
                  label?: string;
                  display_name?: string;
                }
              | Array<{
                  id?: string;
                  name: string;
                  label?: string;
                  display_name?: string;
                }>;
          },
        ) => {
          // Handle both single permission object and array (Supabase type inference)
          const perm = Array.isArray(permission.permission)
            ? permission.permission[0]
            : permission.permission;

          if (!perm) return acc;

          const prefix = perm.name.split(':')[0];

          acc[prefix] ??= [];

          acc[prefix].push({
            id: perm.id?.toString() || perm.name,
            name: perm.name,
            label: perm.label ?? perm.display_name ?? '',
          });

          return acc;
        },
        {},
      );
    }

    return outputRole;
  }

  @Patch(':id')
  @RequiredSuperUser('superAdmin')
  @Permissions('RoleManagement:editRoles')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  //
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.rolesService.remove(+id);
  // }

  @Post(':id/permissions')
  @RequiredSuperUser('superAdmin')
  @Permissions('RoleManagement:editRoles')
  updatePermissionsByName(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsByNameDto,
  ) {
    return this.rolesService.updateRolePermissionsByName(id, dto);
  }
}
