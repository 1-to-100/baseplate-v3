import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { SupabaseDecodedToken } from '@/auth/guards/supabase-auth/supabase-auth.guard';

/**
 * SECURE: Extracts customer ID from JWT app_metadata ONLY
 * 
 * Priority:
 * 1. JWT app_metadata.customer_id (validated by backend)
 * 2. User's own customerId (default for regular users)
 * 3. null (System Admin with no customer selected)
 * 
 * SECURITY: NEVER trusts x-customer-id header!
 * The insecure header-based approach has been replaced with JWT claims.
 */
export const CustomerId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<{
      user?: SupabaseDecodedToken;
      currentUser?: OutputUserDto;
    }>();

    // Priority 1: JWT app_metadata.customer_id (server-validated)
    if (request.user?.app_metadata?.customer_id) {
      return request.user.app_metadata.customer_id;
    }

    // Priority 2: User's own customer ID (for regular users)
    if (request.currentUser?.customerId) {
      return request.currentUser.customerId;
    }

    // Priority 3: null (System Admin with no customer selected)
    return null;
  },
);
