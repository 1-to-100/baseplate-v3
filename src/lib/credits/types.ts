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
