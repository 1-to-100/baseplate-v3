import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerSuccessOwnedCustomersService } from './customer-success-owned-customers.service';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { CreateCustomerSuccessOwnedCustomerInput } from '@/common/types/database.types';

@Controller('customer-success-owned-customers')
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class CustomerSuccessOwnedCustomersController {
  constructor(
    private readonly csOwnedCustomersService: CustomerSuccessOwnedCustomersService,
  ) {}

  /**
   * GET /customer-success-owned-customers
   * Get all CS rep assignments, optionally filtered by userId or customerId
   *
   * Query params:
   * - userId: Filter by CS rep user ID
   * - customerId: Filter by customer ID
   */
  @Get()
  @Permissions('customer:read')
  async findAll(
    @Query('userId') userId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.csOwnedCustomersService.findAll({ userId, customerId });
  }

  /**
   * GET /customer-success-owned-customers/check
   * Check if a CS rep is assigned to a customer
   *
   * Query params:
   * - userId: CS rep user ID
   * - customerId: Customer ID
   */
  @Get('check')
  @Permissions('customer:read')
  async checkAssignment(
    @Query('userId') userId: string,
    @Query('customerId') customerId: string,
  ) {
    const isAssigned = await this.csOwnedCustomersService.isAssigned(
      userId,
      customerId,
    );
    return { isAssigned };
  }

  /**
   * GET /customer-success-owned-customers/:id
   * Get a specific CS rep assignment by ID
   */
  @Get(':id')
  @Permissions('customer:read')
  async findOne(@Param('id') id: string) {
    return this.csOwnedCustomersService.findOne(id);
  }

  /**
   * POST /customer-success-owned-customers
   * Assign a CS rep to a customer
   */
  @Post()
  @Permissions('customer:write')
  async create(@Body() data: CreateCustomerSuccessOwnedCustomerInput) {
    return this.csOwnedCustomersService.create(data);
  }

  /**
   * DELETE /customer-success-owned-customers/:id
   * Remove a CS rep assignment by ID
   */
  @Delete(':id')
  @Permissions('customer:delete')
  async remove(@Param('id') id: string) {
    await this.csOwnedCustomersService.remove(id);
    return { message: 'Assignment removed successfully' };
  }

  /**
   * DELETE /customer-success-owned-customers
   * Remove assignment by userId and customerId (query params)
   *
   * Query params:
   * - userId: CS rep user ID
   * - customerId: Customer ID
   */
  @Delete()
  @Permissions('customer:delete')
  async removeByUserAndCustomer(
    @Query('userId') userId: string,
    @Query('customerId') customerId: string,
  ) {
    await this.csOwnedCustomersService.removeByUserAndCustomer(
      userId,
      customerId,
    );
    return { message: 'Assignment removed successfully' };
  }
}
