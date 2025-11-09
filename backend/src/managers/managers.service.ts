import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { SYSTEM_ROLES } from '@/common/constants/system-roles';
import { CreateManagerDto } from '@/managers/dto/create-manager.dto';
import { OutputManagerDto } from '@/managers/dto/output-manager.dto';
import { UpdateManagerDto } from '@/managers/dto/update-manager.dto';

@Injectable()
export class ManagersService {
  constructor(private readonly database: DatabaseService) {}

  private readonly logger = new Logger(ManagersService.name);

  async create(createManagerDto: CreateManagerDto) {
    const existingManager = await this.database.findFirst('managers', {
      where: { email: createManagerDto.email },
    });

    if (existingManager) {
      throw new ConflictException('Manager with the same email already exists');
    }

    return this.database.create('managers', {
      data: {
        email: createManagerDto.email,
        full_name: createManagerDto.name,
        active: true,
      },
    });
  }

  findAll() {
    return this.database.findMany('managers');
  }

  async getForTaxonomy(customerId?: string): Promise<OutputManagerDto[]> {
    // Get customer success role ID by name
    const { data: role } = await this.database
      .getClient()
      .from('roles')
      .select('role_id')
      .eq('name', SYSTEM_ROLES.CUSTOMER_SUCCESS)
      .single();

    if (!role) {
      throw new NotFoundException('Customer Success role not found');
    }

    if (!customerId) {
      // If no customer ID provided, return all customer success managers
      const allCSManagers = await this.database.findMany('users', {
        where: {
          deleted_at: null,
          role_id: role.role_id,
        },
        select: 'user_id, email, full_name',
      });

      return allCSManagers.map((manager) => ({
        id: manager.user_id,
        name: manager.full_name || manager.email,
        email: manager.email,
      })) as OutputManagerDto[];
    }

    // If customer ID is provided, get managers by customer_id OR customer_success_owned_customers relation
    const where: any = {
      deleted_at: null,
      role_id: role.role_id,
      OR: [{ customer_id: null }, { customer_id: customerId }],
    };

    const usersManagers = await this.database.findMany('users', {
      where,
      select: 'user_id, email, full_name',
    });

    // Also get managers from customer_success_owned_customers relations
    const csOwnedCustomers = await this.database.findMany(
      'customer_success_owned_customers',
      {
        where: {
          customer_id: customerId,
        },
        select: 'user_id',
      },
    );

    // Get user details for CS owned customers
    const csOwnedManagerIds = csOwnedCustomers.map((rel: any) => rel.user_id);

    let csOwnedManagers: any[] = [];
    if (csOwnedManagerIds.length > 0) {
      csOwnedManagers = await this.database.findMany('users', {
        where: {
          user_id: { in: csOwnedManagerIds },
          deleted_at: null,
          role_id: role.role_id,
        },
        select: 'user_id, email, full_name',
      });
    }

    // Combine and deduplicate managers
    const allManagers = [...usersManagers, ...csOwnedManagers];
    const uniqueManagers = allManagers.filter(
      (manager, index, self) =>
        index === self.findIndex((m) => m.user_id === manager.user_id),
    );

    return uniqueManagers.map((manager) => ({
      id: manager.user_id,
      name: manager.full_name || manager.email,
      email: manager.email,
    })) as OutputManagerDto[];
  }

  async findOne(id: string) {
    const { data: role } = await this.database
      .getClient()
      .from('roles')
      .select('role_id')
      .eq('name', SYSTEM_ROLES.CUSTOMER_SUCCESS)
      .single();

    if (!role) {
      throw new Error('Customer Success role not found');
    }

    const manager = await this.database.findFirst('users', {
      where: { user_id: id, role_id: role.role_id },
    });
    if (!manager) {
      throw new NotFoundException('No manager with given ID exists');
    }
    return manager;
  }

  update(id: string, updateManagerDto: UpdateManagerDto) {
    return this.database.update('managers', {
      where: { manager_id: id },
      data: {
        email: updateManagerDto.email,
        full_name: updateManagerDto.name,
      },
    });
  }

  async remove(id: string) {
    try {
      return await this.database.delete('managers', {
        where: { manager_id: id },
      });
    } catch (error) {
      this.logger.error(error);
      throw new ConflictException('Manager can not be deleted');
    }
  }
}
