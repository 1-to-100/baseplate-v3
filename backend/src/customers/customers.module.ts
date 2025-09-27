import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { CustomersController } from '@/customers/customers.controller';
import { CustomersService } from '@/customers/customers.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => UsersModule)],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
