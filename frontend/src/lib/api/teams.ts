/**
 * Teams API Client
 * API calls removed - all functions are stubbed
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

// ============================================================================
// Teams API - All functions stubbed
// ============================================================================

export async function getTeams(customerId?: string): Promise<ApiResponse<Team[]>> {
  // API call removed
  return { data: [], error: null, status: 200 };
}

export async function getTeamById(teamId: string): Promise<ApiResponse<TeamWithRelations>> {
  // API call removed
  return { data: null, error: 'API calls removed', status: 501 };
}

export async function createTeam(input: CreateTeamInput): Promise<ApiResponse<Team>> {
  // API call removed
  return { data: null, error: 'API calls removed', status: 501 };
}

export async function updateTeam(teamId: string, input: UpdateTeamInput): Promise<ApiResponse<Team>> {
  // API call removed
  return { data: null, error: 'API calls removed', status: 501 };
}

export async function deleteTeam(teamId: string): Promise<ApiResponse<void>> {
  // API call removed
  return { data: null, error: 'API calls removed', status: 501 };
}

// ============================================================================
// Team Members API - All functions stubbed
// ============================================================================

export async function getTeamMembers(teamId: string): Promise<ApiResponse<TeamMemberWithRelations[]>> {
  // API call removed
  return { data: [], error: null, status: 200 };
}

export async function addTeamMember(input: CreateTeamMemberInput): Promise<ApiResponse<TeamMember>> {
  // API call removed
  return { data: null, error: 'API calls removed', status: 501 };
}

export async function removeTeamMember(teamMemberId: string): Promise<ApiResponse<void>> {
  // API call removed
  return { data: null, error: 'API calls removed', status: 501 };
}

export async function getUserTeams(userId: string): Promise<ApiResponse<TeamWithRelations[]>> {
  // API call removed
  return { data: [], error: null, status: 200 };
}
