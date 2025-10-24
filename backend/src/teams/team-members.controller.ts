import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeamMembersService } from './team-members.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth/jwt-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';

@Controller('team-members')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  /**
   * GET /team-members/team/:teamId
   * Get all members of a team
   */
  @Get('team/:teamId')
  @Permissions('customer:read')
  async findByTeam(@Param('teamId') teamId: string) {
    return this.teamMembersService.findByTeam(teamId);
  }

  /**
   * GET /team-members/user/:userId
   * Get all teams a user belongs to
   */
  @Get('user/:userId')
  @Permissions('customer:read')
  async findByUser(@Param('userId') userId: string) {
    return this.teamMembersService.findByUser(userId);
  }

  /**
   * GET /team-members/check
   * Check if a user is a member of a team
   */
  @Get('check')
  @Permissions('customer:read')
  async checkMembership(
    @Query('teamId') teamId: string,
    @Query('userId') userId: string,
  ) {
    const isMember = await this.teamMembersService.isMember(teamId, userId);
    return { isMember };
  }

  /**
   * POST /team-members
   * Add a user to a team
   */
  @Post()
  @Permissions('customer:write')
  async create(@Body() createTeamMemberDto: CreateTeamMemberDto) {
    return this.teamMembersService.create(createTeamMemberDto);
  }

  /**
   * DELETE /team-members/:id
   * Remove a user from a team by team_member_id
   */
  @Delete(':id')
  @Permissions('customer:write')
  async remove(@Param('id') id: string) {
    await this.teamMembersService.remove(id);
    return { message: 'Team member removed successfully' };
  }

  /**
   * DELETE /team-members
   * Remove a user from a team by teamId and userId (query params)
   */
  @Delete()
  @Permissions('customer:write')
  async removeByTeamAndUser(
    @Query('teamId') teamId: string,
    @Query('userId') userId: string,
  ) {
    await this.teamMembersService.removeByTeamAndUser(teamId, userId);
    return { message: 'Team member removed successfully' };
  }
}

