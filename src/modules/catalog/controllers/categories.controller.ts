import { Controller, Get, Param, Query } from "@nestjs/common";
import { CatalogService } from "../services/catalog.service";
import { ListCategoriesQueryDto } from "../dto/list-categories-query.dto";
import { ListCategoryAttributesQueryDto } from "../dto/list-category-attributes-query.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly catalogService: CatalogService) {}

  // Endpoint public cho FE lấy danh mục theo cấp, parent hoặc từ khóa tìm kiếm.
  @Get()
  listCategories(@Query() query: ListCategoriesQueryDto) {
    return this.catalogService.listCategories(query);
  }

  // Endpoint public cho FE lấy chi tiết một ngành hàng đã chọn.
  @Get(":id")
  getCategory(@Param("id") id: string) {
    return this.catalogService.getCategoryById(id);
  }

  // Endpoint public cho màn hình seller/product lấy bộ thuộc tính cần nhập.
  @Get(":id/attributes")
  listCategoryAttributes(
    @Param("id") id: string,
    @Query() query: ListCategoryAttributesQueryDto,
  ) {
    return this.catalogService.listCategoryAttributes(id, query);
  }
}

