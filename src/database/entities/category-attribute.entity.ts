import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { Category } from "./category.entity";
import { CategoryAttributeOption } from "./category-attribute-option.entity";

export enum CategoryAttributeInputType {
  // Người bán nhập một dòng chữ ngắn.
  TEXT = "TEXT",
  // Người bán nhập đoạn mô tả dài hơn một dòng.
  TEXTAREA = "TEXTAREA",
  // Người bán nhập số nguyên.
  INTEGER = "INTEGER",
  // Người bán nhập số thập phân.
  DECIMAL = "DECIMAL",
  // Người bán chọn đúng/sai.
  BOOLEAN = "BOOLEAN",
  // Người bán chọn ngày.
  DATE = "DATE",
  // Người bán chọn cả ngày và giờ.
  DATETIME = "DATETIME",
  // Người bán chọn một giá trị trong danh sách option.
  SINGLE_SELECT = "SINGLE_SELECT",
  // Người bán chọn nhiều giá trị trong danh sách option.
  MULTI_SELECT = "MULTI_SELECT",
}

@Entity("category_attributes")
@Index(["categoryId", "externalAttributeId"], { unique: true })
@Index(["categoryId", "slug"], { unique: true })
export class CategoryAttribute {
  // ID nội bộ của thuộc tính, dùng UUID ổn định từ dữ liệu crawl.
  @PrimaryColumn("uuid")
  id: string;

  // ID danh mục sở hữu thuộc tính này.
  @Column({ name: "category_id", type: "uuid" })
  categoryId: string;

  // Quan hệ đến danh mục để xóa danh mục thì thuộc tính đi kèm cũng được xóa.
  @ManyToOne(() => Category, (category) => category.attributes, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "category_id" })
  category: Category;

  // Thuộc tính cha nếu thuộc tính này chỉ xuất hiện theo điều kiện.
  @Column({ name: "parent_attribute_id", type: "uuid", nullable: true })
  parentAttributeId: string | null;

  // Quan hệ self-reference để gom các thuộc tính điều kiện dưới thuộc tính cha.
  @ManyToOne(() => CategoryAttribute, (attribute) => attribute.children, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "parent_attribute_id" })
  parentAttribute: CategoryAttribute | null;

  // Danh sách thuộc tính con phụ thuộc vào thuộc tính hiện tại.
  @OneToMany(() => CategoryAttribute, (attribute) => attribute.parentAttribute)
  children: CategoryAttribute[];

  // Option kích hoạt thuộc tính điều kiện; null nghĩa là thuộc tính luôn hiển thị.
  @Column({ name: "trigger_option_id", type: "uuid", nullable: true })
  triggerOptionId: string | null;

  // Quan hệ đến option làm điều kiện hiển thị thuộc tính này.
  @ManyToOne(() => CategoryAttributeOption, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "trigger_option_id" })
  triggerOption: CategoryAttributeOption | null;

  // Danh sách giá trị có sẵn nếu inputType là SINGLE_SELECT hoặc MULTI_SELECT.
  @OneToMany(() => CategoryAttributeOption, (option) => option.attribute)
  options: CategoryAttributeOption[];

  // ID thuộc tính từ nguồn crawl, dùng chống trùng theo từng category.
  @Column({ name: "external_attribute_id", type: "varchar", length: 120 })
  externalAttributeId: string;

  // Tên kỹ thuật từ nguồn, thường dùng cho import/debug.
  @Column({ type: "varchar", length: 255 })
  name: string;

  // Tên hiển thị cho người bán trên form đăng sản phẩm.
  @Column({ name: "display_name", type: "varchar", length: 255 })
  displayName: string;

  // Slug của thuộc tính, giúp chống trùng và hỗ trợ URL/filter nếu cần.
  @Column({ type: "varchar", length: 320 })
  slug: string;

  // Kiểu dữ liệu đầu vào để FE biết render input, select, date picker hay textarea.
  @Column({
    name: "input_type",
    type: "varchar",
    length: 40,
    default: CategoryAttributeInputType.TEXT,
  })
  inputType: CategoryAttributeInputType;

  // Bắt buộc người bán nhập thuộc tính này trước khi đăng sản phẩm.
  @Column({ name: "is_required", type: "boolean", default: false })
  isRequired: boolean;

  // Cho phép dùng thuộc tính này làm bộ lọc tìm kiếm sản phẩm.
  @Column({ name: "is_filterable", type: "boolean", default: false })
  isFilterable: boolean;

  // Số option tối đa được chọn khi inputType là MULTI_SELECT.
  @Column({ name: "max_selections", type: "int", nullable: true })
  maxSelections: number | null;

  // Thứ tự hiển thị thuộc tính trên form đăng sản phẩm.
  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  // Bật/tắt thuộc tính mà không cần xóa lịch sử import.
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  // Dữ liệu phụ từ Shopee như validation gốc, regulatory flag hoặc raw mapping.
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  // Thời điểm thuộc tính được tạo trong database local.
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  // Thời điểm thuộc tính được cập nhật gần nhất.
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
