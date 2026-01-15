export type JourneyPhaseType = 'Marketing' | 'Sales' | 'Onboarding' | 'Customer Success';

export interface CustomerJourneyStage {
  customer_journey_stage_id: string;
  customer_id: number;
  journey_phase: JourneyPhaseType;
  name: string;
  description: string;
  graduation_criteria: string;
  order_index: number | null;
  code: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerJourneyStagePayload {
  journey_phase: JourneyPhaseType;
  name: string;
  description: string;
  graduation_criteria: string;
  order_index?: number | null;
  code?: string | null;
}

export interface UpdateCustomerJourneyStagePayload {
  journey_phase?: JourneyPhaseType;
  name?: string;
  description?: string;
  graduation_criteria?: string;
  order_index?: number | null;
  code?: string | null;
}

export interface GetCustomerJourneyStagesParams {
  journey_phase?: JourneyPhaseType;
  search?: string;
  order_by?: 'name' | 'order_index' | 'created_at' | 'updated_at';
  order_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface GetCustomerJourneyStagesResponse {
  data: CustomerJourneyStage[];
  count: number;
}
