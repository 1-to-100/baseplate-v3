import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ArticleCategoriesService } from './article-categories.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ArticleCategoryDto } from './dto/article-category.dto';
import { UpdateArticleCategoryDto } from './dto/update-article-category.dto';
import { OutputArticleCategoryDto } from './dto/output-article-category.dto';

describe('ArticleCategoriesService', () => {
  let service: ArticleCategoriesService;
  let prismaService: PrismaService;

  const mockCategory: OutputArticleCategoryDto = {
    id: 1,
    name: 'Test Category',
    subcategory: 'Test Subcategory',
    about: 'Test description',
    icon: 'test-icon',
  };

  const mockCreateDto: ArticleCategoryDto = {
    name: 'Test Category',
    subcategory: 'Test Subcategory',
    about: 'Test description',
    icon: 'test-icon',
    customerId: 1,
    createdBy: 1,
  };

  const mockUpdateDto: UpdateArticleCategoryDto = {
    name: 'Updated Category',
    about: 'Updated description',
  };

  const mockPrismaService = {
    articleCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleCategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ArticleCategoriesService>(ArticleCategoriesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a new article category successfully', async () => {
      mockPrismaService.articleCategory.create.mockResolvedValue(mockCategory);

      const result = await service.create(mockCreateDto);

      expect(mockPrismaService.articleCategory.create).toHaveBeenCalledWith({
        data: mockCreateDto,
      });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findAll', () => {
    it('should return all categories for a customer', async () => {
      const customerId = 1;
      const mockCategoriesWithCount = [
        {
          ...mockCategory,
          _count: { Articles: 5 },
        },
      ];

      mockPrismaService.articleCategory.findMany.mockResolvedValue(
        mockCategoriesWithCount,
      );

      const result = await service.findAll(customerId);

      expect(mockPrismaService.articleCategory.findMany).toHaveBeenCalledWith({
        where: { customerId },
        include: {
          _count: {
            select: {
              Articles: true,
            },
          },
        },
      });
      expect(result).toEqual(mockCategoriesWithCount);
    });

    it('should return empty array when no categories found', async () => {
      const customerId = 1;
      mockPrismaService.articleCategory.findMany.mockResolvedValue([]);

      const result = await service.findAll(customerId);

      expect(result).toEqual([]);
    });
  });

  describe('findAllSubcategories', () => {
    it('should return all unique subcategories for a customer', async () => {
      const customerId = 1;
      const mockSubcategories = [
        { subcategory: 'Subcategory 1' },
        { subcategory: 'Subcategory 2' },
        { subcategory: 'Subcategory 3' },
      ];

      mockPrismaService.articleCategory.findMany.mockResolvedValue(
        mockSubcategories,
      );

      const result = await service.findAllSubcategories(customerId);

      expect(mockPrismaService.articleCategory.findMany).toHaveBeenCalledWith({
        where: {
          customerId,
          subcategory: {
            not: null,
          },
        },
        select: { subcategory: true },
        distinct: ['subcategory'],
        orderBy: { subcategory: 'asc' },
      });
      expect(result).toEqual([
        'Subcategory 1',
        'Subcategory 2',
        'Subcategory 3',
      ]);
    });

    it('should return empty array when no subcategories found', async () => {
      const customerId = 1;
      mockPrismaService.articleCategory.findMany.mockResolvedValue([]);

      const result = await service.findAllSubcategories(customerId);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an article category successfully', async () => {
      const id = 1;
      const customerId = 1;
      const updatedCategory = { ...mockCategory, ...mockUpdateDto };

      mockPrismaService.articleCategory.update.mockResolvedValue(
        updatedCategory,
      );

      const result = await service.update(id, mockUpdateDto, customerId);

      expect(mockPrismaService.articleCategory.update).toHaveBeenCalledWith({
        where: { id, customerId },
        data: mockUpdateDto,
      });
      expect(result).toEqual(updatedCategory);
    });
  });

  describe('remove', () => {
    it('should delete an article category successfully', async () => {
      const id = 1;
      const customerId = 1;

      mockPrismaService.articleCategory.delete.mockResolvedValue(mockCategory);

      const result = await service.remove(id, customerId);

      expect(mockPrismaService.articleCategory.delete).toHaveBeenCalledWith({
        where: {
          id,
          customerId,
        },
      });
      expect(result).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should find and return a category by id and customerId', async () => {
      const id = 1;
      const customerId = 1;
      const categoryWithCount = {
        ...mockCategory,
        _count: { Articles: 3 },
      };

      mockPrismaService.articleCategory.findFirstOrThrow.mockResolvedValue(
        categoryWithCount,
      );

      const result = await service.findOne(id, customerId);

      expect(
        mockPrismaService.articleCategory.findFirstOrThrow,
      ).toHaveBeenCalledWith({
        where: { id, customerId },
        include: {
          _count: {
            select: {
              Articles: true,
            },
          },
        },
      });
      expect(result).toEqual(categoryWithCount);
    });

    it('should throw NotFoundException when category not found', async () => {
      const id = 999;
      const customerId = 1;
      const error = new Error('Record not found');

      mockPrismaService.articleCategory.findFirstOrThrow.mockRejectedValue(
        error,
      );

      await expect(service.findOne(id, customerId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(id, customerId)).rejects.toThrow(
        'Category not found',
      );
    });
  });
});
