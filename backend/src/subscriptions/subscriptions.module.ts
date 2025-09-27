import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { SubscriptionsService } from '@/subscriptions/subscriptions.service';

@Module({
  imports: [DatabaseModule],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
