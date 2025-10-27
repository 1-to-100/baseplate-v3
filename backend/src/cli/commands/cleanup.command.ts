import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { SubscriptionSeederService } from '../services/subscription-seeder.service';

@Injectable()
export class CleanupCommand {
  private readonly logger = new Logger(CleanupCommand.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly subscriptionSeederService: SubscriptionSeederService,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('Starting HARD DELETE cleanup for test data...');
    this.logger.warn(
      '⚠️  WARNING: This will permanently delete test users and customers from the database!',
    );

    try {
      // Find test customer
      const testCustomer = await this.database.findFirst('customers', {
        where: { name: 'Test Customer Inc.' },
      });

      if (!testCustomer) {
        this.logger.warn('No test customer found to clean up.');
        return;
      }

      this.logger.log(
        `Found test customer: ${testCustomer.name} (ID: ${testCustomer.customer_id})`,
      );

      // Delete in correct order to respect foreign key constraints
      let deletedCount = 0;

      // 1. Delete notifications
      const { data: notifications, error: notifError } =
        (await this.database.notifications
          .delete()
          .eq('customer_id', testCustomer.customer_id)) as {
          data: any[] | null;
          error: any;
        };

      if (notifError) {
        this.logger.error('Error deleting notifications:', notifError);
      } else {
        const notifCount = Array.isArray(notifications)
          ? notifications.length
          : 0;
        deletedCount += notifCount;
        this.logger.log(`Deleted ${notifCount} notifications`);
      }

      // 2. Delete notification templates
      const { data: templates, error: templateError } =
        (await this.database.notification_templates
          .delete()
          .eq('customer_id', testCustomer.customer_id)) as {
          data: any[] | null;
          error: any;
        };

      if (templateError) {
        this.logger.error('Error deleting templates:', templateError);
      } else {
        const templateCount = Array.isArray(templates) ? templates.length : 0;
        deletedCount += templateCount;
        this.logger.log(`Deleted ${templateCount} notification templates`);
      }

      // 3. Delete articles
      const { data: articles, error: articleError } =
        (await this.database.articles
          .delete()
          .eq('customer_id', testCustomer.customer_id)) as {
          data: any[] | null;
          error: any;
        };

      if (articleError) {
        this.logger.error('Error deleting articles:', articleError);
      } else {
        const articleCount = Array.isArray(articles) ? articles.length : 0;
        deletedCount += articleCount;
        this.logger.log(`Deleted ${articleCount} articles`);
      }

      // 4. Delete article categories
      const { data: categories, error: categoryError } =
        (await this.database.article_categories
          .delete()
          .eq('customer_id', testCustomer.customer_id)) as {
          data: any[] | null;
          error: any;
        };

      if (categoryError) {
        this.logger.error('Error deleting categories:', categoryError);
      } else {
        const categoryCount = Array.isArray(categories) ? categories.length : 0;
        deletedCount += categoryCount;
        this.logger.log(`Deleted ${categoryCount} article categories`);
      }

      // 5. Find all users associated with this customer
      // Use direct Supabase query for complex OR conditions
      const { data: allUsers, error: usersError } = await this.database.users
        .select('id, email')
        .or(
          `customer_id.eq.${testCustomer.customer_id},id.eq.${testCustomer.owner_id},email.ilike.%@testcustomer.com%`,
        );

      if (usersError) {
        this.logger.error('Error finding users:', usersError);
        throw usersError;
      }

      if (!allUsers) {
        this.logger.warn('No users found to clean up');
        return;
      }

      this.logger.log(`Found ${allUsers.length} users to clean up`);

      // First, update all users to remove customerId reference
      const { error: updateError } = await this.database.users
        .update({ customer_id: null })
        .eq('customer_id', testCustomer.customer_id);

      if (updateError) {
        this.logger.error('Error updating users:', updateError);
      } else {
        this.logger.log('Removed customerId references from users');
      }

      // Delete all related data for each user
      for (const user of allUsers) {
        // Delete notifications sent by this user
        await this.database.notifications.delete().eq('sender_id', user.id);

        // Delete notifications received by this user
        await this.database.notifications.delete().eq('user_id', user.id);

        // Delete articles created by this user
        await this.database.articles.delete().eq('created_by', user.id);

        // Delete article categories created by this user
        await this.database.article_categories
          .delete()
          .eq('created_by', user.id);

        // Update any users that reference this user as manager
        await this.database.users
          .update({ manager_id: null })
          .eq('manager_id', user.id);
      }

      // Now delete the customer
      const { error: customerError } = await this.database.customers
        .delete()
        .eq('id', testCustomer.customer_id);

      if (customerError) {
        this.logger.error('Error deleting customer:', customerError);
      } else {
        deletedCount += 1;
        this.logger.log(`Deleted customer: ${testCustomer.name}`);
      }

      // Now delete all the users
      for (const user of allUsers) {
        const { error: userError } = await this.database.users
          .delete()
          .eq('id', user.id);

        if (userError) {
          this.logger.error(`Error deleting user ${user.email}:`, userError);
        }
      }
      deletedCount += allUsers.length;
      this.logger.log(`Hard deleted ${allUsers.length} users`);

      // 8. Clean up test customer subscriptions
      const testSubscriptions = await this.database.findMany('subscriptions', {
        where: { customer_id: testCustomer.customer_id },
      });

      for (const subscription of testSubscriptions) {
        await this.database.delete('subscriptions', {
          where: { subscription_id: subscription.subscription_id },
        });
        deletedCount += 1;
        this.logger.log(
          `Deleted test customer subscription: ${subscription.stripe_subscription_id}`,
        );
      }

      this.logger.log(
        `Test data cleanup completed successfully! Total items deleted: ${deletedCount} (HARD DELETE)`,
      );
      this.logger.warn(
        '⚠️  All test data has been permanently removed from the database.',
      );
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
      throw error;
    }
  }
}
