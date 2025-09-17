import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { RequiredSuperUser } from '@/common/decorators/superuser.decorator';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { RequireSuperuserGuard } from '@/auth/guards/require-superuser/require-superuser.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { RolesService } from '@/roles/roles.service';
import { CreateRoleDto } from '@/roles/dto/create-role.dto';
import { ListRolesDto } from '@/roles/dto/list-roles.dto';
import { OutputRoleDto } from '@/roles/dto/output-role.dto';
import { UpdateRoleDto } from '@/roles/dto/update-role.dto';
import { UpdateRolePermissionsByNameDto } from '@/roles/dto/update-role-permissions-by-name.dto';

@Controller('roles')
@UseGuards(
  DynamicAuthGuard,
  ImpersonationGuard,
  RequireSuperuserGuard,
  PermissionGuard,
)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequiredSuperUser('superAdmin')
  @Permissions('RoleManagement:createRoles')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @RequiredSuperUser('superAdmin')
  @Permissions('RoleManagement:viewRoles')
  findAll(@Query() listRolesDto: ListRolesDto) {
    return this.rolesService.findAll(listRolesDto.search);
  }

  @Get(':id')
  @RequiredSuperUser('superAdmin')
  @Permissions('RoleManagement:viewRoles')
  async findOne(@Param('id') id: string): Promise<OutputRoleDto> {
    const role = await this.rolesService.findOne(+id);
    const outputRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      imageUrl: role.imageUlrl,
      permissions: {},
    };

    const rolePermissions = role.permissions;

    outputRole.permissions = rolePermissions.reduce<
      Record<string, Array<{ id: number; name: string; label: string }>>
    >((acc, permission) => {
      const prefix = permission.permission.name.split(':')[0];

      acc[prefix] ??= [];

      acc[prefix].push({
        id: permission.permissionId,
        name: permission.permission.name,
        label: permission.permission.label,
      });

      return acc;
    }, {});

    return outputRole;
  }

  @Patch(':id')
  @RequiredSuperUser('superAdmin')
  @Permissions('RoleManagement:editRoles')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(+id, updateRoleDto);
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
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsByNameDto,
  ) {
    return this.rolesService.updateRolePermissionsByName(id, dto);
  }
}
