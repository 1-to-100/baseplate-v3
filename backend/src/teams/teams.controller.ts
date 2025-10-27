import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Controller('teams')
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * GET /teams
   * Get all teams, optionally filtered by customer
   */
  @Get()
  @Permissions('customer:read')
  async findAll(@Query('customerId') customerId?: string) {
    return this.teamsService.findAll(customerId);
  }

  /**
   * GET /teams/:id
   * Get a specific team by ID
   */
  @Get(':id')
  @Permissions('customer:read')
  async findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  /**
   * POST /teams
   * Create a new team
   */
  @Post()
  @Permissions('customer:write')
  async create(@Body() createTeamDto: CreateTeamDto) {
    // Ensure is_primary has a default value
    const teamData = {
      ...createTeamDto,
      is_primary: createTeamDto.is_primary ?? false,
    };
    return this.teamsService.create(teamData);
  }

  /**
   * PATCH /teams/:id
   * Update a team
   */
  @Patch(':id')
  @Permissions('customer:write')
  async update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(id, updateTeamDto);
  }

  /**
   * DELETE /teams/:id
   * Delete a team
   */
  @Delete(':id')
  @Permissions('customer:delete')
  async remove(@Param('id') id: string) {
    await this.teamsService.remove(id);
    return { message: 'Team deleted successfully' };
  }

  /**
   * POST /teams/:id/set-primary
   * Set a team as the primary team for its customer
   */
  @Post(':id/set-primary')
  @Permissions('customer:write')
  async setPrimaryTeam(@Param('id') id: string) {
    return this.teamsService.setPrimaryTeam(id);
  }
}
