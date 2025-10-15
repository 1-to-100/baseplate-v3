import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { UserStatusList } from '@/common/constants/status';
import { User } from '@/common/decorators/user.decorator';
import { UserSystemRolesList } from '@/common/constants/user-system-roles';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { CustomersService } from '@/customers/customers.service';
import { RolesService } from '@/roles/roles.service';
import { ManagersService } from '@/managers/managers.service';
import { SubscriptionsService } from '@/subscriptions/subscriptions.service';
import { OutputTaxonomyDto } from '@/taxonomies/dto/output-taxonomy.dto';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { NotificationTypeList } from '@/notifications/constants/notification-types';
import { NotificationChannelList } from '@/notifications/constants/notification-channel';
import { OutputNotificationsTaxonomyDto } from '@/taxonomies/dto/output-notifications-taxonomy.dto';
import { isSystemAdministrator } from '@/common/utils/user-role-helpers';

@Controller('taxonomies')
@UseGuards(DynamicAuthGuard, ImpersonationGuard)
export class TaxonomiesController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly rolesService: RolesService,
    private readonly managersService: ManagersService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('/customers')
  @ApiOkResponse({
    description: 'Customers',
    type: OutputTaxonomyDto,
  })
  findAllCustomers(@User() user: OutputUserDto) {
    let customerId: number | null = 0;
    if (!isSystemAdministrator(user)) {
      customerId = user.customerId ?? 0;
    } else {
      customerId = null;
    }
    return this.customersService.getForTaxonomy(customerId);
  }

  @Get('/roles')
  @ApiOkResponse({
    description: 'Roles',
    type: OutputTaxonomyDto,
  })
  findAllRoles() {
    return this.rolesService.getForTaxonomy();
  }

  @Get('/managers')
  @ApiOkResponse({
    description: 'Managers',
    type: [OutputTaxonomyDto],
  })
  async findAllManagers() {
    return this.managersService.getForTaxonomy();
  }

  @Get('/subscriptions')
  @ApiOkResponse({
    description: 'Subscriptions',
    type: [OutputTaxonomyDto],
  })
  async findAllSubscriptions() {
    return this.subscriptionsService.getForTaxonomy();
  }

  @Get('/statuses')
  @ApiOkResponse({
    description: 'Statuses',
    type: [String],
  })
  statuses() {
    return UserStatusList;
  }

  @Get('/user-system-roles')
  @ApiOkResponse({
    description: 'User System Roles',
    type: [String],
    example: { types: NotificationTypeList, channels: NotificationChannelList },
  })
  userSystemRoles() {
    return UserSystemRolesList;
  }

  @Get('/notifications')
  @ApiOkResponse({
    description: 'Notifications',
    type: OutputNotificationsTaxonomyDto,
  })
  notifications() {
    return {
      types: NotificationTypeList,
      channels: NotificationChannelList,
    };
  }
}
