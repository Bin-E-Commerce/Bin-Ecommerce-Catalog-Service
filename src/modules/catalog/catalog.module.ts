import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '@/database/entities/category.entity';
import { CategoryAttribute } from '@/database/entities/category-attribute.entity';
import { CategoryAttributeOption } from '@/database/entities/category-attribute-option.entity';
import { CategoriesController } from '@/modules/catalog/presentation/controllers/categories.controller';
import { CatalogService } from '@/modules/catalog/application/services/catalog.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Category,
            CategoryAttribute,
            CategoryAttributeOption,
        ]),
    ],
    controllers: [CategoriesController],
    providers: [CatalogService],
    exports: [CatalogService],
})
export class CatalogModule {}
