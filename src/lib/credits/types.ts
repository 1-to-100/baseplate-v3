export interface CreditBalance {
  customer_id: string;
  balance: number;
  updated_at: string;
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
