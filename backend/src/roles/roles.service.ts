import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateRoleDto } from '@/roles/dto/create-role.dto';
import { OutputTaxonomyDto } from '@/taxonomies/dto/output-taxonomy.dto';
import { UpdateRoleDto } from '@/roles/dto/update-role.dto';
import { UpdateRolePermissionsByNameDto } from '@/roles/dto/update-role-permissions-by-name.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    if (
      await this.prisma.role.findFirst({
        where: { name: createRoleDto.name },
      })
    ) {
      throw new ConflictException('Role with name already exists');
    }
    return this.prisma.role.create({ data: createRoleDto });
  }

  findAll(search?: string) {
    const where: Prisma.RoleWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.role.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });
  }

  getForTaxonomy(): Promise<OutputTaxonomyDto[]> {
    return this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findFirst({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    if (!role) {
      throw new NotFoundException(
        'No role with given ID exists for given customer',
      );
    }
    return role;
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return this.prisma.role.update({
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
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        name: {
          in: dto.permissionNames,
        },
      },
    });

    if (permissions.length !== dto.permissionNames.length) {
      const foundNames = permissions.map((p) => p.name);
      const missing = dto.permissionNames.filter(
        (name) => !foundNames.includes(name),
      );
      throw new BadRequestException(
        `Invalid permission names: ${missing.join(', ')}`,
      );
    }

    // clear existing permissions
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });

    // add new permissions
    await this.prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });

    return {
      message: `Permissions updated for role ID ${roleId}`,
      count: permissions.length,
    };
  }
}
