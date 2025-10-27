import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { CustomersService } from '@/customers/customers.service';
import { RolesService } from '@/roles/roles.service';
import { ManagersService } from '@/managers/managers.service';
import { SubscriptionsService } from '@/subscriptions/subscriptions.service';
import { UsersModule } from '@/users/users.module';
import { TaxonomiesService } from '@/taxonomies/taxonomies.service';
import { TaxonomiesController } from '@/taxonomies/taxonomies.controller';
import { CustomerSuccessOwnedCustomersModule } from '@/customer-success-owned-customers/customer-success-owned-customers.module';

@Module({
  imports: [DatabaseModule, UsersModule, CustomerSuccessOwnedCustomersModule],
  controllers: [TaxonomiesController],
  providers: [
    TaxonomiesService,
    CustomersService,
    RolesService,
    ManagersService,
    SubscriptionsService,
  ],
  exports: [TaxonomiesService],
})
export class TaxonomiesModule {}
