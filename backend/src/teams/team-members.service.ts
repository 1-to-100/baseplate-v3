import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseCRUD } from '@/common/utils/supabase-crud.util';
import type { TeamMember, CreateTeamMemberInput } from '@/common/types/database.types';

@Injectable()
export class TeamMembersService {
  constructor(private readonly database: SupabaseCRUD) {}

  /**
   * Get all team members for a team
   */
  async findByTeam(teamId: string): Promise<TeamMember[]> {
    const members = await this.database.findMany('team_members', {
      where: { team_id: teamId },
      include: {
        user: {
          select: 'user_id, full_name, email, avatar_url, status',
        },
      },
    });

    return members;
  }

  /**
   * Get all teams for a user
   */
  async findByUser(userId: string): Promise<TeamMember[]> {
    const memberships = await this.database.findMany('team_members', {
      where: { user_id: userId },
      include: {
        team: {
          select: 'team_id, team_name, description, is_primary, customer_id',
        },
      },
    });

    return memberships;
  }

  /**
   * Add a user to a team
   */
  async create(data: CreateTeamMemberInput): Promise<TeamMember> {
    // Validate team exists
    const team = await this.database.findUnique('teams', {
      where: { team_id: data.team_id },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${data.team_id} not found`);
    }

    // Validate user exists and belongs to the same customer
    const user = await this.database.findUnique('users', {
      where: { user_id: data.user_id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${data.user_id} not found`);
    }

    if (user.customer_id !== team.customer_id) {
      throw new ConflictException(
        'User must belong to the same customer as the team'
      );
    }

    // Check if already a member
    const existingMember = await this.database.findFirst('team_members', {
      where: {
        team_id: data.team_id,
        user_id: data.user_id,
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this team');
    }

    const member = await this.database.create('team_members', {
      data,
    });

    return member;
  }

  /**
   * Remove a user from a team
   */
  async remove(id: string): Promise<void> {
    const member = await this.database.findUnique('team_members', {
      where: { team_member_id: id },
    });

    if (!member) {
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }

    await this.database.delete('team_members', {
      where: { team_member_id: id },
    });
  }

  /**
   * Remove a user from a team by team and user IDs
   */
  async removeByTeamAndUser(teamId: string, userId: string): Promise<void> {
    const member = await this.database.findFirst('team_members', {
      where: {
        team_id: teamId,
        user_id: userId,
      },
    });

    if (!member) {
      throw new NotFoundException('User is not a member of this team');
    }

    await this.database.delete('team_members', {
      where: { team_member_id: member.team_member_id },
    });
  }

  /**
   * Check if a user is a member of a team
   */
  async isMember(teamId: string, userId: string): Promise<boolean> {
    const member = await this.database.findFirst('team_members', {
      where: {
        team_id: teamId,
        user_id: userId,
      },
    });

    return !!member;
  }
}

