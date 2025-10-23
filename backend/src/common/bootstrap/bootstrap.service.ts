import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { DatabaseService } from '@/common/database/database.service';
import { SYSTEM_ROLES } from '@/common/constants/system-roles';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly database: DatabaseService,
  ) {}

  async onModuleInit() {
    await this.ensureSystemAdmin();
  }

  async ensureSystemAdmin(): Promise<void> {
    try {
      // Check if DISABLE_BOOTSTRAP_ADMIN is true
      if (process.env.DISABLE_BOOTSTRAP_ADMIN === 'true') {
        this.logger.log('Bootstrap admin creation is disabled');
        return;
      }

      // Use the admin client directly to bypass RLS
      const adminClient = this.supabaseService.getClient();

      // Find System Administrator role by name using direct client
      const { data: systemAdminRole, error: roleError } = await adminClient
        .from('roles')
        .select('*')
        .eq('name', SYSTEM_ROLES.SYSTEM_ADMINISTRATOR)
        .single();

      if (roleError || !systemAdminRole) {
        this.logger.error('System Administrator role not found in database');
        return;
      }

      // Count users with System Administrator role using direct client
      const { count, error: countError } = await adminClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .eq('role_id', systemAdminRole?.id);

      if (countError) {
        this.logger.error('Failed to count system administrators:', countError);
        return;
      }

      if (count && count > 0) {
        this.logger.log('✅ System Administrator user(s) already exist');
        return;
      }

      this.logger.warn(
        '⚠️ No System Administrator found. Creating default admin user...',
      );

      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.supabaseService.admin.createUser({
          email: 'admin@system.local',
          password: 'Admin@123456',
          email_confirm: true,
        });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (authError || !authData?.user) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        throw new Error(`Failed to create auth user: ${authError?.message}`);
      }

      // Create user record in database using direct client
      const { error: userError } = await adminClient
        .from('users')
        .insert({
          email: 'admin@system.local',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          uid: authData?.user?.id,
          first_name: 'System',
          last_name: 'Administrator',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          role_id: systemAdminRole?.id,
          status: 'active',
          customer_id: null, // System-level admin
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`Failed to create user record: ${userError.message}`);
      }

      this.logger.warn('✅ Default System Administrator created');
      this.logger.warn('⚠️ Email: admin@system.local');
      this.logger.warn('⚠️ Password: Admin@123456');
      this.logger.warn('⚠️ CHANGE THIS PASSWORD IMMEDIATELY!');
    } catch (error) {
      this.logger.error('❌ Failed to ensure System Administrator:', error);
      // Don't throw - we don't want to prevent app startup
      // The admin can be created manually if bootstrap fails
    }
  }
}
