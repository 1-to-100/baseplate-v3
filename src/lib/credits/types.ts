export interface CreditBalance {
  customer_id: string;
  balance: number;
  period_limit: number;
  period_used: number;
  period_remaining: number;
  period_starts_at: string | null;
  period_ends_at: string | null;
  subscription_name: string | null;
  updated_at: string | null;
}

export interface CreditCheckResult {
  has_credits: boolean;
  current_balance: number;
  required: number;
  period_limit: number;
  period_used: number;
  period_remaining: number;
  period_ends_at: string | null;
}

export interface CreditTransaction {
  credit_transaction_id: string;
  amount: number;
  type: 'grant' | 'charge' | 'refund' | 'reset';
  action_code: string | null;
  reason: string;
  reference_id: string | null;
  created_at: string;
}
