import { Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CustomersController } from '@/customers/customers.controller';
import { CustomersService } from '@/customers/customers.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [CustomersController],
  providers: [CustomersService, PrismaService],
  exports: [CustomersService],
})
export class CustomersModule {}
