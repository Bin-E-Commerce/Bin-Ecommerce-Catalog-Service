import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Category } from "../../../database/entities/category.entity";
import { CategoryAttribute } from "../../../database/entities/category-attribute.entity";
import { ListCategoriesQueryDto } from "../dto/list-categories-query.dto";
import { ListCategoryAttributesQueryDto } from "../dto/list-category-attributes-query.dto";
import { PaginatedResponse } from "../types/paginated-response.type";

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(CategoryAttribute)
    private readonly attributeRepository: Repository<CategoryAttribute>,
  ) {}

  // Lấy danh sách ngành hàng theo parent/level/search để FE render dropdown hoặc cây danh mục.
  async listCategories(
    query: ListCategoriesQueryDto,
  ): Promise<PaginatedResponse<Category>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const qb = this.categoryRepository
      .createQueryBuilder("category")
      .where("category.isActive = :isActive", { isActive: true });

    if (query.parentId) {
      qb.andWhere("category.parentId = :parentId", { parentId: query.parentId });
    } else if (query.level === undefined && !query.search) {
      // Mặc định trả danh mục gốc để màn hình đăng ký seller không phải tải toàn bộ cây lớn.
      qb.andWhere("category.parentId IS NULL");
    }

    if (query.level !== undefined) {
      qb.andWhere("category.level = :level", { level: query.level });
    }

    if (query.isLeaf !== undefined) {
      qb.andWhere("category.isLeaf = :isLeaf", { isLeaf: query.isLeaf });
    }

    if (query.search?.trim()) {
      qb.andWhere(
        "(LOWER(category.name) LIKE :keyword OR LOWER(category.slug) LIKE :keyword)",
        { keyword: `%${query.search.trim().toLowerCase()}%` },
      );
    }

    const [items, total] = await qb
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.name", "ASC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Lấy một ngành hàng, dùng khi FE cần kiểm tra category đã chọn còn hợp lệ hay không.
  async getCategoryById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, isActive: true },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return category;
  }

  // Lấy thuộc tính của ngành hàng, bao gồm option nếu FE cần render combobox/select.
  async listCategoryAttributes(
    categoryId: string,
    query: ListCategoryAttributesQueryDto,
  ): Promise<CategoryAttribute[]> {
    await this.getCategoryById(categoryId);

    const qb = this.attributeRepository
      .createQueryBuilder("attribute")
      .where("attribute.categoryId = :categoryId", { categoryId })
      .andWhere("attribute.isActive = :isActive", { isActive: true });

    if (!query.includeConditional) {
      qb.andWhere("attribute.parentAttributeId IS NULL");
    }

    if (query.includeOptions) {
      qb.leftJoinAndSelect(
        "attribute.options",
        "option",
        "option.isActive = :optionActive",
        { optionActive: true },
      ).orderBy("attribute.sortOrder", "ASC")
        .addOrderBy("option.sortOrder", "ASC");
    } else {
      qb.orderBy("attribute.sortOrder", "ASC");
    }

    return qb.addOrderBy("attribute.displayName", "ASC").getMany();
  }
}

