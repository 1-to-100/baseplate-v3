import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { NotificationsService } from '@/notifications/notifications.service';
// import { TemplatesService } from '@/notifications/templates.service';
import { NotificationsController } from '@/notifications/notifications.controller';
// import { TemplatesController } from '@/notifications/templates.controller';
import { UsersModule } from '@/users/users.module';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Global()
@Module({
  imports: [DatabaseModule, UsersModule],
  providers: [NotificationsService, TemplatesService],
  controllers: [NotificationsController, TemplatesController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
