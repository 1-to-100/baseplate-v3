import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface CustomerInfo {
  company_name: string;
  tagline?: string;
  one_sentence_summary?: string;
  solution_overview?: string;
  website_url?: string;
}

export const customerInfoKeys = {
  all: ['customer-info'] as const,
  detail: () => [...customerInfoKeys.all, 'detail'] as const,
};

/**
 * Hook to fetch customer information from customer_info and customers tables
 */
export function useCustomerInfo() {
  return useQuery({
    queryKey: customerInfoKeys.detail(),
    queryFn: async (): Promise<CustomerInfo | null> => {
      const supabase = createClient();

      // Get current customer ID
      const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');

      if (customerIdError) {
        console.error('Failed to get customer ID:', customerIdError);
        return null;
      }

      const customerId = customerIdResult;

      // Fetch customer_info and customers data in parallel
      const [customerInfoResult, customersResult] = await Promise.all([
        supabase
          .from('customer_info')
          .select('company_name, tagline, one_sentence_summary, solution_overview')
          .eq('customer_id', customerId)
          .maybeSingle(),
        supabase.from('customers').select('email_domain').eq('customer_id', customerId).single(),
      ]);

      if (customerInfoResult.error) {
        console.warn('Failed to fetch customer_info:', customerInfoResult.error);
      }

      if (customersResult.error) {
        console.warn('Failed to fetch customers:', customersResult.error);
      }

      // If no customer_info exists, return null
      if (!customerInfoResult.data) {
        return null;
      }

      // Build website URL from email_domain
      const websiteUrl = customersResult.data?.email_domain
        ? `https://www.${customersResult.data.email_domain}`
        : undefined;

      return {
        company_name: customerInfoResult.data.company_name,
        tagline: customerInfoResult.data.tagline || undefined,
        one_sentence_summary: customerInfoResult.data.one_sentence_summary || undefined,
        solution_overview: customerInfoResult.data.solution_overview || undefined,
        website_url: websiteUrl,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - company info doesn't change frequently
  });
}
