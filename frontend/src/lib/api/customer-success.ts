/**
 * Customer Success API Client
 * Provides functions for managing customer success representative assignments
 */

import type {
  CustomerSuccessOwnedCustomer,
  CustomerSuccessOwnedCustomerWithRelations,
  CreateCustomerSuccessOwnedCustomerInput,
  ApiResponse,
} from '@/types/database';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ============================================================================
// Customer Success Owned Customers API
// ============================================================================

/**
 * Get all customer success owned customer assignments
 */
export async function getCustomerSuccessOwnedCustomers(): Promise<ApiResponse<CustomerSuccessOwnedCustomerWithRelations[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/customer-success-owned-customers`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { 
        data: null, 
        error: error.message || 'Failed to fetch customer success assignments', 
        status: response.status 
      };
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

/**
 * Get customers owned by a specific customer success representative
 */
export async function getCustomersByCSRep(userId: string): Promise<ApiResponse<CustomerSuccessOwnedCustomerWithRelations[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/customer-success-owned-customers?userId=${userId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { 
        data: null, 
        error: error.message || 'Failed to fetch customers for CS rep', 
        status: response.status 
      };
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

/**
 * Get customer success representatives for a specific customer
 */
export async function getCSRepsByCustomer(customerId: string): Promise<ApiResponse<CustomerSuccessOwnedCustomerWithRelations[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/customer-success-owned-customers?customerId=${customerId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return { 
        data: null, 
        error: error.message || 'Failed to fetch CS reps for customer', 
        status: response.status 
      };
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

/**
 * Assign a customer success representative to a customer
 */
export async function assignCSRepToCustomer(
  input: CreateCustomerSuccessOwnedCustomerInput
): Promise<ApiResponse<CustomerSuccessOwnedCustomer>> {
  try {
    const response = await fetch(`${API_BASE_URL}/customer-success-owned-customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      return { 
        data: null, 
        error: error.message || 'Failed to assign CS rep to customer', 
        status: response.status 
      };
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

/**
 * Remove a customer success representative assignment
 */
export async function removeCSRepFromCustomer(
  customerSuccessOwnedCustomerId: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/customer-success-owned-customers/${customerSuccessOwnedCustomerId}`, 
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { 
        data: null, 
        error: error.message || 'Failed to remove CS rep assignment', 
        status: response.status 
      };
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

/**
 * Remove all CS rep assignments by userId and customerId
 */
export async function removeCSRepAssignment(
  userId: string, 
  customerId: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/customer-success-owned-customers?userId=${userId}&customerId=${customerId}`, 
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { 
        data: null, 
        error: error.message || 'Failed to remove CS rep assignment', 
        status: response.status 
      };
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

/**
 * Check if a user is assigned as CS rep for a customer
 */
export async function isCSRepAssignedToCustomer(
  userId: string, 
  customerId: string
): Promise<ApiResponse<boolean>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/customer-success-owned-customers/check?userId=${userId}&customerId=${customerId}`, 
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { 
        data: null, 
        error: error.message || 'Failed to check CS rep assignment', 
        status: response.status 
      };
    }

    const data = await response.json();
    return { data: data.isAssigned, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

