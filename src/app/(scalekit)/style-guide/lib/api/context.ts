import { createClient } from '@/lib/supabase/client';

export async function getContext() {
  const supabase = createClient();
  const [
    { data: userIdData, error: userErr },
    { data: customerIdData, error: custErr },
    { data: roleIdData, error: roleErr },
    { data: isSysData, error: sysErr },
    { data: isSysAdminData, error: sysAdminErr },
    { data: isCsData, error: csErr },
    { data: isCustAdminData, error: custAdminErr },
  ] = await Promise.all([
    supabase.rpc('current_user_id'),
    supabase.rpc('customer_id'),
    supabase.rpc('role_id'),
    supabase.rpc('is_system_role'),
    supabase.rpc('is_system_admin'),
    supabase.rpc('is_customer_success'),
    supabase.rpc('is_customer_admin'),
  ]);

  return {
    userId: userErr ? null : (userIdData as string),
    customerId: custErr ? null : (customerIdData as string),
    roleId: roleErr ? null : (roleIdData as string),
    isSystemRole: sysErr ? null : (isSysData as boolean),
    isSystemAdmin: sysAdminErr ? null : (isSysAdminData as boolean),
    isCustomerSuccess: csErr ? null : (isCsData as boolean),
    isCustomerAdmin: custAdminErr ? null : (isCustAdminData as boolean),
    errors: { userErr, custErr, roleErr, sysErr, sysAdminErr, csErr, custAdminErr },
  };
}
