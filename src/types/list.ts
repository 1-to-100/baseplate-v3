/**
 * List Types
 * Types for lists, segments, territories, and related entities
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ListType {
  SEGMENT = 'segment',
  TERRITORY = 'territory',
  LIST = 'list',
}

export enum ListStatus {
  NEW = 'new',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ListSubtype {
  PEOPLE = 'people',
  COMPANY = 'company',
}

// ============================================================================
// BASE TYPES
// ============================================================================

export interface List {
  list_id: string;
  customer_id: string;
  list_type: ListType;
  name: string;
  description?: string | null;
  filters?: Record<string, unknown> | null;
  user_id?: string | null;
  status: ListStatus;
  subtype: ListSubtype;
  is_static: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ============================================================================
// WITH RELATIONS TYPES
// ============================================================================

export interface ListWithRelations extends List {
  customer?: {
    customer_id: string;
    name: string;
  };
  user?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  companies?: Array<{
    id: string;
    company_id: string;
    company?: {
      company_id: string;
      display_name?: string | null;
      domain?: string | null;
    };
  }>;
  company_count?: number;
}

// ============================================================================
// INPUT TYPES (for creating/updating records)
// ============================================================================

export type CreateListInput = Omit<
  List,
  'list_id' | 'status' | 'created_at' | 'updated_at' | 'deleted_at'
>;
export type UpdateListInput = Partial<Omit<CreateListInput, 'customer_id'>>;

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface ListFilters {
  industries?: number[];
  company_sizes?: number[];
  countries?: string[];
  regions?: string[];
  technologies?: string[];
  categories?: string[];
  employee_range?: {
    min?: number;
    max?: number;
  };
  revenue_range?: {
    min?: number;
    max?: number;
  };
  [key: string]: unknown;
}
