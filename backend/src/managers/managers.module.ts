import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { ManagersService } from '@/managers/managers.service';
import { ManagersController } from '@/managers/managers.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ManagersController],
  providers: [ManagersService],
  exports: [ManagersService],
})
export class ManagersModule {}
