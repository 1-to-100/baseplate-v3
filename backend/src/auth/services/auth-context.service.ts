import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { UsersService } from '@/users/users.service';
import { DatabaseService } from '@/common/database/database.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import {
  isSystemAdministrator,
  isCustomerSuccess,
  isCustomerAdministrator,
} from '@/common/utils/user-role-helpers';

export interface RefreshContextDto {
  customerId?: string | null;
  impersonatedUserId?: string | null;
}

@Injectable()
export class AuthContextService {
  private readonly logger = new Logger(AuthContextService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
    private readonly database: DatabaseService,
  ) {}

  /**
   * SECURITY CRITICAL: Validates and updates user context in app_metadata
   * This is the ONLY way to set customer_id and impersonated_user_id
   * Frontend must call supabase.auth.refreshSession() after this to get updated JWT
   */
  async refreshTokenWithContext(
    userId: string,
    requestedContext: RefreshContextDto,
  ): Promise<{ updated: boolean; message: string }> {
    const user = await this.usersService.findOne(userId);

    if (!user || !user.uid) {
      throw new ForbiddenException('User not found or not authenticated');
    }

    // VALIDATE CUSTOMER ACCESS
    let validatedCustomerId: string | null = null;
    let validatedCustomerIds: string[] = [];

    if (requestedContext.customerId) {
      await this.validateCustomerAccess(user, requestedContext.customerId);
      validatedCustomerId = requestedContext.customerId;
    }

    // System admins get list of all customers they can access
    if (isSystemAdministrator(user)) {
      validatedCustomerIds = requestedContext.customerId
        ? [requestedContext.customerId]
        : [];
    }

    // VALIDATE IMPERSONATION ACCESS
    let validatedImpersonatedUserId: string | null = null;

    if (requestedContext.impersonatedUserId) {
      await this.validateImpersonationAccess(
        user,
        requestedContext.impersonatedUserId,
      );
      validatedImpersonatedUserId = requestedContext.impersonatedUserId;
    }

    // UPDATE USER APP_METADATA IN SUPABASE
    // This will cause Supabase to issue a new JWT with updated claims
    const { data, error } = await this.supabase.admin.updateUserById(
      user.uid,
      {
        app_metadata: {
          customer_id: validatedCustomerId,
          customer_ids: validatedCustomerIds,
          impersonated_user_id: validatedImpersonatedUserId,
          impersonation_allowed:
            isSystemAdministrator(user) || isCustomerSuccess(user),
          context_validated_at: Date.now(),
        },
      },
    );

    if (error) {
      this.logger.error('Failed to update app_metadata:', error);
      throw new ForbiddenException('Failed to update user context');
    }

    if (!data?.user) {
      throw new ForbiddenException('Failed to retrieve updated user');
    }

    // SUCCESS - app_metadata has been updated
    // Frontend must now call supabase.auth.refreshSession() to get new JWT with claims
    this.logger.log(
      `Context updated for user ${user.id}: customer=${validatedCustomerId}, impersonation=${validatedImpersonatedUserId}`,
    );
    
    return {
      updated: true,
      message: 'Context updated successfully. Please refresh your session.',
    };
  }

  /**
   * Clears user context by removing app_metadata claims
   */
  async clearContext(userId: string): Promise<void> {
    const user = await this.usersService.findOne(userId);

    if (!user || !user.uid) {
      throw new ForbiddenException('User not found or not authenticated');
    }

    await this.supabase.admin.updateUserById(user.uid, {
      app_metadata: {
        customer_id: null,
        customer_ids: [],
        impersonated_user_id: null,
        impersonation_allowed: false,
        context_validated_at: null,
      },
    });
  }

  /**
   * SECURITY CRITICAL: Validates customer access permissions
   */
  private async validateCustomerAccess(
    user: OutputUserDto,
    requestedCustomerId: string,
  ): Promise<void> {
    // System administrators can access any customer
    if (isSystemAdministrator(user)) {
      const customer = await this.database.findUnique('customers', {
        where: { customer_id: requestedCustomerId },
      });

      if (!customer) {
        throw new ForbiddenException('Customer does not exist');
      }

      return; // Access granted
    }

    // Customer Success can access assigned customers
    if (isCustomerSuccess(user)) {
      const assignment = await this.database.findFirst(
        'customer_success_owned_customers',
        {
          where: {
            user_id: user.id,
            customer_id: requestedCustomerId,
          },
        },
      );

      if (!assignment && user.customerId !== requestedCustomerId) {
        throw new ForbiddenException(
          'You do not have access to this customer',
        );
      }

      return; // Access granted
    }

    // Customer Administrator can only access their own customer
    if (isCustomerAdministrator(user)) {
      if (user.customerId !== requestedCustomerId) {
        throw new ForbiddenException('You can only access your own customer');
      }
      return; // Access granted
    }

    // Regular users can only access their own customer
    if (user.customerId !== requestedCustomerId) {
      throw new ForbiddenException('You can only access your own customer');
    }
  }

  /**
   * SECURITY CRITICAL: Validates impersonation permissions
   */
  private async validateImpersonationAccess(
    user: OutputUserDto,
    targetUserId: string,
  ): Promise<void> {
    // Only System Admin and Customer Success can impersonate
    if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
      throw new ForbiddenException('No impersonation permissions');
    }

    const targetUser = await this.usersService.findOne(targetUserId);

    if (!targetUser) {
      throw new ForbiddenException('Target user not found');
    }

    // Cannot impersonate System Administrator
    if (isSystemAdministrator(targetUser)) {
      throw new ForbiddenException('Cannot impersonate system administrator');
    }

    // Cannot impersonate yourself
    if (targetUser.id === user.id) {
      throw new ForbiddenException('Cannot impersonate yourself');
    }

    // Customer Success can only impersonate within their customer
    if (isCustomerSuccess(user)) {
      if (targetUser.customerId !== user.customerId) {
        throw new ForbiddenException(
          'Cannot impersonate users from other customers',
        );
      }
    }

    // Check if target user is active
    if (targetUser.status !== 'ACTIVE') {
      throw new ForbiddenException('Cannot impersonate inactive user');
    }
  }
}

