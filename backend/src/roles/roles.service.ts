/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { isSystemRole } from '@/common/constants/system-roles';
import { CreateRoleDto } from '@/roles/dto/create-role.dto';
import { OutputTaxonomyDto } from '@/taxonomies/dto/output-taxonomy.dto';
import { UpdateRoleDto } from '@/roles/dto/update-role.dto';
import { UpdateRolePermissionsByNameDto } from '@/roles/dto/update-role-permissions-by-name.dto';

// Type definitions for role entity and permissions
export interface Role {
  id: number;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  label: string | null;
  description: string | null;
}

export interface RolePermissionWithDetails {
  permission_id: number;
  permissions: Permission | Permission[];
}

export interface RoleWithPermissions extends Role {
  permissions: Array<{
    permission: Permission | Permission[];
  }>;
}

export interface RoleWithDetails extends Role {
  permissions: Array<{
    permission: Permission | Permission[];
  }>;
  _count: {
    users: number;
  };
}

@Injectable()
export class RolesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createRoleDto: CreateRoleDto) {
    // Check if role name already exists
    const { data: existingRole } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('id')
      .eq('name', createRoleDto.name)
      .single();

    if (existingRole) {
      throw new ConflictException('Role with name already exists');
    }

    // Create the role
    const { data: newRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .insert(createRoleDto)
      .select()
      .single();

    if (error || !newRole) {
      throw new BadRequestException(
        `Failed to create role: ${error?.message || 'Unknown error'}`,
      );
    }

    return newRole;
  }

  async findAll(search?: string): Promise<RoleWithDetails[]> {
    // Build query
    let query = this.supabaseService
      .getClient()
      .from('roles')
      .select('*')
      .order('id', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: roles, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch roles: ${error.message}`);
    }

    // For each role, get permissions and user count
    const rolesWithDetails = await Promise.all(
      (roles || []).map(async (role: Role) => {
        // Get role permissions with permission details
        const { data: rolePermissions } = await this.supabaseService
          .getClient()
          .from('role_permissions')
          .select(
            `
            permission_id,
            permissions (
              id,
              name,
              label,
              description
            )
          `,
          )
          .eq('role_id', role.id);

        // Count users with this role
        const { count: userCount } = await this.supabaseService
          .getClient()
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id);

        return {
          ...role,
          permissions: (rolePermissions || []).map(
            (rp: RolePermissionWithDetails) => ({
              permission: rp.permissions,
            }),
          ),
          _count: {
            users: userCount || 0,
          },
        };
      }),
    );

    return rolesWithDetails;
  }

  async getForTaxonomy(): Promise<OutputTaxonomyDto[]> {
    const { data: roles, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch roles for taxonomy: ${error.message}`,
      );
    }

    return (roles || []).map((role) => ({
      id: role.id,
      name: role.name ?? null,
    }));
  }

  async findOne(id: string): Promise<RoleWithPermissions> {
    const { data: role, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !role) {
      throw new NotFoundException('No role with given ID exists');
    }

    // Get role permissions with permission details
    const { data: rolePermissions } = await this.supabaseService
      .getClient()
      .from('role_permissions')
      .select(
        `
        permission_id,
        permissions (
          id,
          name,
          label,
          description
        )
      `,
      )
      .eq('role_id', id);

    return {
      ...(role as Role),
      permissions: (rolePermissions || []).map(
        (rp: RolePermissionWithDetails) => ({
          permission: rp.permissions,
        }),
      ),
    };
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    // First, get the role to check if it's a system role
    const { data: existingRole, error: roleError } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('name')
      .eq('id', id)
      .single();

    if (roleError || !existingRole) {
      throw new NotFoundException('Role not found');
    }

    // Protect system roles from modification
    if (existingRole.name && isSystemRole(existingRole.name)) {
      throw new ForbiddenException(
        `Cannot modify system role "${existingRole.name}". System roles are protected.`,
      );
    }

    const { data: updatedRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .update(updateRoleDto)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedRole) {
      throw new BadRequestException(
        `Failed to update role: ${error?.message || 'Unknown error'}`,
      );
    }

    return updatedRole;
  }

  // remove(id: string) {
  //   return `This action removes a #${id} role`;
  // }

  async updateRolePermissionsByName(
    roleId: string,
    dto: UpdateRolePermissionsByNameDto,
  ) {
    // Check if role exists and get its name
    const { data: role, error: roleError } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('name')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      throw new NotFoundException('Role not found');
    }

    // Protect system roles from permission modification
    if (role.name && isSystemRole(role.name)) {
      throw new ForbiddenException(
        `Cannot modify permissions for system role "${role.name}". System roles are protected.`,
      );
    }

    // Role existence already checked above

    // Get all permissions by name
    const { data: permissions, error: permError } = await this.supabaseService
      .getClient()
      .from('permissions')
      .select('id, name')
      .in('name', dto.permissionNames);

    if (permError) {
      throw new BadRequestException(
        `Failed to fetch permissions: ${permError.message}`,
      );
    }

    if (!permissions || permissions.length !== dto.permissionNames.length) {
      const foundNames = (permissions || []).map(
        (p: { name: string }) => p.name,
      );
      const missing = dto.permissionNames.filter(
        (name) => !foundNames.includes(name),
      );
      throw new BadRequestException(
        `Invalid permission names: ${missing.join(', ')}`,
      );
    }

    // Clear existing permissions
    const { error: deleteError } = await this.supabaseService
      .getClient()
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (deleteError) {
      throw new BadRequestException(
        `Failed to clear existing permissions: ${deleteError.message}`,
      );
    }

    // Add new permissions
    const rolePermissionData = permissions.map((p: { id: number }) => ({
      role_id: roleId,
      permission_id: p.id,
    }));

    const { error: insertError } = await this.supabaseService
      .getClient()
      .from('role_permissions')
      .insert(rolePermissionData);

    if (insertError) {
      throw new BadRequestException(
        `Failed to add new permissions: ${insertError.message}`,
      );
    }

    return {
      message: `Permissions updated for role ID ${roleId}`,
      count: permissions.length,
    };
  }
}
