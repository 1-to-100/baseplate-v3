import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getPing() {
    return { success: true, system_time: new Date() };
  }
}
