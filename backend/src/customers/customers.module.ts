import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { CustomersController } from '@/customers/customers.controller';
import { CustomersService } from '@/customers/customers.service';
import { UsersModule } from '@/users/users.module';
import { CustomerSuccessOwnedCustomersModule } from '@/customer-success-owned-customers/customer-success-owned-customers.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => UsersModule), CustomerSuccessOwnedCustomersModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
