/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import {
  CUSTOM_ROLE_MIN_ID,
  isSystemRoleId,
} from '@/common/constants/system-roles';
import { CreateRoleDto } from '@/roles/dto/create-role.dto';
import { OutputTaxonomyDto } from '@/taxonomies/dto/output-taxonomy.dto';
import { UpdateRoleDto } from '@/roles/dto/update-role.dto';
import { UpdateRolePermissionsByNameDto } from '@/roles/dto/update-role-permissions-by-name.dto';

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

  async findAll(search?: string) {
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
      (roles || []).map(async (role) => {
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
            (rp: { permissions: any }) => ({
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

  async findOne(id: number) {
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
      ...role,
      permissions: (rolePermissions || []).map((rp: { permissions: any }) => ({
        permission: rp.permissions,
      })),
    };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    // Protect system roles from modification
    if (isSystemRoleId(id)) {
      throw new ForbiddenException(
        `Cannot modify system role (ID: ${id}). System roles (IDs 1-3) are protected.`,
      );
    }

    // Ensure ID is >= 100 (custom roles only)
    if (id < CUSTOM_ROLE_MIN_ID) {
      throw new ForbiddenException(
        `Cannot modify role with ID < ${CUSTOM_ROLE_MIN_ID}. Only custom roles can be modified.`,
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

  // remove(id: number) {
  //   return `This action removes a #${id} role`;
  // }

  async updateRolePermissionsByName(
    roleId: number,
    dto: UpdateRolePermissionsByNameDto,
  ) {
    // Protect system roles from permission modification
    if (isSystemRoleId(roleId)) {
      throw new ForbiddenException(
        `Cannot modify permissions for system role (ID: ${roleId}). System roles (IDs 1-3) are protected.`,
      );
    }

    // Ensure ID is >= 100 (custom roles only)
    if (roleId < CUSTOM_ROLE_MIN_ID) {
      throw new ForbiddenException(
        `Cannot modify permissions for role with ID < ${CUSTOM_ROLE_MIN_ID}. Only custom roles can be modified.`,
      );
    }

    // Check if role exists
    const { data: role, error: roleError } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

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
