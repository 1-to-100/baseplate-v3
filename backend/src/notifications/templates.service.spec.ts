import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from './templates.service';
import { DatabaseService } from '@/common/database/database.service';
import { NotificationsService } from './notifications.service';
import { Logger } from '@nestjs/common';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let databaseService: DatabaseService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: DatabaseService,
          useValue: {
            notification_templates: {
              select: jest.fn().mockReturnThis(),
              insert: jest.fn().mockReturnThis(),
              update: jest.fn().mockReturnThis(),
              delete: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              is: jest.fn().mockReturnThis(),
              overlaps: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              range: jest.fn().mockReturnThis(),
              single: jest.fn(),
            },
            users: {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              is: jest.fn().mockReturnThis(),
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
    databaseService = module.get<DatabaseService>(DatabaseService);
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
          type: ['in_app'],
          comment: null,
          channel: 'email',
          customerId: null,
          Customer: null,
          createdAt: new Date(),
          deletedAt: null,
        },
      ];

      // Mock the count query
      jest
        .spyOn(databaseService.notification_templates, 'select')
        .mockReturnValueOnce({
          ...databaseService.notification_templates,
          is: jest.fn().mockResolvedValue({ count: 1 }),
        } as any);

      // Mock the data query
      const mockQuery = {
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              title: 'Test Template 1',
              message: 'Message 1',
              type: ['in_app'],
              comment: null,
              channel: 'email',
              customer_id: null,
              customers: null,
              created_at: '2023-01-01T00:00:00Z',
              deleted_at: null,
            },
          ],
          error: null,
        }),
      };

      jest
        .spyOn(databaseService.notification_templates, 'select')
        .mockReturnValueOnce(mockQuery as any);

      const query = { page: 1, perPage: 10 };
      const result = await service.findAll(query);

      expect(result.data).toEqual([
        {
          id: 1,
          title: 'Test Template 1',
          message: 'Message 1',
          type: ['in_app'],
          comment: null,
          channel: 'email',
          customerId: null,
          Customer: undefined,
          createdAt: expect.any(Date),
        },
      ]);
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBe(1);
    });
  });
});
