export interface OptionPublicationStatus {
  option_id: string;
  programmatic_name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OptionCompetitorStatus {
  option_id: string;
  programmatic_name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OptionCompetitorSignalType {
  option_id: string;
  programmatic_name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OptionDataSource {
  option_id: string;
  programmatic_name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OptionStrategyChangeType {
  option_id: string;
  programmatic_name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyStrategy {
  strategy_id: string;
  customer_id: string;
  mission: string;
  mission_description: string | null;
  vision: string;
  vision_description: string | null;
  publication_status_id: string;
  owner_user_id: string | null;
  is_published: boolean;
  effective_at: string | null;
  created_at: string;
  created_by_user_id: string | null;
  updated_at: string;
  updated_by_user_id: string | null;
}

export interface StrategyPrinciple {
  principle_id: string;
  strategy_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  created_by_user_id: string | null;
  updated_at: string;
  updated_by_user_id: string | null;
}

export interface StrategyValue {
  value_id: string;
  strategy_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  created_by_user_id: string | null;
  updated_at: string;
  updated_by_user_id: string | null;
}

export interface Competitor {
  competitor_id: string;
  customer_id: string;
  name: string;
  website_url: string | null;
  category: string | null;
  summary: string | null;
  status_id: string;
  source_id: string | null;
  created_at: string;
  created_by_user_id: string | null;
  updated_at: string;
  updated_by_user_id: string | null;
}

export interface CompetitorSignal {
  signal_id: string;
  competitor_id: string;
  signal_type_id: string;
  observed_at: string;
  source_url: string | null;
  note: string | null;
  created_at: string;
  created_by_user_id: string | null;
  updated_at: string;
  updated_by_user_id: string | null;
}

export interface StrategyChangeLog {
  change_log_id: string;
  strategy_id: string;
  change_type_id: string;
  changed_by_user_id: string;
  changed_at: string;
  summary: string;
  justification: string | null;
  meta: Record<string, unknown> | null;
}

export interface StrategyWorkspaceData {
  strategy: CompanyStrategy | null;
  principles: StrategyPrinciple[];
  values: StrategyValue[];
  competitors: Competitor[];
  competitorSignals: CompetitorSignal[];
  changeLogs: StrategyChangeLog[];
  publicationStatuses: OptionPublicationStatus[];
  competitorStatuses: OptionCompetitorStatus[];
  competitorSignalTypes: OptionCompetitorSignalType[];
  dataSources: OptionDataSource[];
  changeTypes: OptionStrategyChangeType[];
}

