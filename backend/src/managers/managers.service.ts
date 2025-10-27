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

  async getForTaxonomy(): Promise<OutputManagerDto[]> {
    // Get customer success role ID by name
    const { data: role } = await this.database
      .getClient()
      .from('roles')
      .select('role_id')
      .eq('name', SYSTEM_ROLES.CUSTOMER_SUCCESS)
      .single();

    if (!role) {
      throw new Error('Customer Success role not found');
    }

    const usersManagers = await this.database.findMany('users', {
      where: { role_id: role.role_id },
      select: 'user_id, email, full_name',
    });

    return usersManagers.map((manager) => ({
      id: manager.user_id,
      name: manager.full_name,
      email: manager.email,
    })) as OutputManagerDto[];
  }

  async findOne(id: string) {
    // Get customer success role ID by name
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
