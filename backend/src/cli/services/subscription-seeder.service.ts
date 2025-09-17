import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface SubscriptionTier {
  name: string;
  description: string;
  features: string[];
  price?: number;
  currency?: string;
  billingCycle?: 'monthly' | 'yearly';
  maxUsers?: number;
  maxStorage?: number; // in GB
  apiCallsPerMonth?: number;
  supportLevel?: 'basic' | 'priority' | 'dedicated';
}

@Injectable()
export class SubscriptionSeederService {
  private readonly logger = new Logger(SubscriptionSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedBasicSubscriptions(): Promise<void> {
    this.logger.log('Starting subscription seeding...');

    try {
      // Check if any of our subscription tiers already exist
      const existingSubscriptions = await this.prisma.subscription.findMany({
        where: { 
          name: { 
            in: ['Free', 'Starter', 'Professional', 'Enterprise'] 
          } 
        }
      });
      if (existingSubscriptions.length >= 4) {
        this.logger.warn('Subscription tiers already exist. Skipping subscription seeding.');
        return;
      }

      const subscriptionTiers: SubscriptionTier[] = [
        {
          name: 'Free',
          description: 'Perfect for individuals and small teams getting started',
          features: [
            'Up to 5 users',
            '1GB storage',
            'Basic support',
            'Core features access',
            'Community forum access'
          ],
          price: 0,
          currency: 'USD',
          billingCycle: 'monthly',
          maxUsers: 5,
          maxStorage: 1,
          apiCallsPerMonth: 1000,
          supportLevel: 'basic'
        },
        {
          name: 'Starter',
          description: 'Great for growing teams that need more resources',
          features: [
            'Up to 25 users',
            '10GB storage',
            'Priority support',
            'Advanced features',
            'Email support',
            'Basic analytics'
          ],
          price: 29,
          currency: 'USD',
          billingCycle: 'monthly',
          maxUsers: 25,
          maxStorage: 10,
          apiCallsPerMonth: 10000,
          supportLevel: 'priority'
        },
        {
          name: 'Professional',
          description: 'For established teams that need comprehensive features',
          features: [
            'Up to 100 users',
            '100GB storage',
            'Priority support',
            'All features',
            'Phone & email support',
            'Advanced analytics',
            'Custom integrations',
            'SSO integration'
          ],
          price: 99,
          currency: 'USD',
          billingCycle: 'monthly',
          maxUsers: 100,
          maxStorage: 100,
          apiCallsPerMonth: 100000,
          supportLevel: 'priority'
        },
        {
          name: 'Enterprise',
          description: 'For large organizations with custom requirements',
          features: [
            'Unlimited users',
            'Unlimited storage',
            'Dedicated support',
            'All features',
            '24/7 phone support',
            'Advanced analytics & reporting',
            'Custom integrations',
            'SSO & LDAP integration',
            'Custom SLA',
            'Dedicated account manager'
          ],
          price: 299,
          currency: 'USD',
          billingCycle: 'monthly',
          maxUsers: -1, // unlimited
          maxStorage: -1, // unlimited
          apiCallsPerMonth: -1, // unlimited
          supportLevel: 'dedicated'
        },
      ];

      for (const tier of subscriptionTiers) {
        await this.createSubscription(tier);
      }

      this.logger.log(`Successfully seeded ${subscriptionTiers.length} subscription tiers`);

    } catch (error) {
      this.logger.error('Error seeding subscriptions:', error);
      throw error;
    }
  }

  async cleanupSubscriptions(): Promise<void> {
    this.logger.log('Starting subscription cleanup...');

    try {
      const deletedSubscriptions = await this.prisma.subscription.deleteMany();
      this.logger.log(`Deleted ${deletedSubscriptions.count} subscriptions`);

    } catch (error) {
      this.logger.error('Error cleaning up subscriptions:', error);
      throw error;
    }
  }

  async getSubscriptionByName(name: string) {
    return this.prisma.subscription.findFirst({
      where: { name }
    });
  }

  private async createSubscription(tier: SubscriptionTier) {
    this.logger.log(`Creating subscription: ${tier.name}`);
    
    return this.prisma.subscription.upsert({
      where: { name: tier.name },
      update: {
        description: tier.description,
      },
      create: {
        name: tier.name,
        description: tier.description,
      },
    });
  }
}
