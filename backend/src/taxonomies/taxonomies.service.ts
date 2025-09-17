import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class TaxonomiesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(TaxonomiesService.name);
}
