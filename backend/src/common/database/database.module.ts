import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { SupabaseModule } from '@/common/supabase/supabase.module';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { SupabaseCRUD } from '@/common/utils/supabase-crud.util';

@Module({
  imports: [SupabaseModule],
  providers: [
    DatabaseService,
    {
      provide: SupabaseCRUD,
      useFactory: (supabaseService: SupabaseService) => {
        return new SupabaseCRUD(supabaseService.getClient());
      },
      inject: [SupabaseService],
    },
  ],
  exports: [DatabaseService, SupabaseCRUD],
})
export class DatabaseModule {}
