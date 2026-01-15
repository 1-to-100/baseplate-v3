// Territories API - This is an alias for segments
// Territories and segments are the same concept in this system
import {
  getSegmentsList,
  createSegment,
  getSegmentById,
  updateSegment,
  deleteSegment,
} from './segments';
import type {
  Segment,
  CreateSegmentPayload,
  UpdateSegmentPayload,
  GetSegmentsParams,
  GetSegmentsResponse,
} from '../types/segments';

// Re-export segments functions as territories functions
export const getTerritoriesList = getSegmentsList;
export const createTerritory = createSegment;
export const getTerritoryById = getSegmentById;
export const updateTerritory = updateSegment;
export const deleteTerritory = deleteSegment;

// Re-export types
export type Territory = Segment;
export type CreateTerritoryPayload = CreateSegmentPayload;
export type UpdateTerritoryPayload = UpdateSegmentPayload;
export type GetTerritoriesParams = GetSegmentsParams;
export type GetTerritoriesResponse = GetSegmentsResponse;
