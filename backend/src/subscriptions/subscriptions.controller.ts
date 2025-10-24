import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth/jwt-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * GET /subscriptions
   * Get all subscriptions, optionally filtered by customer
   */
  @Get()
  @Permissions('customer:read')
  async findAll(@Query('customerId') customerId?: string) {
    return this.subscriptionsService.findAllSubscriptions(customerId);
  }

  /**
   * GET /subscriptions/stripe/:stripeId
   * Get a subscription by Stripe subscription ID
   */
  @Get('stripe/:stripeId')
  @Permissions('customer:read')
  async findByStripeId(@Param('stripeId') stripeId: string) {
    return this.subscriptionsService.findByStripeId(stripeId);
  }

  /**
   * GET /subscriptions/active/:customerId
   * Get active subscriptions for a customer
   */
  @Get('active/:customerId')
  @Permissions('customer:read')
  async getActiveSubscriptions(@Param('customerId') customerId: string) {
    return this.subscriptionsService.getActiveSubscriptions(customerId);
  }

  /**
   * GET /subscriptions/:id
   * Get a specific subscription by ID
   */
  @Get(':id')
  @Permissions('customer:read')
  async findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOneSubscription(id);
  }

  /**
   * POST /subscriptions
   * Create a new subscription (typically called from Stripe webhook)
   */
  @Post()
  @Permissions('*')  // System-level operation
  async create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.createSubscription(createSubscriptionDto);
  }

  /**
   * PATCH /subscriptions/:id
   * Update a subscription
   */
  @Patch(':id')
  @Permissions('*')  // System-level operation
  async update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.updateSubscription(id, updateSubscriptionDto);
  }

  /**
   * DELETE /subscriptions/:id
   * Delete a subscription
   */
  @Delete(':id')
  @Permissions('*')  // System-level operation
  async remove(@Param('id') id: string) {
    await this.subscriptionsService.deleteSubscription(id);
    return { message: 'Subscription deleted successfully' };
  }
}

