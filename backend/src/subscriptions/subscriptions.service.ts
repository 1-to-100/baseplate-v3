import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import type {
  Subscription,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from '@/common/types/database.types';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly database: DatabaseService) {}

  // ===================================================================
  // Subscription Types (Plans/Tiers)
  // ===================================================================

  async getForTaxonomy() {
    const subscriptionTypes = await this.database.findMany(
      'subscription_types',
      {
        select: 'subscription_type_id, name',
      },
    );

    return subscriptionTypes.map((type) => ({
      id: type.subscription_type_id,
      name: type.name,
    }));
  }

  // ===================================================================
  // Subscriptions (Stripe Subscription Tracking)
  // ===================================================================

  /**
   * Get all subscriptions, optionally filtered by customer
   */
  async findAllSubscriptions(customerId?: string): Promise<Subscription[]> {
    const where = customerId ? { customer_id: customerId } : {};

    const subscriptions = await this.database.findMany('subscriptions', {
      where,
      include: {
        customer: {
          select: 'customer_id, name, email_domain',
        },
      },
      orderBy: [
        {
          field: 'created_at',
          direction: 'desc',
        },
      ],
    });

    return subscriptions;
  }

  /**
   * Get a subscription by ID
   */
  async findOneSubscription(id: string): Promise<Subscription> {
    const subscription = await this.database.findUnique('subscriptions', {
      where: { subscription_id: id },
      include: {
        customer: {
          select: 'customer_id, name, email_domain',
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  /**
   * Get a subscription by Stripe subscription ID
   */
  async findByStripeId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    const subscription = await this.database.findFirst('subscriptions', {
      where: { stripe_subscription_id: stripeSubscriptionId },
    });

    return subscription;
  }

  /**
   * Get active subscriptions for a customer
   */
  async getActiveSubscriptions(customerId: string): Promise<Subscription[]> {
    const subscriptions = await this.database.findMany('subscriptions', {
      where: {
        customer_id: customerId,
        stripe_status: 'active',
      },
    });

    return subscriptions;
  }

  /**
   * Create a subscription (typically synced from Stripe)
   */
  async createSubscription(
    data: CreateSubscriptionInput,
  ): Promise<Subscription> {
    // Validate customer exists
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: data.customer_id },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${data.customer_id} not found`,
      );
    }

    const subscription = await this.database.create('subscriptions', {
      data: {
        ...data,
        last_synced_at: new Date().toISOString(),
      },
    });

    return subscription;
  }

  /**
   * Update a subscription (typically synced from Stripe)
   */
  async updateSubscription(
    id: string,
    data: UpdateSubscriptionInput,
  ): Promise<Subscription> {
    const existingSubscription = await this.database.findUnique(
      'subscriptions',
      {
        where: { subscription_id: id },
      },
    );

    if (!existingSubscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    const subscription = await this.database.update('subscriptions', {
      where: { subscription_id: id },
      data: {
        ...data,
        last_synced_at: new Date().toISOString(),
      },
    });

    return subscription;
  }

  /**
   * Update subscription by Stripe ID
   */
  async updateByStripeId(
    stripeSubscriptionId: string,
    data: UpdateSubscriptionInput,
  ): Promise<Subscription> {
    const existingSubscription =
      await this.findByStripeId(stripeSubscriptionId);

    if (!existingSubscription) {
      throw new NotFoundException(
        `Subscription with Stripe ID ${stripeSubscriptionId} not found`,
      );
    }

    return this.updateSubscription(existingSubscription.subscription_id, data);
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(id: string): Promise<void> {
    const subscription = await this.database.findUnique('subscriptions', {
      where: { subscription_id: id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    await this.database.delete('subscriptions', {
      where: { subscription_id: id },
    });
  }

  /**
   * Sync subscription from Stripe webhook data
   * This is the main method that should be called from webhook handlers
   */
  async syncFromStripe(stripeSubscriptionData: any): Promise<Subscription> {
    const stripeSubscriptionId = stripeSubscriptionData.id;

    // Check if subscription already exists
    const existing = await this.findByStripeId(stripeSubscriptionId);

    const subscriptionData = {
      stripe_subscription_id: stripeSubscriptionId,
      stripe_status: stripeSubscriptionData.status,
      currency: stripeSubscriptionData.currency,
      description: stripeSubscriptionData.description,
      collection_method: stripeSubscriptionData.collection_method,
      current_period_start: stripeSubscriptionData.current_period_start
        ? new Date(
            stripeSubscriptionData.current_period_start * 1000,
          ).toISOString()
        : null,
      current_period_end: stripeSubscriptionData.current_period_end
        ? new Date(
            stripeSubscriptionData.current_period_end * 1000,
          ).toISOString()
        : null,
      trial_start: stripeSubscriptionData.trial_start
        ? new Date(stripeSubscriptionData.trial_start * 1000).toISOString()
        : null,
      trial_end: stripeSubscriptionData.trial_end
        ? new Date(stripeSubscriptionData.trial_end * 1000).toISOString()
        : null,
      cancel_at_period_end:
        stripeSubscriptionData.cancel_at_period_end || false,
      canceled_at: stripeSubscriptionData.canceled_at
        ? new Date(stripeSubscriptionData.canceled_at * 1000).toISOString()
        : null,
      default_payment_method: stripeSubscriptionData.default_payment_method,
      latest_invoice: stripeSubscriptionData.latest_invoice,
      stripe_metadata: stripeSubscriptionData.metadata || {},
      stripe_raw_data: stripeSubscriptionData,
    };

    if (existing) {
      return this.updateSubscription(
        existing.subscription_id,
        subscriptionData,
      );
    } else {
      // For new subscriptions, we need customer_id
      // This should be in metadata or we need to look up by Stripe customer ID
      const customerId = stripeSubscriptionData.metadata?.customer_id;

      if (!customerId) {
        throw new Error(
          'customer_id not found in Stripe subscription metadata',
        );
      }

      return this.createSubscription({
        customer_id: customerId,
        ...subscriptionData,
      } as CreateSubscriptionInput);
    }
  }
}
