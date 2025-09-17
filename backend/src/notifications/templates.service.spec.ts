import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from './templates.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { Logger } from '@nestjs/common';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: PrismaService,
          useValue: {
            notificationTemplate: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of notification templates', async () => {
      const mockTemplates = [
        {
          id: 1,
          title: 'Test Template 1',
          message: 'Message 1',
          type: ['IN_APP'],
          comment: null,
          channel: 'EMAIL',
          customerId: null,
          Customer: null,
          createdAt: new Date(),
          deletedAt: null,
        },
      ];

      (
        prismaService.notificationTemplate.findMany as jest.Mock
      ).mockResolvedValue(mockTemplates);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (prismaService.notificationTemplate as any).count = jest
        .fn()
        .mockResolvedValue(1);

      const query = { page: 1, perPage: 10 };
      const result = await service.findAll(query);

      expect(result.data).toEqual([
        {
          id: 1,
          title: 'Test Template 1',
          message: 'Message 1',
          type: ['IN_APP'],
          comment: undefined,
          channel: 'EMAIL',
          customerId: undefined,
          Customer: null,
          createdAt: mockTemplates[0].createdAt,
        },
      ]);
      expect(result.meta).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.notificationTemplate.findMany).toHaveBeenCalled();
    });
  });
});
