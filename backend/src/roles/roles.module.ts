import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UsersModule } from '@/users/users.module';
import { RolesController } from '@/roles/roles.controller';
import { RolesService } from '@/roles/roles.service';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [RolesController],
  providers: [RolesService, PrismaService],
  exports: [RolesService],
})
export class RolesModule {}
