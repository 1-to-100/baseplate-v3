import { SetMetadata } from '@nestjs/common';

export const SUPERUSER_KEY = 'superuser';
export const RequiredSuperUser = (...level: string[]) =>
  SetMetadata(SUPERUSER_KEY, level);
