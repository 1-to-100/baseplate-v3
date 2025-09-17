import { Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RegisterController } from '@/register/register.controller';
import { RegisterService } from '@/register/register.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [RegisterController],
  providers: [RegisterService, PrismaService],
  exports: [RegisterService],
})
export class RegisterModule {}
