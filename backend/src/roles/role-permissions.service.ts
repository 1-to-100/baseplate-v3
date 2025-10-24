import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseCRUD } from '@/common/utils/supabase-crud.util';
import type { RolePermission, CreateRolePermissionInput } from '@/common/types/database.types';

@Injectable()
export class RolePermissionsService {
  constructor(private readonly database: SupabaseCRUD) {}

  /**
   * Get all permissions for a role
   */
  async getPermissionsByRole(roleId: string): Promise<RolePermission[]> {
    const rolePermissions = await this.database.findMany('role_permissions', {
      where: { role_id: roleId },
      include: {
        permission: {
          select: 'permission_id, name, display_name, description',
        },
      },
    });

    return rolePermissions;
  }

  /**
   * Get all roles that have a specific permission
   */
  async getRolesByPermission(permissionId: string): Promise<RolePermission[]> {
    const rolePermissions = await this.database.findMany('role_permissions', {
      where: { permission_id: permissionId },
      include: {
        role: {
          select: 'role_id, name, display_name, description',
        },
      },
    });

    return rolePermissions;
  }

  /**
   * Add a permission to a role
   */
  async addPermissionToRole(data: CreateRolePermissionInput): Promise<RolePermission> {
    // Validate role exists
    const role = await this.database.findUnique('roles', {
      where: { role_id: data.role_id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${data.role_id} not found`);
    }

    // Validate permission exists
    const permission = await this.database.findUnique('permissions', {
      where: { permission_id: data.permission_id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${data.permission_id} not found`);
    }

    // Check if already assigned
    const existing = await this.database.findFirst('role_permissions', {
      where: {
        role_id: data.role_id,
        permission_id: data.permission_id,
      },
    });

    if (existing) {
      throw new ConflictException('Permission is already assigned to this role');
    }

    const rolePermission = await this.database.create('role_permissions', {
      data,
    });

    return rolePermission;
  }

  /**
   * Remove a permission from a role
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const rolePermission = await this.database.findFirst('role_permissions', {
      where: {
        role_id: roleId,
        permission_id: permissionId,
      },
    });

    if (!rolePermission) {
      throw new NotFoundException('Permission is not assigned to this role');
    }

    await this.database.delete('role_permissions', {
      where: {
        role_id: roleId,
        permission_id: permissionId,
      },
    });
  }

  /**
   * Set permissions for a role (replaces all existing permissions)
   */
  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<RolePermission[]> {
    // Validate role exists
    const role = await this.database.findUnique('roles', {
      where: { role_id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Delete existing permissions
    await this.database.deleteMany('role_permissions', {
      where: { role_id: roleId },
    });

    // Add new permissions
    const rolePermissions: RolePermission[] = [];
    for (const permissionId of permissionIds) {
      const rolePermission = await this.addPermissionToRole({
        role_id: roleId,
        permission_id: permissionId,
      });
      rolePermissions.push(rolePermission);
    }

    return rolePermissions;
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(roleId: string, permissionId: string): Promise<boolean> {
    const rolePermission = await this.database.findFirst('role_permissions', {
      where: {
        role_id: roleId,
        permission_id: permissionId,
      },
    });

    return !!rolePermission;
  }

  /**
   * Sync role permissions from JSONB permissions array (for migration)
   * This helps migrate from the old JSONB array to the new junction table
   */
  async syncFromJsonb(roleId: string, permissionNames: string[]): Promise<void> {
    // Get all permissions by name
    const permissions = await this.database.findMany('permissions', {
      where: {
        name: { in: permissionNames },
      },
    });

    const permissionIds = permissions.map(p => p.permission_id);
    
    // Set permissions for the role
    await this.setRolePermissions(roleId, permissionIds);
  }
}

