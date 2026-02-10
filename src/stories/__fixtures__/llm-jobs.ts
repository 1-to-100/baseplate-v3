import type { LLMJobStatus } from '@/hooks/use-job-status';
import type {
  LLMProvider,
  LLMJobCustomer,
  LLMJobUser,
  LLMJobWithRelations,
  LLMJobStats,
  PaginationMeta,
} from '@/types/llm-jobs';
import type { LLMJobsFiltersState } from '@/components/dashboard/llm-jobs/llm-jobs-filters';

export const MOCK_PROVIDER: LLMProvider = {
  id: 'prov-001',
  name: 'OpenAI GPT-4o',
  slug: 'openai-gpt4o',
};

export const MOCK_PROVIDER_2: LLMProvider = {
  id: 'prov-002',
  name: 'Anthropic Claude',
  slug: 'anthropic-claude',
};

export const MOCK_CUSTOMER: LLMJobCustomer = {
  customer_id: 'cust-001',
  name: 'Acme Corp',
};

export const MOCK_USER: LLMJobUser = {
  user_id: 'user-001',
  full_name: 'Jane Doe',
  email: 'jane@acme.com',
};

export function createMockJob(overrides: Partial<LLMJobWithRelations> = {}): LLMJobWithRelations {
  return {
    id: 'job-001',
    customer_id: MOCK_CUSTOMER.customer_id,
    user_id: MOCK_USER.user_id,
    provider_id: MOCK_PROVIDER.id,
    prompt: 'Summarize the quarterly report for Q4 2025',
    input: { document_id: 'doc-123', format: 'markdown' },
    system_prompt: 'You are a helpful business analyst.',
    feature_slug: 'report-summary',
    status: 'completed' as LLMJobStatus,
    llm_response_id: 'resp-001',
    retry_count: 0,
    result_ref: JSON.stringify({
      output: 'Q4 2025 showed strong growth...',
      usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 },
      model: 'gpt-4o',
    }),
    error_message: null,
    created_at: '2026-02-09T10:00:00Z',
    updated_at: '2026-02-09T10:01:30Z',
    started_at: '2026-02-09T10:00:05Z',
    completed_at: '2026-02-09T10:01:30Z',
    cancelled_at: null,
    provider: MOCK_PROVIDER,
    customer: MOCK_CUSTOMER,
    user: MOCK_USER,
    ...overrides,
  };
}

export const MOCK_JOBS: LLMJobWithRelations[] = [
  createMockJob({
    id: 'job-001',
    status: 'completed',
    prompt: 'Summarize the quarterly report for Q4 2025',
    feature_slug: 'report-summary',
  }),
  createMockJob({
    id: 'job-002',
    status: 'running',
    prompt: 'Generate marketing copy for new product launch',
    feature_slug: 'content-gen',
    started_at: '2026-02-09T11:00:00Z',
    completed_at: null,
    result_ref: null,
    retry_count: 0,
    provider: MOCK_PROVIDER_2,
  }),
  createMockJob({
    id: 'job-003',
    status: 'error',
    prompt: 'Translate user manual to French',
    feature_slug: 'translation',
    error_message: 'Rate limit exceeded. Please try again later.',
    result_ref: null,
    retry_count: 3,
  }),
  createMockJob({
    id: 'job-004',
    status: 'queued',
    prompt: 'Analyze customer feedback sentiment for January batch',
    feature_slug: 'sentiment-analysis',
    started_at: null,
    completed_at: null,
    result_ref: null,
  }),
  createMockJob({
    id: 'job-005',
    status: 'cancelled',
    prompt: 'Generate weekly newsletter draft',
    feature_slug: 'newsletter',
    cancelled_at: '2026-02-09T12:30:00Z',
    completed_at: null,
    result_ref: null,
  }),
];

export const MOCK_STATS: LLMJobStats = {
  total: 156,
  queued: 12,
  running: 5,
  waiting_llm: 3,
  retrying: 2,
  completed: 120,
  error: 8,
  exhausted: 2,
  cancelled: 4,
  avgDurationSeconds: 45.2,
  oldestJobAgeSeconds: 3600,
};

export const MOCK_PAGINATION: PaginationMeta = {
  total: 156,
  page: 1,
  lastPage: 7,
  perPage: 25,
};

export const MOCK_EMPTY_FILTERS: LLMJobsFiltersState = {
  status: [],
  providerId: [],
  featureSlug: [],
  dateFrom: '',
  dateTo: '',
  search: '',
};
