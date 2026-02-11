import type { LLMJobStatus, LLMJob } from '@/hooks/use-job-status';

export type { LLMJobStatus, LLMJob };

export interface LLMProvider {
  id: string;
  name: string;
  slug: string;
}

export interface LLMJobUser {
  user_id: string;
  full_name: string;
  email: string;
}

export interface LLMJobCustomer {
  customer_id: string;
  name: string;
}

export interface LLMJobWithRelations extends LLMJob {
  provider?: LLMProvider | null;
  user?: LLMJobUser | null;
  customer?: LLMJobCustomer | null;
}

export interface GetLLMJobsParams {
  page?: number;
  perPage?: number;
  status?: LLMJobStatus[];
  providerId?: string[];
  featureSlug?: string[];
  dateFrom?: string;
  dateTo?: string;
  orderBy?: 'created_at' | 'updated_at' | 'started_at';
  orderDirection?: 'asc' | 'desc';
  search?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  lastPage: number;
  perPage: number;
}

export interface GetLLMJobsResponse {
  data: LLMJobWithRelations[];
  meta: PaginationMeta;
}

export interface LLMJobStatRow {
  status: LLMJobStatus;
  count: number;
  avg_duration_seconds: number | null;
  oldest_job_age_seconds: number | null;
}

export type LLMJobStats = Record<LLMJobStatus, number> & {
  total: number;
  avgDurationSeconds: number | null;
  oldestJobAgeSeconds: number | null;
};

export interface CancelJobResponse {
  cancelled: boolean;
  job_id: string;
  message: string;
}

// Status categories for filtering
export const ACTIVE_STATUSES: LLMJobStatus[] = ['queued', 'running', 'waiting_llm', 'retrying'];
export const TERMINAL_STATUSES: LLMJobStatus[] = [
  'completed',
  'error',
  'exhausted',
  'cancelled',
  'post_processing_failed',
];
export const ERROR_STATUSES: LLMJobStatus[] = ['error', 'exhausted', 'post_processing_failed'];
export const FAILED_STATUSES: LLMJobStatus[] = [...ERROR_STATUSES, 'cancelled'];
export const CANCELLABLE_STATUSES: LLMJobStatus[] = [
  'queued',
  'running',
  'waiting_llm',
  'retrying',
];
