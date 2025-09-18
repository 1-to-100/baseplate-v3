import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { SupabaseModule } from '@/common/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
