import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateRoleDto } from '@/roles/dto/create-role.dto';
import { OutputTaxonomyDto } from '@/taxonomies/dto/output-taxonomy.dto';
import { UpdateRoleDto } from '@/roles/dto/update-role.dto';
import { UpdateRolePermissionsByNameDto } from '@/roles/dto/update-role-permissions-by-name.dto';

// Type definitions for role entity
export interface Role {
  role_id: string; // Changed from id
  name: string | null;
  display_name: string | null; // Added
  description: string | null;
  is_system_role: boolean; // Changed from system_role
  permissions: any; // JSONB array
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  permission_id: string; // Changed from id
  name: string;
  display_name: string; // Changed from label
  description: string | null;
}

export interface RoleWithDetails extends Role {
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
      .select('role_id')
      .eq('name', createRoleDto.name)
      .single();

    if (existingRole) {
      throw new ConflictException('Role with name already exists');
    }

    // Create the role with JSONB permissions
    const { data: newRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .insert({
        name: createRoleDto.name,
        display_name: createRoleDto.name, // Default display_name to name
        description: createRoleDto.description,
        is_system_role: false, // Custom roles are never system roles
        permissions: [], // Empty permissions array by default
      })
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
      .order('role_id', { ascending: false }); // Changed from id

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: roles, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch roles: ${error.message}`);
    }

    // For each role, get user count (no need to get permissions from junction table anymore)
    const rolesWithDetails = await Promise.all(
      (roles || []).map(async (role: Role) => {
        // Count users with this role
        const { count: userCount } = await this.supabaseService
          .getClient()
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.role_id); // Changed from role_id to role.role_id

        return {
          ...role,
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
      .select('role_id, name') // Changed from id
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch roles for taxonomy: ${error.message}`,
      );
    }

    return (roles || []).map((role) => ({
      id: role.role_id, // Changed from id
      name: role.name ?? null,
    }));
  }

  async findOne(id: string): Promise<Role> {
    const { data: role, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('*')
      .eq('role_id', id) // Changed from id
      .single();

    if (error || !role) {
      throw new NotFoundException('No role with given ID exists');
    }

    // Permissions are already in the role object as JSONB
    return role as Role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    // First, get the role to check if it's a system role
    const { data: existingRole, error: roleError } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('name, is_system_role') // Changed from system_role
      .eq('role_id', id) // Changed from id
      .single();

    if (roleError || !existingRole) {
      throw new NotFoundException('Role not found');
    }

    // Protect system roles from modification
    if (existingRole.is_system_role) {
      throw new ForbiddenException(
        `Cannot modify system role "${existingRole.name}". System roles are protected.`,
      );
    }

    const { data: updatedRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .update(updateRoleDto)
      .eq('role_id', id) // Changed from id
      .select()
      .single();

    if (error || !updatedRole) {
      throw new BadRequestException(
        `Failed to update role: ${error?.message || 'Unknown error'}`,
      );
    }

    return updatedRole;
  }

  /**
   * Update role permissions using permission names
   * Stores permissions as JSONB array in the role record
   */
  async updateRolePermissionsByName(
    roleId: string,
    dto: UpdateRolePermissionsByNameDto,
  ) {
    // Check if role exists and get its details
    const { data: role, error: roleError } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('name, is_system_role') // Changed from system_role
      .eq('role_id', roleId) // Changed from id
      .single();

    if (roleError || !role) {
      throw new NotFoundException('Role not found');
    }

    // Protect system roles from permission modification
    if (role.is_system_role) {
      throw new ForbiddenException(
        `Cannot modify permissions for system role "${role.name}". System roles are protected.`,
      );
    }

    // Validate that all permission names exist
    const { data: permissions, error: permError } = await this.supabaseService
      .getClient()
      .from('permissions')
      .select('permission_id, name') // Changed from id
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

    // Update the role's permissions JSONB field
    const { error: updateError } = await this.supabaseService
      .getClient()
      .from('roles')
      .update({
        permissions: dto.permissionNames, // Store as JSONB array
      })
      .eq('role_id', roleId); // Changed from id

    if (updateError) {
      throw new BadRequestException(
        `Failed to update permissions: ${updateError.message}`,
      );
    }

    return {
      message: `Permissions updated for role ID ${roleId}`,
      count: permissions.length,
    };
  }

  /**
   * Get permissions for a role
   * Returns the permissions array from the JSONB field
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    const { data: role, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('permissions')
      .eq('role_id', roleId) // Changed from id
      .single();

    if (error || !role) {
      throw new NotFoundException('Role not found');
    }

    // Return permissions array from JSONB field
    return Array.isArray(role.permissions) ? role.permissions : [];
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(
    roleId: string,
    permissionName: string,
  ): Promise<boolean> {
    const permissions = await this.getRolePermissions(roleId);

    // Check for wildcard or specific permission
    return permissions.includes('*') || permissions.includes(permissionName);
  }
}
