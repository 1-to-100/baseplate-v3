import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { DatabaseService } from '@/common/database/database.service';
import { SYSTEM_ROLE_IDS } from '@/common/constants/system-roles';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly databaseService: DatabaseService,
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

      // Count users with role_id = 1 (System Administrator)
      const count = await this.databaseService.count('users', {
        where: { role_id: SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR },
      });

      if (count > 0) {
        this.logger.log('✅ System Administrator user(s) already exist');
        return;
      }

      this.logger.warn(
        '⚠️ No System Administrator found. Creating default admin user...',
      );

      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await this.supabaseService.admin.createUser({
          email: 'admin@system.local',
          password: 'Admin@123456',
          email_confirm: true,
        });

      if (authError || !authData.user) {
        throw new Error(`Failed to create auth user: ${authError?.message}`);
      }

      // Create user record in database
      await this.databaseService.create('users', {
        data: {
          email: 'admin@system.local',
          uid: authData.user.id,
          first_name: 'System',
          last_name: 'Administrator',
          role_id: SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR,
          status: 'active',
          customer_id: null, // System-level admin
        },
      });

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

