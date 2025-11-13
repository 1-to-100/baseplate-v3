/**
 * Customer Success API Client
 * API calls removed - all functions are stubbed
 */

import type {
  CustomerSuccessOwnedCustomer,
  CustomerSuccessOwnedCustomerWithRelations,
  CreateCustomerSuccessOwnedCustomerInput,
  ApiResponse,
} from '@/types/database';

// ============================================================================
// Customer Success Owned Customers API - All functions stubbed
// ============================================================================

/**
 * Get all customer success owned customer assignments
 */
export async function getCustomerSuccessOwnedCustomers(): Promise<ApiResponse<CustomerSuccessOwnedCustomerWithRelations[]>> {
  // API call removed
  return { data: [], error: null, status: 200 };
}

/**
 * Get customers owned by a specific customer success representative
 */
export async function getCustomersByCSRep(userId: string): Promise<ApiResponse<CustomerSuccessOwnedCustomerWithRelations[]>> {
  // API call removed
  return { data: [], error: null, status: 200 };
}

/**
 * Get customer success representatives for a specific customer
 */
export async function getCSRepsByCustomer(customerId: string): Promise<ApiResponse<CustomerSuccessOwnedCustomerWithRelations[]>> {
  // API call removed
  return { data: [], error: null, status: 200 };
}

/**
 * Assign a customer success representative to a customer
 */
export async function assignCSRepToCustomer(
  input: CreateCustomerSuccessOwnedCustomerInput
): Promise<ApiResponse<CustomerSuccessOwnedCustomer>> {
  // API call removed
  return { data: null, error: 'API calls removed', status: 501 };
}

/**
 * Remove a customer success representative assignment
 */
export async function removeCSRepFromCustomer(
  customerSuccessOwnedCustomerId: string
): Promise<ApiResponse<void>> {
  // API call removed
  return { data: null, error: 'API calls removed', status: 501 };
}

/**
 * Remove all CS rep assignments by userId and customerId
 */
export async function removeCSRepAssignment(
  userId: string, 
  customerId: string
): Promise<ApiResponse<void>> {
  // API call removed
  return { data: null, error: 'API calls removed', status: 501 };
}

/**
 * Check if a user is assigned as CS rep for a customer
 */
export async function isCSRepAssignedToCustomer(
  userId: string, 
  customerId: string
): Promise<ApiResponse<boolean>> {
  // API call removed
  return { data: false, error: null, status: 200 };
}
