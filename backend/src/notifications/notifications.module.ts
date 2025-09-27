import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { NotificationsService } from '@/notifications/notifications.service';
// import { TemplatesService } from '@/notifications/templates.service';
import { NotificationsController } from '@/notifications/notifications.controller';
// import { TemplatesController } from '@/notifications/templates.controller';
import { UsersModule } from '@/users/users.module';

@Global()
@Module({
  imports: [DatabaseModule, UsersModule],
  providers: [NotificationsService], // TemplatesService temporarily disabled
  controllers: [NotificationsController], // TemplatesController temporarily disabled
  exports: [NotificationsService],
})
export class NotificationsModule {}
