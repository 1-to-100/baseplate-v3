import { Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SubscriptionsService } from '@/subscriptions/subscriptions.service';

@Module({
  providers: [SubscriptionsService, PrismaService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
