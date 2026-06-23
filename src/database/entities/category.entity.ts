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
import { CategoryAttribute } from "./category-attribute.entity";

@Entity("categories")
@Index(["sourcePlatform", "externalCategoryId"], { unique: true })
@Index(["sourcePlatform", "slug"], { unique: true })
export class Category {
  // ID nội bộ của danh mục, dùng UUID ổn định từ dữ liệu crawl để import lại không đổi khóa.
  @PrimaryColumn("uuid")
  id: string;

  // ID danh mục cha; null nghĩa là danh mục gốc như "Thời trang", "Điện thoại".
  @Column({ name: "parent_id", type: "uuid", nullable: true })
  parentId: string | null;

  // Quan hệ đến danh mục cha, phục vụ dựng cây ngành hàng nhiều cấp.
  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "parent_id" })
  parent: Category | null;

  // Danh sách danh mục con trực tiếp của danh mục hiện tại.
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  // Bộ thuộc tính sản phẩm cần nhập khi người bán chọn ngành hàng này.
  @OneToMany(() => CategoryAttribute, (attribute) => attribute.category)
  attributes: CategoryAttribute[];

  // Tên hiển thị của danh mục cho người bán/người mua.
  @Column({ type: "varchar", length: 255 })
  name: string;

  // Slug thân thiện URL và dùng làm khóa chống trùng trong cùng source.
  @Column({ type: "varchar", length: 320 })
  slug: string;

  // Cấp của danh mục trong cây; 0 là root, số càng lớn càng sâu.
  @Column({ type: "int" })
  level: number;

  // Đường dẫn đầy đủ của danh mục, ví dụ "Thời Trang > Nam > Áo".
  @Column({ type: "text", nullable: true })
  path: string | null;

  // Ảnh đại diện ngành hàng nếu nguồn crawl có cung cấp.
  @Column({ name: "image_url", type: "text", nullable: true })
  imageUrl: string | null;

  // Thứ tự hiển thị trong cùng một cấp danh mục.
  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  // Đánh dấu danh mục lá; chỉ danh mục lá thường được chọn để đăng sản phẩm.
  @Column({ name: "is_leaf", type: "boolean", default: false })
  isLeaf: boolean;

  // Bật/tắt danh mục mà không cần xóa dữ liệu import.
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  // Nguồn dữ liệu bên ngoài, ví dụ shopee/tiki/lazada để sau này import đa nguồn.
  @Column({ name: "source_platform", type: "varchar", length: 40 })
  sourcePlatform: string;

  // ID danh mục gốc từ nền tảng nguồn, dùng chống trùng khi crawl/import lại.
  @Column({ name: "external_category_id", type: "varchar", length: 80 })
  externalCategoryId: string;

  // Dữ liệu phụ của nguồn crawl không đáng tách thành cột chính.
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  // Thời điểm bản ghi được tạo trong database local.
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  // Thời điểm bản ghi được cập nhật gần nhất do import hoặc admin chỉnh sửa.
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
