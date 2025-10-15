import { Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap.service';
import { DatabaseModule } from '@/common/database/database.module';
import { SupabaseModule } from '@/common/supabase/supabase.module';

@Module({
  imports: [DatabaseModule, SupabaseModule],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
