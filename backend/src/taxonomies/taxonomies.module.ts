import { Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DatabaseModule } from '@/common/database/database.module';
import { CustomersService } from '@/customers/customers.service';
import { RolesService } from '@/roles/roles.service';
import { ManagersService } from '@/managers/managers.service';
import { SubscriptionsService } from '@/subscriptions/subscriptions.service';
import { UsersModule } from '@/users/users.module';
import { TaxonomiesService } from '@/taxonomies/taxonomies.service';
import { TaxonomiesController } from '@/taxonomies/taxonomies.controller';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [TaxonomiesController],
  providers: [
    TaxonomiesService,
    CustomersService,
    RolesService,
    ManagersService,
    SubscriptionsService,
    PrismaService,
  ],
  exports: [TaxonomiesService],
})
export class TaxonomiesModule {}
