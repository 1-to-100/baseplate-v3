/**
 * Teams API Client
 * CRUD operations for teams and team members using Supabase client
 */

import { createClient } from '@/lib/supabase/client';
import type { ApiUser } from '@/contexts/auth/types';
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
}

interface TeamMemberWithRelationsData extends TeamMemberData {
  team?: TeamData | TeamData[] | null;
  user?: UserData | UserData[] | null;
  role?: { role_id: string; name: string; display_name: string | null } | { role_id: string; name: string; display_name: string | null }[] | null;
}

export async function getTeams(customerId?: string): Promise<ApiResponse<TeamWithRelations[]>> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('teams')
      .select(`
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
      `)
      .order('team_name');
    
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { data: null, error: error.message, status: 500 };
    }
    
    const teams: TeamWithRelations[] = (data || []).map((team) => {
      const teamData = team as TeamWithRelationsData;
      const customer = Array.isArray(teamData.customer) ? teamData.customer[0] : teamData.customer;
      const manager = Array.isArray(teamData.manager) ? teamData.manager[0] : teamData.manager;
      const teamMembers = Array.isArray(teamData.team_members) ? teamData.team_members : (teamData.team_members ? [teamData.team_members] : []);
      
      return {
        team_id: teamData.team_id,
        customer_id: teamData.customer_id,
        manager_id: teamData.manager_id,
        team_name: teamData.team_name,
        description: teamData.description,
        is_primary: teamData.is_primary,
        created_at: teamData.created_at,
        updated_at: teamData.updated_at,
        customer: customer ? {
          customer_id: customer.customer_id,
          name: customer.name,
        } : undefined,
        manager: manager ? {
          user_id: manager.user_id,
          full_name: manager.full_name,
          email: manager.email,
        } : undefined,
        team_members: teamMembers || [],
      };
    });
    
    return { data: teams, error: null, status: 200 };
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
      .select(`
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
      `)
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
      customer: customer ? {
        customer_id: customer.customer_id,
        name: customer.name,
      } : undefined,
      manager: manager ? {
        user_id: manager.user_id,
        full_name: manager.full_name,
        email: manager.email,
      } : undefined,
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
      return { data: null, error: 'A team with this name already exists for this customer', status: 409 };
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
    
    return { data: team, error: null, status: 201 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create team';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function updateTeam(teamId: string, input: UpdateTeamInput): Promise<ApiResponse<Team>> {
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
          return { data: null, error: 'A team with this name already exists for this customer', status: 409 };
        }
      }
    }
    
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
    
    return { data: team, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update team';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function deleteTeam(teamId: string): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('team_id', teamId);
    
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

export async function getTeamMembers(teamId: string): Promise<ApiResponse<TeamMemberWithRelations[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('team_members')
      .select(`
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
          role:roles(role_id, name, display_name)
        )
      `)
      .eq('team_id', teamId)
      .order('created_at');
    
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
        user: user ? {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
          role: memberData.role ? (Array.isArray(memberData.role) ? memberData.role[0] : memberData.role) : undefined,
        } : undefined,
      };
    });
    
    return { data: members, error: null, status: 200 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team members';
    return { data: null, error: errorMessage, status: 500 };
  }
}

export async function addTeamMember(input: CreateTeamMemberInput): Promise<ApiResponse<TeamMember>> {
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

export async function getAvailableUsersForTeam(customerId: string, teamId?: string): Promise<ApiResponse<ApiUser[]>> {
  try {
    const supabase = createClient();
    
    // Get role IDs for standard_user and manager
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('role_id, name')
      .in('name', ['standard_user', 'manager']);
    
    if (rolesError) {
      return { data: null, error: `Failed to fetch roles: ${rolesError.message}`, status: 500 };
    }
    
    if (!roles || roles.length === 0) {
      return { data: [], error: null, status: 200 };
    }
    
    const roleIds = roles.map((r: { role_id: string; name: string }) => r.role_id);
    
    // Get all team IDs for the customer
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('team_id')
      .eq('customer_id', customerId);
    
    if (teamsError) {
      return { data: null, error: `Failed to fetch teams: ${teamsError.message}`, status: 500 };
    }
    
    const teamIds = (teams || []).map((t: { team_id: string }) => t.team_id);
    
    // If teamId is provided, exclude it from the list
    const teamIdsToCheck = teamId ? teamIds.filter((id: string) => id !== teamId) : teamIds;
    
    // Get all team members for teams in the customer (excluding current team if provided)
    let teamMembers: { user_id: string }[] = [];
    if (teamIdsToCheck.length > 0) {
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIdsToCheck);
      
      if (membersError) {
        return { data: null, error: `Failed to fetch team members: ${membersError.message}`, status: 500 };
      }
      
      teamMembers = membersData || [];
    }
    
    const teamMemberUserIds = new Set(teamMembers.map((tm) => tm.user_id));
    
    // Get all users for the customer with standard_user or manager roles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
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
      `)
      .eq('customer_id', customerId)
      .in('role_id', roleIds)
      .is('deleted_at', null);
    
    if (usersError) {
      return { data: null, error: `Failed to fetch users: ${usersError.message}`, status: 500 };
    }
    
    // Filter out users who are already team members
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
      role?: { role_id: string; name: string; display_name: string | null } | { role_id: string; name: string; display_name: string | null }[] | null;
    }
    
    const availableUsers = (users || []).filter((user: UserWithRelations) => !teamMemberUserIds.has(user.user_id));
    
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
        status: user.status as "active" | "inactive" | "pending" | "suspended",
        role: role ? {
          id: role.role_id,
          name: role.name,
          displayName: role.display_name || '',
        } : undefined,
        customer: customer ? {
          id: customer.customer_id,
          name: customer.name,
          emailDomain: customer.email_domain || undefined,
        } : undefined,
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
      .select(`
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
      `)
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
          customer: customer ? {
            customer_id: customer.customer_id,
            name: customer.name,
          } : undefined,
          manager: manager ? {
            user_id: manager.user_id,
            full_name: manager.full_name,
            email: manager.email,
          } : undefined,
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
