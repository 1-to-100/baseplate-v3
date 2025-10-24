import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseCRUD } from '@/common/utils/supabase-crud.util';
import type { Team, CreateTeamInput, UpdateTeamInput } from '@/common/types/database.types';

@Injectable()
export class TeamsService {
  constructor(private readonly database: SupabaseCRUD) {}

  /**
   * Get all teams, optionally filtered by customer
   */
  async findAll(customerId?: string): Promise<Team[]> {
    const where = customerId ? { customer_id: customerId } : {};

    const teams = await this.database.findMany('teams', {
      where,
      include: {
        customer: {
          select: 'customer_id, name, email_domain',
        },
        manager: {
          select: 'user_id, full_name, email, avatar_url',
        },
      },
      orderBy: {
        field: 'team_name',
        direction: 'asc',
      },
    });

    return teams;
  }

  /**
   * Get a specific team by ID
   */
  async findOne(id: string): Promise<Team> {
    const team = await this.database.findUnique('teams', {
      where: { team_id: id },
      include: {
        customer: {
          select: 'customer_id, name, email_domain',
        },
        manager: {
          select: 'user_id, full_name, email, avatar_url',
        },
        teamMembers: true,
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return team;
  }

  /**
   * Create a new team
   */
  async create(data: CreateTeamInput): Promise<Team> {
    // Validate customer exists
    await this.validateCustomer(data.customer_id);

    // If manager_id provided, validate they're a user in the same customer
    if (data.manager_id) {
      await this.validateManager(data.manager_id, data.customer_id);
    }

    // Check for duplicate team name within customer
    const existingTeam = await this.database.findFirst('teams', {
      where: {
        customer_id: data.customer_id,
        team_name: data.team_name,
      },
    });

    if (existingTeam) {
      throw new ConflictException(
        `Team with name "${data.team_name}" already exists for this customer`
      );
    }

    const team = await this.database.create('teams', {
      data,
    });

    return team;
  }

  /**
   * Update a team
   */
  async update(id: string, data: UpdateTeamInput): Promise<Team> {
    const existingTeam = await this.database.findUnique('teams', {
      where: { team_id: id },
    });

    if (!existingTeam) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    // If updating manager_id, validate they're a user in the same customer
    if (data.manager_id) {
      await this.validateManager(data.manager_id, existingTeam.customer_id);
    }

    // If updating team_name, check for duplicates
    if (data.team_name && data.team_name !== existingTeam.team_name) {
      const duplicateTeam = await this.database.findFirst('teams', {
        where: {
          customer_id: existingTeam.customer_id,
          team_name: data.team_name,
        },
      });

      if (duplicateTeam) {
        throw new ConflictException(
          `Team with name "${data.team_name}" already exists for this customer`
        );
      }
    }

    const team = await this.database.update('teams', {
      where: { team_id: id },
      data,
    });

    return team;
  }

  /**
   * Delete a team
   */
  async remove(id: string): Promise<void> {
    const team = await this.database.findUnique('teams', {
      where: { team_id: id },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    await this.database.delete('teams', {
      where: { team_id: id },
    });
  }

  /**
   * Get the primary team for a customer
   */
  async getPrimaryTeam(customerId: string): Promise<Team | null> {
    const team = await this.database.findFirst('teams', {
      where: {
        customer_id: customerId,
        is_primary: true,
      },
    });

    return team;
  }

  /**
   * Set a team as primary (and unset others)
   */
  async setPrimaryTeam(teamId: string): Promise<Team> {
    const team = await this.database.findUnique('teams', {
      where: { team_id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Unset other primary teams for this customer
    await this.database.updateMany('teams', {
      where: {
        customer_id: team.customer_id,
        is_primary: true,
      },
      data: {
        is_primary: false,
      },
    });

    // Set this team as primary
    return this.database.update('teams', {
      where: { team_id: teamId },
      data: { is_primary: true },
    });
  }

  /**
   * Validate that customer exists
   */
  private async validateCustomer(customerId: string): Promise<void> {
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }
  }

  /**
   * Validate that manager is a user in the customer
   */
  private async validateManager(managerId: string, customerId: string): Promise<void> {
    const user = await this.database.findUnique('users', {
      where: { user_id: managerId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${managerId} not found`);
    }

    if (user.customer_id !== customerId) {
      throw new ConflictException(
        'Team manager must be a user within the same customer organization'
      );
    }
  }
}

