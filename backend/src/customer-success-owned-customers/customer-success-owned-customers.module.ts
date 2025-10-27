import { Module } from '@nestjs/common';
import { CustomerSuccessOwnedCustomersController } from './customer-success-owned-customers.controller';
import { CustomerSuccessOwnedCustomersService } from './customer-success-owned-customers.service';
import { DatabaseModule } from '@/common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomerSuccessOwnedCustomersController],
  providers: [CustomerSuccessOwnedCustomersService],
  exports: [CustomerSuccessOwnedCustomersService],
})
export class CustomerSuccessOwnedCustomersModule {}

