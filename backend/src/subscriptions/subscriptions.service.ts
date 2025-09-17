import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForTaxonomy() {
    return this.prisma.subscription.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  }
}
