import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SubscriptionSeederService } from '../services/subscription-seeder.service';

@Injectable()
export class CleanupCommand {
  private readonly logger = new Logger(CleanupCommand.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionSeederService: SubscriptionSeederService,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('Starting HARD DELETE cleanup for test data...');
    this.logger.warn('⚠️  WARNING: This will permanently delete test users and customers from the database!');

    try {
      // Find test customer
      const testCustomer = await this.prisma.customer.findFirst({
        where: { name: 'Test Customer Inc.' },
        include: {
          Users: true,
          Articles: true,
          Notification: true,
          NotificationTemplate: true,
        },
      });

      if (!testCustomer) {
        this.logger.warn('No test customer found to clean up.');
        return;
      }

      this.logger.log(`Found test customer: ${testCustomer.name} (ID: ${testCustomer.id})`);

      // Delete in correct order to respect foreign key constraints
      let deletedCount = 0;

      // 1. Delete notifications
      const deletedNotifications = await this.prisma.notification.deleteMany({
        where: { customerId: testCustomer.id },
      });
      deletedCount += deletedNotifications.count;
      this.logger.log(`Deleted ${deletedNotifications.count} notifications`);

      // 2. Delete notification templates
      const deletedTemplates = await this.prisma.notificationTemplate.deleteMany({
        where: { customerId: testCustomer.id },
      });
      deletedCount += deletedTemplates.count;
      this.logger.log(`Deleted ${deletedTemplates.count} notification templates`);

      // 3. Delete articles
      const deletedArticles = await this.prisma.article.deleteMany({
        where: { customerId: testCustomer.id },
      });
      deletedCount += deletedArticles.count;
      this.logger.log(`Deleted ${deletedArticles.count} articles`);

      // 4. Delete article categories
      const deletedCategories = await this.prisma.articleCategory.deleteMany({
        where: { customerId: testCustomer.id },
      });
      deletedCount += deletedCategories.count;
      this.logger.log(`Deleted ${deletedCategories.count} article categories`);

      // 5. Use raw SQL to handle foreign key constraints properly
      // First, find all users associated with this customer
      const allUsers = await this.prisma.user.findMany({
        where: { 
          OR: [
            { customerId: testCustomer.id },
            { id: testCustomer.ownerId },
            { email: { contains: '@testcustomer.com' } }
          ]
        },
        select: { id: true, email: true },
      });

      // First, update all users to remove customerId reference
      await this.prisma.user.updateMany({
        where: { customerId: testCustomer.id },
        data: { customerId: null },
      });
      this.logger.log('Removed customerId references from users');

      // Delete all related data for each user
      for (const user of allUsers) {
        // Delete notifications
        await this.prisma.notification.deleteMany({
          where: { senderId: user.id },
        });

        await this.prisma.notification.deleteMany({
          where: { userId: user.id },
        });

        // Delete articles
        await this.prisma.article.deleteMany({
          where: { createdBy: user.id },
        });

        // Delete article categories
        await this.prisma.articleCategory.deleteMany({
          where: { createdBy: user.id },
        });

        // Update any users that reference this user as manager
        await this.prisma.user.updateMany({
          where: { managerId: user.id },
          data: { managerId: null },
        });
      }

      // Now delete the customer
      await this.prisma.customer.delete({
        where: { id: testCustomer.id },
      });
      deletedCount += 1;
      this.logger.log(`Deleted customer: ${testCustomer.name}`);

      // Now delete all the users
      for (const user of allUsers) {
        await this.prisma.user.delete({
          where: { id: user.id },
        });
      }
      deletedCount += allUsers.length;
      this.logger.log(`Hard deleted ${allUsers.length} users`);

      // 8. Clean up test subscription only (keep other subscriptions)
      const testSubscription = await this.prisma.subscription.findFirst({
        where: { name: 'Test Subscription' },
      });

      if (testSubscription) {
        await this.prisma.subscription.delete({
          where: { id: testSubscription.id },
        });
        deletedCount += 1;
        this.logger.log(`Deleted test subscription: ${testSubscription.name}`);
      }

      this.logger.log(`Test data cleanup completed successfully! Total items deleted: ${deletedCount} (HARD DELETE)`);
      this.logger.warn('⚠️  All test data has been permanently removed from the database.');

    } catch (error) {
      this.logger.error('Error during cleanup:', error);
      throw error;
    }
  }
}
