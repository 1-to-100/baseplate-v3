import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
} from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    const supabaseServiceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase URL and Service Role Key must be provided');
    }

    const options: SupabaseClientOptions<'public'> = {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    };

    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey, options);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  get admin() {
    return this.getClient().auth.admin;
  }

  get auth() {
    return this.getClient().auth;
  }

  get storage() {
    return this.getClient().storage;
  }

  get functions() {
    return this.getClient().functions;
  }

  channel(channelName: string) {
    return this.getClient().channel(channelName);
  }

  async sendNotification(
    channelName: string,
    event: string,
    payload?: unknown,
  ) {
    if (!channelName || !event) {
      throw new Error('Channel and event are required');
    }

    const channel = this.channel(channelName);
    channel.subscribe();
    await channel.send({ type: 'broadcast', event, payload });
    await channel.unsubscribe();
  }

  async banUser(uuid: string): Promise<void> {
    const result = await this.admin.updateUserById(uuid, {
      ban_duration: '876000h', // 100 years
    });
    const banError = result.error as { message: string } | null;

    if (banError) {
      throw new Error(`Failed to ban user: ${banError.message}`);
    }
  }

  async unbanUser(uuid: string): Promise<void> {
    const result = await this.admin.updateUserById(uuid, {
      ban_duration: 'none',
    });
    const unbanError = result.error as { message: string } | null;

    if (unbanError) {
      throw new Error(`Failed to unban user: ${unbanError.message}`);
    }
  }
}
