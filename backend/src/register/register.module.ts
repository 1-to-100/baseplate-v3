import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { RegisterController } from '@/register/register.controller';
import { RegisterService } from '@/register/register.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [RegisterController],
  providers: [RegisterService],
  exports: [RegisterService],
})
export class RegisterModule {}
