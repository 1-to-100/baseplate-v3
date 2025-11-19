import { createClient } from "@/lib/supabase/client";
import { SYSTEM_ROLES } from "@/lib/user-utils";

export interface Manager {
  id: string;
  name: string;
}

// Helper function to get customer_success role ID
async function getCustomerSuccessRoleId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data, error } = await supabase
    .from('roles')
    .select('role_id')
    .eq('name', SYSTEM_ROLES.CUSTOMER_SUCCESS)
    .maybeSingle();
  
  if (error) {
    console.error('Failed to find customer_success role:', error);
    return null;
  }
  
  return data?.role_id || null;
}

export async function getManagers(customerId?: string): Promise<Manager[]> {
  const supabase = createClient();
  
  // Get customer success role ID by name
  const customerSuccessRoleId = await getCustomerSuccessRoleId(supabase);
  if (!customerSuccessRoleId) {
    console.warn('Customer Success role not found');
    return [];
  }

  if (!customerId) {
    // If no customer ID provided, return all customer success managers
    const { data: allCSManagers, error } = await supabase
      .from('users')
      .select('user_id, email, full_name')
      .eq('role_id', customerSuccessRoleId)
      .is('deleted_at', null)
      .order('full_name');
    
    if (error) throw error;
    
    return (allCSManagers || []).map((manager) => ({
      id: manager.user_id,
      name: manager.full_name || manager.email,
    }));
  }

  // If customer ID is provided, get managers by customer_id OR customer_success_owned_customers relation
  // First, get managers where customer_id is null OR matches the provided customerId
  const { data: usersManagers, error: usersError } = await supabase
    .from('users')
    .select('user_id, email, full_name')
    .eq('role_id', customerSuccessRoleId)
    .is('deleted_at', null)
    .or(`customer_id.is.null,customer_id.eq.${customerId}`)
    .order('full_name');
  
  if (usersError) throw usersError;

  // Also get managers from customer_success_owned_customers relations
  const { data: csOwnedCustomers, error: csError } = await supabase
    .from('customer_success_owned_customers')
    .select('user_id')
    .eq('customer_id', customerId);
  
  if (csError) throw csError;

  // Get user details for CS owned customers
  const csOwnedManagerIds = (csOwnedCustomers || []).map((rel: { user_id: string }) => rel.user_id);

  let csOwnedManagers: Array<{ user_id: string; email: string; full_name: string | null }> = [];
  if (csOwnedManagerIds.length > 0) {
    const { data: csManagersData, error: csManagersError } = await supabase
      .from('users')
      .select('user_id, email, full_name')
      .in('user_id', csOwnedManagerIds)
      .eq('role_id', customerSuccessRoleId)
      .is('deleted_at', null)
      .order('full_name');
    
    if (csManagersError) throw csManagersError;
    csOwnedManagers = csManagersData || [];
  }

  // Combine and deduplicate managers
  const allManagers = [...(usersManagers || []), ...csOwnedManagers];
  const uniqueManagers = allManagers.filter(
    (manager, index, self) =>
      index === self.findIndex((m) => m.user_id === manager.user_id),
  );

  return uniqueManagers.map((manager) => ({
    id: manager.user_id,
    name: manager.full_name || manager.email,
  }));
}