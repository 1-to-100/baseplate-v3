import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';

@Injectable()
export class TaxonomiesService {
  constructor(private readonly database: DatabaseService) {}

  private readonly logger = new Logger(TaxonomiesService.name);
}
