import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@/common/decorators/user.decorator';
import { CustomerId } from '@/common/decorators/customer-id.decorator';
import { CustomersService } from '@/customers/customers.service';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { CreateCustomerDto } from '@/customers/dto/create-customer.dto';
import { ListCustomersInputDto } from '@/customers/dto/list-customers-input.dto';
import { UpdateCustomerDto } from '@/customers/dto/update-customer.dto';

@Controller('customers')
@UseGuards(DynamicAuthGuard, ImpersonationGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(
    @User() user: OutputUserDto,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    if (!user.isSuperadmin) {
      throw new ForbiddenException('You have no access to customers.');
    }
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll(
    @Query() listCustomersInputDto: ListCustomersInputDto,
    @User() user: OutputUserDto,
    @CustomerId() customerId?: string,
  ) {
    if (!(user.isSuperadmin || user.isCustomerSuccess)) {
      throw new ForbiddenException('You have no access to customers.');
    }

    if (user.isCustomerSuccess && user.customerId) {
      listCustomersInputDto.id = [user.customerId];
    } else if (user.isCustomerSuccess && !user.customerId) {
      throw new ForbiddenException('You have no access to customers.');
    }

    if (customerId) {
      listCustomersInputDto.id = [+customerId];
    }

    return this.customersService.findAll(listCustomersInputDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @User() user: OutputUserDto) {
    if (!(user.isSuperadmin || user.isCustomerSuccess)) {
      throw new ForbiddenException('You have no access to customers.');
    }

    if (user.isCustomerSuccess && user.customerId != +id) {
      throw new ForbiddenException('You have no access to customers.');
    }

    return this.customersService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @User() user: OutputUserDto,
  ) {
    if (!user.isSuperadmin) {
      throw new ForbiddenException('You have no access to customers.');
    }
    return this.customersService.update(+id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() user: OutputUserDto) {
    if (!user.isSuperadmin) {
      throw new ForbiddenException('You have no access to customers.');
    }
    return this.customersService.remove(+id);
  }
}
