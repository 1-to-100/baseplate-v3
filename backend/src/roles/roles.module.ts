import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { UsersModule } from '@/users/users.module';
import { RolesController } from '@/roles/roles.controller';
import { RolesService } from '@/roles/roles.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => UsersModule)],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
