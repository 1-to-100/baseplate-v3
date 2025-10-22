import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { SYSTEM_ROLES } from '@/common/constants/system-roles';

@Injectable()
export class RoleMigrationService {
  private readonly logger = new Logger(RoleMigrationService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async migrateUserRoles(): Promise<void> {
    this.logger.log('Starting role migration...');

    try {
      // Get system role IDs by name
      const { data: systemAdminRole } = await this.supabaseService
        .getClient()
        .from('roles')
        .select('id')
        .eq('name', SYSTEM_ROLES.SYSTEM_ADMINISTRATOR)
        .single();

      const { data: customerSuccessRole } = await this.supabaseService
        .getClient()
        .from('roles')
        .select('id')
        .eq('name', SYSTEM_ROLES.CUSTOMER_SUCCESS)
        .single();

      const { data: customerAdminRole } = await this.supabaseService
        .getClient()
        .from('roles')
        .select('id')
        .eq('name', SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR)
        .single();

      if (!systemAdminRole || !customerSuccessRole || !customerAdminRole) {
        this.logger.error('System roles not found in database');
        return;
      }

      // Migrate users with isSuperadmin = true to System Administrator
      const { data: superadminUsers } = await this.supabaseService
        .getClient()
        .from('users')
        .select('id, email')
        .eq('is_superadmin', true);

      if (superadminUsers && superadminUsers.length > 0) {
        for (const user of superadminUsers) {
          const { error } = await this.supabaseService
            .getClient()
            .from('users')
            .update({ role_id: systemAdminRole.id })
            .eq('id', user.id);

          if (error) {
            this.logger.error(
              `Failed to migrate superadmin user ${user.email}:`,
              error,
            );
          } else {
            this.logger.log(
              `✅ Migrated superadmin: ${user.email} → ${SYSTEM_ROLES.SYSTEM_ADMINISTRATOR}`,
            );
          }
        }
      }

      // Migrate users with isCustomerSuccess = true to Customer Success
      const { data: customerSuccessUsers } = await this.supabaseService
        .getClient()
        .from('users')
        .select('id, email')
        .eq('is_customer_success', true);

      if (customerSuccessUsers && customerSuccessUsers.length > 0) {
        for (const user of customerSuccessUsers) {
          const { error } = await this.supabaseService
            .getClient()
            .from('users')
            .update({ role_id: customerSuccessRole.id })
            .eq('id', user.id);

          if (error) {
            this.logger.error(
              `Failed to migrate CS user ${user.email}:`,
              error,
            );
          } else {
            this.logger.log(
              `✅ Migrated customer success: ${user.email} → ${SYSTEM_ROLES.CUSTOMER_SUCCESS}`,
            );
          }
        }
      }

      // Set Customer Administrator role for customer owners
      const { data: customers } = await this.supabaseService
        .getClient()
        .from('customers')
        .select('id, owner_id')
        .not('owner_id', 'is', null);

      if (customers && customers.length > 0) {
        for (const customer of customers) {
          const { error } = await this.supabaseService
            .getClient()
            .from('users')
            .update({ role_id: customerAdminRole.id })
            .eq('id', customer.owner_id);

          if (error) {
            this.logger.error(
              `Failed to migrate customer owner ${customer.owner_id}:`,
              error,
            );
          } else {
            this.logger.log(
              `✅ Migrated customer owner (ID: ${customer.owner_id}) → ${SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR}`,
            );
          }
        }
      }

      this.logger.log('🎉 Role migration completed successfully!');
    } catch (error) {
      this.logger.error('❌ Role migration failed:', error);
      throw error;
    }
  }
}
