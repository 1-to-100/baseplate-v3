import { Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ManagersService } from '@/managers/managers.service';
import { ManagersController } from '@/managers/managers.controller';

@Module({
  controllers: [ManagersController],
  providers: [ManagersService, PrismaService],
  exports: [ManagersService],
})
export class ManagersModule {}
