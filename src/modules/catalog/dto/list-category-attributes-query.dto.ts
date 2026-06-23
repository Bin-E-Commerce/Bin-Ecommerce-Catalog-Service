import { Type } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class ListCategoryAttributesQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeOptions = true;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeConditional = true;
}

