import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { SystemModulesService } from '@/system-modules/system-modules.service';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';

@Controller('system-modules')
export class SystemModulesController {
  constructor(
    private readonly systemModulesService: SystemModulesService,
    private readonly database: DatabaseService,
    private readonly frontendPathsService: FrontendPathsService,
  ) {}

  @Get()
  findAll() {
    return this.systemModulesService.getAllModules();
  }

  @Get('seed')
  seed() {
    // TODO: Migrate this method to use DatabaseService
    console.log(
      '⚠️ Seed endpoint temporarily disabled during Supabase migration',
    );
    return {
      message: 'Seed endpoint temporarily disabled during Supabase migration',
      status: 'disabled',
    };
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
