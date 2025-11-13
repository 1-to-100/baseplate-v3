import { createClient } from "@/lib/supabase/client";

export interface Manager {
  id: string;
  name: string;
}

export async function getManagers(customerId?: string): Promise<Manager[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('users')
    .select('user_id, full_name, email')
    .not('manager_id', 'is', null)  // Only users who are managers
    .order('full_name');
  
  if (customerId) {
    query = query.eq('customer_id', customerId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map(user => ({
    id: user.user_id,
    name: user.full_name || user.email,
  }));
}