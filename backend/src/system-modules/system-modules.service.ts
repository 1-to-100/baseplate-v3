import { Injectable } from '@nestjs/common';
import { SYSTEM_MODULES } from '@/system-modules/system-modules.data';

@Injectable()
export class SystemModulesService {
  getAllModules() {
    return SYSTEM_MODULES.filter((module) => module.enabled);
  }

  getModuleByName(name: string) {
    return SYSTEM_MODULES.find((module) => module.name === name);
  }
}
