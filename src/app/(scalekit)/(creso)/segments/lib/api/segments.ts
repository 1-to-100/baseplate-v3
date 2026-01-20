/**
 * Segments API
 * Functions for segment operations (create, update, delete)
 */

import type { CreateListInput, List } from '../types/list';

/**
 * Create a new segment
 * NOTE: This is a stub implementation - does not actually save to database
 *
 * @param input - Segment data to create
 * @returns Promise resolving to the created segment (mocked)
 */
export async function createSegment(input: CreateListInput): Promise<List> {
  // TODO: Implement actual database save logic
  console.log('createSegment called with:', input);

  // Return a mocked segment for now
  const mockSegment: List = {
    list_id: 'mock-segment-id-' + Date.now(),
    customer_id: input.customer_id,
    list_type: input.list_type,
    name: input.name,
    description: input.description,
    filters: input.filters,
    user_id: input.user_id,
    status: 'new' as const,
    subtype: input.subtype,
    is_static: input.is_static,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return mockSegment;
}

/**
 * Get segments list
 * NOTE: Stub - to be implemented
 */
export async function getSegments(params?: {
  page?: number;
  perPage?: number;
  search?: string;
}): Promise<{ data: List[]; meta: { total: number; page: number; perPage: number } }> {
  console.log('getSegments called with:', params);

  // Return empty list for now
  return {
    data: [],
    meta: {
      total: 0,
      page: params?.page || 1,
      perPage: params?.perPage || 10,
    },
  };
}

/**
 * Get segment by ID
 * NOTE: Stub - to be implemented
 */
export async function getSegmentById(listId: string): Promise<List | null> {
  console.log('getSegmentById called with:', listId);
  return null;
}
