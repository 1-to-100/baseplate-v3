/**
 * Teams API Client
 * CRUD operations for teams and team members using Supabase client
 */

import { createClient } from '@/lib/supabase/client';
import { supabaseDB } from '@/lib/supabase/database';
import { isSystemAdministrator, isManager, SYSTEM_ROLES } from '@/lib/user-utils';
import type { ApiUser, Status } from '@/contexts/auth/types';
import type {
  Team,
  TeamWithRelations,
  TeamMember,
  TeamMemberWithRelations,
  CreateTeamInput,
  UpdateTeamInput,
  CreateTeamMemberInput,
  ApiResponse,
} from '@/types/database';

// ============================================================================
// Teams API
// ============================================================================

// Helper function to check if a user has Manager role by user_id
async function isUserManagerRole(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('users')
    .select('role:roles(name)')
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;

  const role = Array.isArray(data.role) ? data.role[0] : data.role;
  return role?.name === SYSTEM_ROLES.MANAGER;
}

interface TeamData {
  team_id: string;
  customer_id: string;
  manager_id: string | null;
  team_name: string;
  description: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string | null;
}

interface CustomerData {
  customer_id: string;
  name: string;
  email_domain?: string | null;
}

interface ManagerData {
  user_id: string;
  full_name: string;
  email: string;
}

interface TeamWithRelationsData extends TeamData {
  customer?: CustomerData | CustomerData[] | null;
  manager?: ManagerData | ManagerData[] | null;
  team_members?: TeamMemberData[];
}

interface TeamMemberData {
  team_member_id: string;
  team_id: string;
  user_id: string;
  created_at: string;
  updated_at: string | null;
}

interface UserData {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role?:
    | { role_id: string; name: string; display_name: string | null }
    | { role_id: string; name: string; display_name: string | null }[]
    | null;
}

interface TeamMemberWithRelationsData extends TeamMemberData {
  team?: TeamData | TeamData[] | null;
  user?: UserData | UserData[] | null;
  role?:
    | { role_id: string; name: string; display_name: string | null }
    | { role_id: string; name: string; display_name: string | null }[]
    | null;
}

export interface GetTeamsParams {
  page?: number;
  perPage?: number;
}

export interface GetTeamsResponse {
  data: TeamWithRelations[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    perPage: number;
    currentPage: number;
    prev: number | null;
    next: number | null;
  };
}

export async function getTeams(
  customerId?: string,
  params: GetTeamsParams = {}
): Promise<ApiResponse<GetTeamsResponse>> {
  try {
    const supabase = createClient();

    // Get current user (will be impersonated user if impersonating)
    const dbCurrentUser = await supabaseDB.getCurrentUser();

    // Convert to ApiUser format for role checking
    const currentUser: ApiUser = {
      id: dbCurrentUser.user_id,
      uid: dbCurrentUser.auth_user_id,
      email: dbCurrentUser.email,
      name: dbCurrentUser.full_name || '',
      firstName: dbCurrentUser.full_name?.split(' ')[0] || '',
      lastName: dbCurrentUser.full_name?.split(' ').slice(1).join(' ') || '',
      customerId: dbCurrentUser.customer_id || undefined,
      roleId: dbCurrentUser.role_id || undefined,
      managerId: dbCurrentUser.manager_id || undefined,
      status: dbCurrentUser.status as Status,
      role: dbCurrentUser.role
        ? {
            id: dbCurrentUser.role.role_id,
            name: dbCurrentUser.role.name,
            displayName: dbCurrentUser.role.display_name || '',
          }
        : undefined,
    } as ApiUser;

    // Check if user is system admin or manager
    const isSystemAdmin = isSystemAdministrator(currentUser);
    const isUserManager = isManager(currentUser);

    // Determine which customer ID to use for filtering
    let targetCustomerId: string | undefined = customerId;

    if (!isSystemAdmin) {
      // Non-system admins must filter by customer
      // If customerId is not provided, use the current user's customerId
      if (!targetCustomerId) {
        targetCustomerId = currentUser.customerId;
      }

      // If still no customerId, return error
      if (!targetCustomerId) {
        return {
          data: null,
          error: 'Customer ID is required for non-system administrators',
          status: 400,
        };
      }

      // Non-system admins can only access teams from their own customer
      if (targetCustomerId !== currentUser.customerId) {
        return {
          data: null,
          error: 'You can only access teams from your own customer',
          status: 403,
        };
      }
    }
    // System admins can access all teams if customerId is undefined, or specific customer if provided

    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('teams')
      .select(
        `
        team_id,
        customer_id,
        manager_id,
        team_name,
        description,
        is_primary,
        created_at,
        updated_at,
        customer:customers!teams_customer_id_fkey(customer_id, name),
        manager:users!teams_manager_id_fkey(user_id, full_name, email),
        team_members:team_members(team_member_id, team_id, user_id, created_at, updated_at)
      `,
        { count: 'exact' }
      )
      .order('team_name');

    // Apply customer filter only if targetCustomerId is provided
    // System admins can pass undefined to get all teams
    if (targetCustomerId) {
      query = query.eq('customer_id', targetCustomerId);
    }

    // For Managers, filter to only show teams where they are assigned as manager
    if (isUserManager && !isSystemAdmin) {
      query = query.eq('manager_id', currentUser.id);
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    const teams: TeamWithRelations[] = (data || []).map((team) => {
      const teamData = team as TeamWithRelationsData;
      const customer = Array.isArray(teamData.customer) ? teamData.customer[0] : teamData.customer;
      const manager = Array.isArray(teamData.manager) ? teamData.manager[0] : teamData.manager;
      const teamMembers = Array.isArray(teamData.team_members)
        ? teamData.team_members
        : teamData.team_members
          ? [teamData.team_members]
          : [];

      return {
        team_id: teamData.team_id,
        customer_id: teamData.customer_id,
        manager_id: teamData.manager_id,
        team_name: teamData.team_name,
        description: teamData.description,
        is_primary: teamData.is_primary,
        created_at: teamData.created_at,
        updated_at: teamData.updated_at,
        customer: customer
          ? {
              customer_id: customer.customer_id,
              name: customer.name,
            }
          : undefined,
        manager: manager
          ? {
              user_id: manager.user_id,
              full_name: manager.full_name,
              email: manager.email,
            }
          : undefined,
        team_members: teamMembers || [],
      };
    });

    const total = count || 0;
    const lastPage = Math.ceil(total / perPage);

    const response: GetTeamsResponse = {
      data: teams,
      meta: {
        total,
        page,
        lastPage,
        perPage,
        currentPage: page,
        prev: page > 1 ? page - 1 : null,
        next: page < lastPage ? page + 1 : null,
      },
    };

    return { data: response, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch teams';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function getTeamById(teamId: string): Promise<ApiResponse<TeamWithRelations>> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('teams')
      .select(
        `
        team_id,
        customer_id,
        manager_id,
        team_name,
        description,
        is_primary,
        created_at,
        updated_at,
        customer:customers!teams_customer_id_fkey(customer_id, name),
        manager:users!teams_manager_id_fkey(user_id, full_name, email),
        team_members:team_members(
          team_member_id,
          team_id,
          user_id,
          created_at,
          updated_at,
          user:users!team_members_user_id_fkey(user_id, full_name, email, avatar_url)
        )
      `
      )
      .eq('team_id', teamId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: 'Team not found', status: 404 };
      }
      return { data: null, error: error.message, status: 500 };
    }

    if (!data) {
      return { data: null, error: 'Team not found', status: 404 };
    }

    const teamData = data as TeamWithRelationsData;
    const customer = Array.isArray(teamData.customer) ? teamData.customer[0] : teamData.customer;
    const manager = Array.isArray(teamData.manager) ? teamData.manager[0] : teamData.manager;

    const teamWithRelations: TeamWithRelations = {
      team_id: teamData.team_id,
      customer_id: teamData.customer_id,
      manager_id: teamData.manager_id,
      team_name: teamData.team_name,
      description: teamData.description,
      is_primary: teamData.is_primary,
      created_at: teamData.created_at,
      updated_at: teamData.updated_at,
      customer: customer
        ? {
            customer_id: customer.customer_id,
            name: customer.name,
          }
        : undefined,
      manager: manager
        ? {
            user_id: manager.user_id,
            full_name: manager.full_name,
            email: manager.email,
          }
        : undefined,
      team_members: teamData.team_members || [],
    };

    return { data: teamWithRelations, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function createTeam(input: CreateTeamInput): Promise<ApiResponse<Team>> {
  try {
    const supabase = createClient();

    // Validate required fields
    if (!input.customer_id || !input.team_name) {
      return { data: null, error: 'customer_id and team_name are required', status: 400 };
    }

    // Check unique constraint (customer_id, team_name)
    const { data: existingTeam, error: checkError } = await supabase
      .from('teams')
      .select('team_id')
      .eq('customer_id', input.customer_id)
      .eq('team_name', input.team_name)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      return { data: null, error: checkError.message, status: 500 };
    }

    if (existingTeam) {
      return {
        data: null,
        error: 'A team with this name already exists for this customer',
        status: 409,
      };
    }

    // Insert new team
    const { data, error } = await supabase
      .from('teams')
      .insert({
        customer_id: input.customer_id,
        manager_id: input.manager_id || null,
        team_name: input.team_name,
        description: input.description || null,
        is_primary: input.is_primary ?? false,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    const team: Team = {
      team_id: data.team_id,
      customer_id: data.customer_id,
      manager_id: data.manager_id,
      team_name: data.team_name,
      description: data.description,
      is_primary: data.is_primary,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // If manager is assigned and has Manager role, add them as a team member
    if (data.manager_id) {
      const managerIsManagerRole = await isUserManagerRole(supabase, data.manager_id);
      if (managerIsManagerRole) {
        // Check if manager is already a team member
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('team_member_id')
          .eq('team_id', data.team_id)
          .eq('user_id', data.manager_id)
          .maybeSingle();

        // Only add if not already a member
        if (!existingMember) {
          await supabase.from('team_members').insert({
            team_id: data.team_id,
            user_id: data.manager_id,
          });
        }
      }
    }

    return { data: team, error: null, status: 201 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create team';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput
): Promise<ApiResponse<Team>> {
  try {
    const supabase = createClient();

    // If team_name is being updated, check unique constraint
    if (input.team_name !== undefined) {
      // Get current team to check customer_id
      const { data: currentTeam, error: fetchError } = await supabase
        .from('teams')
        .select('customer_id, team_name')
        .eq('team_id', teamId)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError.message, status: 500 };
      }

      if (!currentTeam) {
        return { data: null, error: 'Team not found', status: 404 };
      }

      // Check if another team with same name exists for this customer
      if (input.team_name !== currentTeam.team_name) {
        const { data: existingTeam, error: checkError } = await supabase
          .from('teams')
          .select('team_id')
          .eq('customer_id', currentTeam.customer_id)
          .eq('team_name', input.team_name)
          .neq('team_id', teamId)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          return { data: null, error: checkError.message, status: 500 };
        }

        if (existingTeam) {
          return {
            data: null,
            error: 'A team with this name already exists for this customer',
            status: 409,
          };
        }
      }
    }

    // Get current team to check manager_id before update
    const { data: currentTeamData } = await supabase
      .from('teams')
      .select('manager_id')
      .eq('team_id', teamId)
      .single();

    const oldManagerId = currentTeamData?.manager_id || null;

    // Build update object (only include defined fields)
    const updateData: Partial<TeamData> = {};
    if (input.customer_id !== undefined) updateData.customer_id = input.customer_id;
    if (input.manager_id !== undefined) updateData.manager_id = input.manager_id;
    if (input.team_name !== undefined) updateData.team_name = input.team_name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.is_primary !== undefined) updateData.is_primary = input.is_primary;

    // Update team
    const { data, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('team_id', teamId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: 'Team not found', status: 404 };
      }
      return { data: null, error: error.message, status: 500 };
    }

    if (!data) {
      return { data: null, error: 'Team not found', status: 404 };
    }

    const team: Team = {
      team_id: data.team_id,
      customer_id: data.customer_id,
      manager_id: data.manager_id,
      team_name: data.team_name,
      description: data.description,
      is_primary: data.is_primary,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // Handle manager changes for Manager role users
    if (input.manager_id !== undefined) {
      const newManagerId = input.manager_id || null;

      // If old manager was a Manager role, remove them from team_members
      if (oldManagerId && oldManagerId !== newManagerId) {
        const oldManagerIsManagerRole = await isUserManagerRole(supabase, oldManagerId);
        if (oldManagerIsManagerRole) {
          // Find and remove team member entry for old manager
          const { data: oldManagerMember } = await supabase
            .from('team_members')
            .select('team_member_id')
            .eq('team_id', teamId)
            .eq('user_id', oldManagerId)
            .maybeSingle();

          if (oldManagerMember) {
            await supabase
              .from('team_members')
              .delete()
              .eq('team_member_id', oldManagerMember.team_member_id);
          }
        }
      }

      // If new manager is assigned and has Manager role, add them as a team member
      if (newManagerId) {
        const newManagerIsManagerRole = await isUserManagerRole(supabase, newManagerId);
        if (newManagerIsManagerRole) {
          // Check if new manager is already a team member
          const { data: existingMember } = await supabase
            .from('team_members')
            .select('team_member_id')
            .eq('team_id', teamId)
            .eq('user_id', newManagerId)
            .maybeSingle();

          // Only add if not already a member
          if (!existingMember) {
            await supabase.from('team_members').insert({
              team_id: teamId,
              user_id: newManagerId,
            });
          }
        }
      }
    }

    return { data: team, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update team';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function deleteTeam(teamId: string): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient();

    // First, delete all team members (bulk delete by team_id)
    const { error: membersError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId);

    if (membersError) {
      return {
        data: null,
        error: `Failed to remove team members: ${membersError.message}`,
        status: 500,
      };
    }

    // Then delete the team
    const { error } = await supabase.from('teams').delete().eq('team_id', teamId);

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    return { data: null, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete team';
    return { data: null, error: errorMessage, status: 500 };
  }
}

// ============================================================================
// Team Members API
// ============================================================================

export interface GetTeamMembersParams {
  page?: number;
  perPage?: number;
}

export interface GetTeamMembersResponse {
  data: TeamMemberWithRelations[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    perPage: number;
    currentPage: number;
    prev: number | null;
    next: number | null;
  };
}

export async function getTeamMembers(
  teamId: string,
  params: GetTeamMembersParams = {}
): Promise<ApiResponse<GetTeamMembersResponse>> {
  try {
    const supabase = createClient();

    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await supabase
      .from('team_members')
      .select(
        `
        team_member_id,
        team_id,
        user_id,
        created_at,
        updated_at,
        team:teams!team_members_team_id_fkey(
          team_id,
          customer_id,
          manager_id,
          team_name,
          description,
          is_primary,
          created_at,
          updated_at
        ),
        user:users!team_members_user_id_fkey(
          user_id, 
          full_name, 
          email, 
          avatar_url,
          status,
          role:roles(role_id, name, display_name)
        )
      `,
        { count: 'exact' }
      )
      .eq('team_id', teamId)
      .order('created_at')
      .range(from, to);

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    const members: TeamMemberWithRelations[] = (data || []).map((member) => {
      const memberData = member as unknown as TeamMemberWithRelationsData;
      const user = Array.isArray(memberData.user) ? memberData.user[0] : memberData.user;
      const team = Array.isArray(memberData.team) ? memberData.team[0] : memberData.team;

      return {
        team_member_id: memberData.team_member_id,
        team_id: memberData.team_id,
        user_id: memberData.user_id,
        created_at: memberData.created_at,
        updated_at: memberData.updated_at,
        team: team || undefined,
        user,
      };
    });

    const total = count || 0;
    const lastPage = Math.ceil(total / perPage);

    const response: GetTeamMembersResponse = {
      data: members,
      meta: {
        total,
        page,
        lastPage,
        perPage,
        currentPage: page,
        prev: page > 1 ? page - 1 : null,
        next: page < lastPage ? page + 1 : null,
      },
    };

    return { data: response, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team members';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function addTeamMember(
  input: CreateTeamMemberInput
): Promise<ApiResponse<TeamMember>> {
  try {
    const supabase = createClient();

    // Validate required fields
    if (!input.team_id || !input.user_id) {
      return { data: null, error: 'team_id and user_id are required', status: 400 };
    }

    // Check unique constraint (team_id, user_id)
    const { data: existingMember, error: checkError } = await supabase
      .from('team_members')
      .select('team_member_id')
      .eq('team_id', input.team_id)
      .eq('user_id', input.user_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      return { data: null, error: checkError.message, status: 500 };
    }

    if (existingMember) {
      return { data: null, error: 'User is already a member of this team', status: 409 };
    }

    // Insert new team member
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: input.team_id,
        user_id: input.user_id,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    const member: TeamMember = {
      team_member_id: data.team_member_id,
      team_id: data.team_id,
      user_id: data.user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { data: member, error: null, status: 201 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add team member';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function removeTeamMember(teamMemberId: string): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient();

    // Get team member info before deletion to check if it's a Manager
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id, user_id')
      .eq('team_member_id', teamMemberId)
      .single();

    if (!teamMember) {
      return { data: null, error: 'Team member not found', status: 404 };
    }

    // Check if the user being removed is a Manager and is the manager of the team
    const { data: teamData } = await supabase
      .from('teams')
      .select('manager_id')
      .eq('team_id', teamMember.team_id)
      .single();

    const isTeamManager = teamData?.manager_id === teamMember.user_id;
    const isManagerRole = await isUserManagerRole(supabase, teamMember.user_id);

    // If the removed member is a Manager and is the team's manager, remove them as manager too
    if (isManagerRole && isTeamManager) {
      await supabase.from('teams').update({ manager_id: null }).eq('team_id', teamMember.team_id);
    }

    // Remove team member
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_member_id', teamMemberId);

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    return { data: null, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove team member';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function getAvailableUsersForTeam(
  customerId: string,
  teamId?: string
): Promise<ApiResponse<ApiUser[]>> {
  try {
    const supabase = createClient();

    // Get role IDs for standard_user and manager
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('role_id, name')
      .in('name', [SYSTEM_ROLES.STANDARD_USER, SYSTEM_ROLES.MANAGER]);

    if (rolesError) {
      return { data: null, error: `Failed to fetch roles: ${rolesError.message}`, status: 500 };
    }

    if (!roles || roles.length === 0) {
      return { data: [], error: null, status: 200 };
    }

    const roleIds = roles.map((r: { role_id: string; name: string }) => r.role_id);

    // Get all users for the customer with standard_user or manager roles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(
        `
        user_id,
        auth_user_id,
        email,
        full_name,
        phone_number,
        avatar_url,
        customer_id,
        role_id,
        manager_id,
        status,
        created_at,
        updated_at,
        deleted_at,
        customer:customers!users_customer_id_fkey(customer_id, name, email_domain),
        role:roles(role_id, name, display_name)
      `
      )
      .eq('customer_id', customerId)
      .in('role_id', roleIds)
      .is('deleted_at', null);

    if (usersError) {
      return { data: null, error: `Failed to fetch users: ${usersError.message}`, status: 500 };
    }

    // If teamId is provided, get users who are already members of this specific team
    // Users can be in multiple teams, so we only exclude users already in THIS team
    let currentTeamMemberUserIds = new Set<string>();
    if (teamId) {
      const { data: currentTeamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);

      if (membersError) {
        return {
          data: null,
          error: `Failed to fetch team members: ${membersError.message}`,
          status: 500,
        };
      }

      currentTeamMemberUserIds = new Set(
        (currentTeamMembers || []).map((tm: { user_id: string }) => tm.user_id)
      );
    }

    // Filter out only users who are already members of the current team (if teamId provided)
    // This allows users to be in multiple teams
    interface UserWithRelations {
      user_id: string;
      auth_user_id: string;
      email: string;
      full_name: string | null;
      phone_number: string | null;
      avatar_url: string | null;
      customer_id: string;
      role_id: string;
      manager_id: string | null;
      status: string;
      created_at: string;
      updated_at: string | null;
      deleted_at: string | null;
      customer?: CustomerData | CustomerData[] | null;
      role?:
        | { role_id: string; name: string; display_name: string | null }
        | { role_id: string; name: string; display_name: string | null }[]
        | null;
    }

    const availableUsers = (users || []).filter((user: UserWithRelations) => {
      // If teamId is provided, exclude only users already in that specific team
      // Otherwise, include all users (they can be added to any team)
      return !teamId || !currentTeamMemberUserIds.has(user.user_id);
    });

    // Convert to ApiUser format
    const apiUsers: ApiUser[] = availableUsers.map((user: UserWithRelations) => {
      const customer = Array.isArray(user.customer) ? user.customer[0] : user.customer;
      const role = Array.isArray(user.role) ? user.role[0] : user.role;

      return {
        id: user.user_id,
        uid: user.auth_user_id,
        email: user.email,
        name: user.full_name || '',
        firstName: user.full_name?.split(' ')[0] || '',
        lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
        customerId: user.customer_id || undefined,
        roleId: user.role_id || undefined,
        managerId: user.manager_id || undefined,
        status: user.status as 'active' | 'inactive' | 'pending' | 'suspended',
        role: role
          ? {
              id: role.role_id,
              name: role.name,
              displayName: role.display_name || '',
            }
          : undefined,
        customer: customer
          ? {
              id: customer.customer_id,
              name: customer.name,
              emailDomain: customer.email_domain || undefined,
            }
          : undefined,
      } as ApiUser;
    });

    return { data: apiUsers, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get available users';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function getUserTeams(userId: string): Promise<ApiResponse<TeamWithRelations[]>> {
  try {
    const supabase = createClient();

    // Query teams where user is a member via team_members join
    const { data, error } = await supabase
      .from('team_members')
      .select(
        `
        team_id,
        teams!team_members_team_id_fkey(
          team_id,
          customer_id,
          manager_id,
          team_name,
          description,
          is_primary,
          created_at,
          updated_at,
          customer:customers!teams_customer_id_fkey(customer_id, name),
          manager:users!teams_manager_id_fkey(user_id, full_name, email),
          team_members:team_members(
            team_member_id,
            team_id,
            user_id,
            created_at,
            updated_at
          )
        )
      `
      )
      .eq('user_id', userId);

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    interface TeamMemberWithTeamData {
      team_id: string;
      teams?: TeamWithRelationsData | TeamWithRelationsData[] | null;
    }

    // Extract teams from the nested structure
    const teams: TeamWithRelations[] = (data || [])
      .map((member: TeamMemberWithTeamData) => {
        const team = Array.isArray(member.teams) ? member.teams[0] : member.teams;
        if (!team) return null;

        const customer = Array.isArray(team.customer) ? team.customer[0] : team.customer;
        const manager = Array.isArray(team.manager) ? team.manager[0] : team.manager;

        return {
          team_id: team.team_id,
          customer_id: team.customer_id,
          manager_id: team.manager_id ?? null,
          team_name: team.team_name,
          description: team.description,
          is_primary: team.is_primary,
          created_at: team.created_at,
          updated_at: team.updated_at,
          customer: customer
            ? {
                customer_id: customer.customer_id,
                name: customer.name,
              }
            : undefined,
          manager: manager
            ? {
                user_id: manager.user_id,
                full_name: manager.full_name,
                email: manager.email,
              }
            : undefined,
          team_members: team.team_members || [],
        } as TeamWithRelations;
      })
      .filter((team): team is TeamWithRelations => team !== null);

    return { data: teams, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user teams';
    return { data: null, error: errorMessage, status: 500 };
  }
}
