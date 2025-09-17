import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from '@/articles/articles.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { NotificationTypes } from '@/notifications/constants/notification-types';

// Mock the createPaginator function
jest.mock('prisma-pagination', () => ({
  createPaginator: jest.fn(() =>
    jest.fn().mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        perPage: 10,
        total: 0,
        totalPages: 0,
      },
    }),
  ),
}));

const mockCategory = {
  id: 1,
  name: 'Category Name',
  subcategory: 'Cat Sub',
  icon: 'icon.png',
  about: 'About Category',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreator = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
};

const mockArticle = {
  id: 1,
  title: 'Test Article',
  content: 'Test Content',
  status: 'draft',
  customerId: 1,
  createdBy: 1,
  articleCategoryId: 1,
  subcategory: 'Test Subcategory',
  videoUrl: 'http://test.com/video',
  createdAt: new Date(),
  updatedAt: new Date(),
  viewsNumber: 0,
  Category: mockCategory,
  Creator: mockCreator,
};

const mockPublishedArticle = {
  ...mockArticle,
  status: 'published',
};

const mockArticleWithNullRelations = {
  ...mockArticle,
  Category: null,
  Creator: null,
};

const mockPrismaService = {
  article: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

const mockNotificationsService = {
  create: jest.fn(),
};

describe('ArticlesService', () => {
  let service: ArticlesService;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an article and send notification if published', async () => {
      mockPrismaService.article.create.mockResolvedValue(mockPublishedArticle);

      const result = await service.create(mockPublishedArticle);

      expect(prisma.article.create).toHaveBeenCalledWith({
        data: mockPublishedArticle,
      });
      expect(notificationsService.create).toHaveBeenCalledWith({
        title: 'New Article Published',
        message: `A new article "${mockPublishedArticle.title}" has been published.`,
        channel: 'article',
        type: NotificationTypes.IN_APP,
        customerId: mockPublishedArticle.customerId,
        generatedBy: 'system (article service)',
      });
      expect(result).toEqual(mockPublishedArticle);
    });

    it('should create an article without sending notification if not published', async () => {
      mockPrismaService.article.create.mockResolvedValue(mockArticle);

      const result = await service.create(mockArticle);

      expect(prisma.article.create).toHaveBeenCalledWith({
        data: mockArticle,
      });
      expect(notificationsService.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockArticle);
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of articles', async () => {
      const articles = [mockArticle];
      const mockPaginateResult = {
        data: articles,
        meta: {
          page: 1,
          perPage: 10,
          total: 1,
          totalPages: 1,
        },
      };

      // Mock the createPaginator function to return our test data
      const { createPaginator } = require('prisma-pagination');
      createPaginator.mockReturnValue(
        jest.fn().mockResolvedValue(mockPaginateResult),
      );

      const result = await service.findAll(1, { page: 1, perPage: 10 });

      expect(result.data.length).toBe(1);
      expect(result.data[0]).toEqual(service.transform(mockArticle));
      expect(result.meta).toBeDefined();
    });

    it('should filter articles by categoryId, status, and search', async () => {
      const articles = [mockArticle];
      const mockPaginateResult = {
        data: articles,
        meta: {
          page: 1,
          perPage: 10,
          total: 1,
          totalPages: 1,
        },
      };

      // Mock the createPaginator function
      const { createPaginator } = require('prisma-pagination');
      createPaginator.mockReturnValue(
        jest.fn().mockResolvedValue(mockPaginateResult),
      );

      const listArticlesInputDto = {
        page: 1,
        perPage: 10,
        categoryId: [1],
        status: ['draft'],
        search: 'Test',
      };
      const result = await service.findAll(1, listArticlesInputDto);

      expect(result.data.length).toBe(1);
      expect(result.data[0]).toEqual(service.transform(mockArticle));
    });
  });

  describe('findOne', () => {
    it('should return a single article', async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(mockArticle);

      const result = await service.findOne(1, 1);

      expect(prisma.article.findFirst).toHaveBeenCalledWith({
        where: { id: 1, customerId: 1 },
        include: { Category: true, Creator: true },
      });
      expect(result).toEqual(service.transform(mockArticle));
    });

    it('should throw NotFoundException if article not found', async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an article and send notification if status changes to published', async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(mockArticle); // Initial status draft
      mockPrismaService.article.update.mockResolvedValue(mockPublishedArticle); // Updated status published

      const updateDto = { status: 'published' };
      const result = await service.update(1, updateDto, 1);

      expect(prisma.article.findFirst).toHaveBeenCalledWith({
        where: { id: 1, customerId: 1 },
      });
      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
      expect(notificationsService.create).toHaveBeenCalledWith({
        title: 'New Article Published',
        message: `A new article "${mockPublishedArticle.title}" has been published.`,
        channel: 'article',
        type: NotificationTypes.IN_APP,
        customerId: 1,
        generatedBy: 'system (article service)',
      });
      expect(result).toEqual(mockPublishedArticle);
    });

    it('should update an article without sending notification if status does not change to published', async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(mockArticle);
      mockPrismaService.article.update.mockResolvedValue(mockArticle);

      const updateDto = { title: 'Updated Title' };
      const result = await service.update(1, updateDto, 1);

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
      expect(notificationsService.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException if article to update not found', async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(null);

      await expect(service.update(999, {}, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an article', async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(mockArticle);
      mockPrismaService.article.delete.mockResolvedValue(mockArticle);

      const result = await service.remove(1, 1);

      expect(prisma.article.findFirst).toHaveBeenCalledWith({
        where: { id: 1, customerId: 1 },
      });
      expect(prisma.article.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException if article to remove not found', async () => {
      mockPrismaService.article.findFirst.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('transform', () => {
    it('should transform an article object correctly', () => {
      const articleWithRelations = {
        ...mockArticle,
        Category: {
          id: 1,
          name: 'Category Name',
          subcategory: 'Cat Sub',
          icon: 'icon.png',
          about: 'About Category',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        Creator: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const transformed = service.transform(articleWithRelations as any);

      expect(transformed).toEqual({
        id: articleWithRelations.id,
        title: articleWithRelations.title,
        articleCategoryId: articleWithRelations.articleCategoryId,
        subcategory: articleWithRelations.subcategory,
        status: articleWithRelations.status,
        customerId: articleWithRelations.customerId,
        content: articleWithRelations.content,
        videoUrl: articleWithRelations.videoUrl,
        createdAt: articleWithRelations.createdAt,
        updatedAt: articleWithRelations.updatedAt,
        viewsNumber: articleWithRelations.viewsNumber,
        Category: {
          id: articleWithRelations.Category.id,
          name: articleWithRelations.Category.name,
          subcategory: articleWithRelations.Category.subcategory,
          icon: articleWithRelations.Category.icon,
          about: articleWithRelations.Category.about,
          createdAt: articleWithRelations.Category.createdAt,
          updatedAt: articleWithRelations.Category.updatedAt,
        },
        Creator: {
          id: articleWithRelations.Creator.id,
          firstName: articleWithRelations.Creator.firstName,
          lastName: articleWithRelations.Creator.lastName,
        },
      });
    });

    it('should handle null Category and Creator', () => {
      const transformed = service.transform(
        mockArticleWithNullRelations as any,
      );
      expect(transformed.Category).toBeNull();
      expect(transformed.Creator).toBeNull();
    });
  });
});
