import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { CategoryAttribute } from "./category-attribute.entity";

@Entity("category_attribute_options")
@Index(["attributeId", "externalValueId"], { unique: true })
@Index(["attributeId", "value"], { unique: true })
export class CategoryAttributeOption {
  // ID nội bộ của option, dùng UUID ổn định từ dữ liệu crawl.
  @PrimaryColumn("uuid")
  id: string;

  // ID thuộc tính sở hữu option này.
  @Column({ name: "attribute_id", type: "uuid" })
  attributeId: string;

  // Quan hệ đến thuộc tính cha; xóa thuộc tính thì option đi kèm cũng được xóa.
  @ManyToOne(() => CategoryAttribute, (attribute) => attribute.options, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "attribute_id" })
  attribute: CategoryAttribute;

  // ID giá trị từ nguồn crawl, dùng chống trùng khi import lại.
  @Column({ name: "external_value_id", type: "varchar", length: 120 })
  externalValueId: string;

  // Giá trị kỹ thuật từ nguồn, thường là tiếng Anh hoặc mã raw.
  @Column({ type: "varchar", length: 255 })
  value: string;

  // Giá trị hiển thị cho người bán trên dropdown/select.
  @Column({ name: "display_value", type: "varchar", length: 255 })
  displayValue: string;

  // Thứ tự hiển thị option trong cùng một thuộc tính.
  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  // Bật/tắt option mà không cần xóa dữ liệu gốc.
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  // Dữ liệu phụ từ nguồn crawl như trạng thái gốc hoặc category_external_id.
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  // Thời điểm option được tạo trong database local.
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  // Thời điểm option được cập nhật gần nhất.
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
