import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { AddPermissionToRoleDto } from './dto/add-permission-to-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';

@Controller('role-permissions')
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  /**
   * GET /role-permissions/role/:roleId
   * Get all permissions for a role
   */
  @Get('role/:roleId')
  @Permissions('*') // System admin only
  async getPermissionsByRole(@Param('roleId') roleId: string) {
    return this.rolePermissionsService.getPermissionsByRole(roleId);
  }

  /**
   * GET /role-permissions/permission/:permissionId
   * Get all roles that have a specific permission
   */
  @Get('permission/:permissionId')
  @Permissions('*') // System admin only
  async getRolesByPermission(@Param('permissionId') permissionId: string) {
    return this.rolePermissionsService.getRolesByPermission(permissionId);
  }

  /**
   * GET /role-permissions/check
   * Check if a role has a specific permission
   */
  @Get('check')
  @Permissions('*') // System admin only
  async checkPermission(
    @Query('roleId') roleId: string,
    @Query('permissionId') permissionId: string,
  ) {
    const hasPermission = await this.rolePermissionsService.hasPermission(
      roleId,
      permissionId,
    );
    return { hasPermission };
  }

  /**
   * POST /role-permissions
   * Add a permission to a role
   */
  @Post()
  @Permissions('*') // System admin only
  async addPermissionToRole(@Body() addPermissionDto: AddPermissionToRoleDto) {
    return this.rolePermissionsService.addPermissionToRole(addPermissionDto);
  }

  /**
   * PUT /role-permissions/role/:roleId
   * Set permissions for a role (replaces all existing)
   */
  @Put('role/:roleId')
  @Permissions('*') // System admin only
  async setRolePermissions(
    @Param('roleId') roleId: string,
    @Body() setPermissionsDto: SetRolePermissionsDto,
  ) {
    return this.rolePermissionsService.setRolePermissions(
      roleId,
      setPermissionsDto.permission_ids,
    );
  }

  /**
   * DELETE /role-permissions
   * Remove a permission from a role
   */
  @Delete()
  @Permissions('*') // System admin only
  async removePermissionFromRole(
    @Query('roleId') roleId: string,
    @Query('permissionId') permissionId: string,
  ) {
    await this.rolePermissionsService.removePermissionFromRole(
      roleId,
      permissionId,
    );
    return { message: 'Permission removed from role successfully' };
  }
}
