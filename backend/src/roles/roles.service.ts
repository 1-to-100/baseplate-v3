import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { CreateRoleDto } from '@/roles/dto/create-role.dto';
import { OutputTaxonomyDto } from '@/taxonomies/dto/output-taxonomy.dto';
import { UpdateRoleDto } from '@/roles/dto/update-role.dto';
import { UpdateRolePermissionsByNameDto } from '@/roles/dto/update-role-permissions-by-name.dto';

@Injectable()
export class RolesService {
  constructor(private readonly database: DatabaseService) {}

  async create(createRoleDto: CreateRoleDto) {
    const existingRole = await this.database.findFirst('roles', {
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role with name already exists');
    }

    return this.database.create('roles', { data: createRoleDto });
  }

  async findAll(search?: string) {
    const where: any = search
      ? {
          or: [
            { name: { ilike: `%${search}%` } },
            { description: { ilike: `%${search}%` } },
          ],
        }
      : undefined;

    const options: any = {
      orderBy: [{ field: 'id', direction: 'desc' }],
    };

    if (where) {
      options.where = where;
    }

    const roles = await this.database.findMany('roles', options);

    // For each role, get permissions and user count
    const rolesWithDetails = await Promise.all(
      roles.map(async (role: any) => {
        // Get role permissions with permission details
        const rolePermissions = await this.database.findMany(
          'role_permissions',
          {
            where: { role_id: role.id },
            include: {
              permissions: true,
            },
          },
        );

        // Count users with this role
        const userCount = await this.database.count('users', {
          where: { role_id: role.id },
        });

        return {
          ...role,
          permissions: rolePermissions.map((rp: any) => ({
            permission: rp.permissions,
          })),
          _count: {
            users: userCount,
          },
        };
      }),
    );

    return rolesWithDetails;
  }

  async getForTaxonomy(): Promise<OutputTaxonomyDto[]> {
    const roles = await this.database.findMany('roles', {
      select: 'id, name',
      orderBy: [{ field: 'name', direction: 'asc' }],
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name ?? null,
    }));
  }

  async findOne(id: number) {
    const role = await this.database.findFirst('roles', {
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(
        'No role with given ID exists for given customer',
      );
    }

    // Get role permissions with permission details
    const rolePermissions = await this.database.findMany('role_permissions', {
      where: { role_id: id },
      include: {
        permissions: true,
      },
    });

    return {
      ...role,
      permissions: rolePermissions.map((rp: any) => ({
        permission: rp.permissions,
      })),
    };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    return this.database.update('roles', {
      where: { id },
      data: updateRoleDto,
    });
  }

  // remove(id: number) {
  //   return `This action removes a #${id} role`;
  // }

  async updateRolePermissionsByName(
    roleId: number,
    dto: UpdateRolePermissionsByNameDto,
  ) {
    const role = await this.database.findUnique('roles', {
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const permissions = await this.database.findMany('permissions', {
      where: {
        name: { in: dto.permissionNames },
      },
    });

    if (permissions.length !== dto.permissionNames.length) {
      const foundNames = permissions.map((p: any) => p.name);
      const missing = dto.permissionNames.filter(
        (name) => !foundNames.includes(name),
      );
      throw new BadRequestException(
        `Invalid permission names: ${missing.join(', ')}`,
      );
    }

    // Clear existing permissions
    await this.database.deleteMany('role_permissions', {
      where: { role_id: roleId },
    });

    // Add new permissions
    const rolePermissionData = permissions.map((p: any) => ({
      role_id: roleId,
      permission_id: p.id,
    }));

    for (const data of rolePermissionData) {
      await this.database.create('role_permissions', { data });
    }

    return {
      message: `Permissions updated for role ID ${roleId}`,
      count: permissions.length,
    };
  }
}
