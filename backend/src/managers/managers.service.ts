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
      where: { name: createManagerDto.name },
    });

    if (existingManager) {
      throw new ConflictException('Manager with the same name already exists');
    }

    return this.database.create('managers', {
      data: createManagerDto,
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
      .select('id')
      .eq('name', SYSTEM_ROLES.CUSTOMER_SUCCESS)
      .single();
    
    if (!role) {
      throw new Error('Customer Success role not found');
    }

    const usersManagers = await this.database.findMany('users', {
      where: { role_id: role.id },
      select: 'id, email, first_name, last_name',
    });

    return usersManagers.map((manager) => ({
      id: manager.id,
      name: `${manager.first_name ?? ''} ${manager.last_name ?? ''}`.trim(),
      email: manager.email,
    })) as OutputManagerDto[];
  }

  async findOne(id: string) {
    // Get customer success role ID by name
    const { data: role } = await this.database
      .getClient()
      .from('roles')
      .select('id')
      .eq('name', SYSTEM_ROLES.CUSTOMER_SUCCESS)
      .single();
    
    if (!role) {
      throw new Error('Customer Success role not found');
    }

    const manager = await this.database.findFirst('users', {
      where: { id, role_id: role.id },
    });
    if (!manager) {
      throw new NotFoundException('No manager with given ID exists');
    }
    return manager;
  }

  update(id: string, updateManagerDto: UpdateManagerDto) {
    return this.database.update('managers', {
      where: { id },
      data: updateManagerDto,
    });
  }

  async remove(id: string) {
    try {
      return await this.database.delete('managers', { where: { id } });
    } catch (error) {
      this.logger.error(error);
      throw new ConflictException('Manager can not be deleted');
    }
  }
}
