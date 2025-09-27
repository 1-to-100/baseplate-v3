import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { SystemModulesController } from '@/system-modules/system-modules.controller';
import { SystemModulesService } from '@/system-modules/system-modules.service';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SystemModulesController],
  providers: [SystemModulesService, FrontendPathsService],
})
export class SystemModulesModule {}
