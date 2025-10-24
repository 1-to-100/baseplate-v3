/**
 * Teams API Client
 * Provides functions for managing teams and team members
 */

import type {
  Team,
  TeamWithRelations,
  TeamMember,
  TeamMemberWithRelations,
  CreateTeamInput,
  UpdateTeamInput,
  CreateTeamMemberInput,
  ApiResponse,
  PaginatedResponse,
} from '@/types/database';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ============================================================================
// Teams API
// ============================================================================

export async function getTeams(customerId?: string): Promise<ApiResponse<Team[]>> {
  try {
    const url = customerId 
      ? `${API_BASE_URL}/teams?customerId=${customerId}`
      : `${API_BASE_URL}/teams`;
    
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Failed to fetch teams', status: response.status };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

export async function getTeamById(teamId: string): Promise<ApiResponse<TeamWithRelations>> {
  try {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Failed to fetch team', status: response.status };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

export async function createTeam(input: CreateTeamInput): Promise<ApiResponse<Team>> {
  try {
    const response = await fetch(`${API_BASE_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Failed to create team', status: response.status };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

export async function updateTeam(teamId: string, input: UpdateTeamInput): Promise<ApiResponse<Team>> {
  try {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Failed to update team', status: response.status };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

export async function deleteTeam(teamId: string): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Failed to delete team', status: response.status };
    }

    return { data: null, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

// ============================================================================
// Team Members API
// ============================================================================

export async function getTeamMembers(teamId: string): Promise<ApiResponse<TeamMemberWithRelations[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Failed to fetch team members', status: response.status };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

export async function addTeamMember(input: CreateTeamMemberInput): Promise<ApiResponse<TeamMember>> {
  try {
    const response = await fetch(`${API_BASE_URL}/team-members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Failed to add team member', status: response.status };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

export async function removeTeamMember(teamMemberId: string): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_BASE_URL}/team-members/${teamMemberId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Failed to remove team member', status: response.status };
    }

    return { data: null, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

export async function getUserTeams(userId: string): Promise<ApiResponse<TeamWithRelations[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/teams`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Failed to fetch user teams', status: response.status };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

