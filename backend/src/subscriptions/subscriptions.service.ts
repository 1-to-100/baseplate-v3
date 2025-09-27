import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly database: DatabaseService) {}

  async getForTaxonomy() {
    return this.database.findMany('subscriptions', {
      select: 'id, name, description',
    });
  }
}
