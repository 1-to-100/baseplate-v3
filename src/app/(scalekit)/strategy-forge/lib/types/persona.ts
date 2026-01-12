export interface Persona {
  persona_id: string;
  customer_id: string;
  created_by: string;
  updated_by: string;
  name: string;
  titles: string;
  department?: string;
  job_responsibilities?: string;
  is_manager: boolean;
  experience_years?: string;
  education_levels?: string;
  pain_points_html?: string;
  goals_html?: string;
  solution_relevant_pain_points_html?: string;
  solution_relevant_goals_html?: string;
  current_solutions_html?: string;
  switching_costs_html?: string;
  unsatisfied_with_html?: string;
  ideal_outcome_html?: string;
  buying_behavior?: string;
  digital_savviness?: string;
  is_decider: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonaData {
  name: string;
  titles?: string;
  department?: string;
  job_responsibilities?: string;
  is_manager?: boolean;
  experience_years?: string;
  education_levels?: string;
  pain_points_html?: string;
  goals_html?: string;
  solution_relevant_pain_points_html?: string;
  solution_relevant_goals_html?: string;
  current_solutions_html?: string;
  switching_costs_html?: string;
  unsatisfied_with_html?: string;
  ideal_outcome_html?: string;
  buying_behavior?: string;
  digital_savviness?: string;
  is_decider?: boolean;
}

export interface UpdatePersonaData extends Partial<CreatePersonaData> {
  persona_id: string;
}
