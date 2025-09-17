import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SystemModulesService } from '@/system-modules/system-modules.service';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';

@Controller('system-modules')
export class SystemModulesController {
  constructor(
    private readonly systemModulesService: SystemModulesService,
    private readonly prisma: PrismaService,
    private readonly frontendPathsService: FrontendPathsService,
  ) {}

  @Get()
  findAll() {
    return this.systemModulesService.getAllModules();
  }

  @Get('seed')
  async seed(
    @Query('removeCustomers') removeCustomers?: boolean,
    @Query('resetRoles') resetRoles?: boolean,
  ) {
    if (resetRoles) {
      await this.prisma.user.updateMany({
        where: {},
        data: { roleId: null },
      });
      console.log(`✅ roles removed from users`);
      await this.prisma.rolePermission.deleteMany();
      console.log(`✅ permissions unassigned from roles`);
      await this.prisma.permission.deleteMany();
      console.log(`✅ old permissions deleted`);
      await this.prisma.role.deleteMany();
      console.log(`✅ old roles deleted`);
    }

    const modules = this.systemModulesService.getAllModules();

    const flatPermissions = modules.flatMap((mod) =>
      (mod.permissions ?? []).map((perm) => ({
        name: perm.name, // e.g. 'createUser:own'
        label: perm.label, // e.g. 'Create User (Own)'
      })),
    );

    for (const p of flatPermissions) {
      await this.prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: {
          name: p.name,
          label: p.label,
        },
      });
    }

    console.log(
      `✅ Seed завершено: створено ${flatPermissions.length} permission(s)`,
    );

    // add subscriptions
    const subscriptions = ['Basic', 'Premium', 'Enterprise'];
    for (const subscription of subscriptions) {
      await this.prisma.subscription.upsert({
        where: { name: subscription },
        update: {},
        create: {
          name: subscription,
        },
      });
    }

    console.log(`✅ Seed завершено: створені subscriptions `, subscriptions);

    if (removeCustomers) {
      await this.prisma.user.updateMany({
        where: { customerId: { not: null } },
        data: { customerId: null },
      });

      const customers = await this.prisma.customer.findMany();
      for (const customer of customers) {
        await this.prisma.customer.delete({
          where: { id: customer.id },
        });
      }
      console.log(`✅ Видалено ${customers.length} customers`);
    }
    return { message: 'ok' };
  }

  @Get('test')
  test() {
    // const result: { id: string | null; email_confirmed_at: string | null }[] =
    //   await this.prisma
    //     .$queryRaw`SELECT * FROM auth.users WHERE email = 'alina.shevchuk+67213@huboxt.com';`;

    return {
      status: 'ok',
      frontendUrl: this.frontendPathsService.getFrontendUrl(),
    };
  }
}
