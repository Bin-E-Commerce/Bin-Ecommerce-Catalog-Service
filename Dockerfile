# Catalog Service dùng build context là root repository để dùng lockfile và
# cấu hình TypeScript chung của monorepo. Chỉ source cần thiết của Catalog được
# copy vào image, không kéo theo source của service khác.

# -----------------------------------------------------------------------------
# Giai đoạn build: cài dependency và biên dịch TypeScript.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifest trước source để Docker tái sử dụng layer dependency khi code đổi.
COPY package.json package-lock.json tsconfig.base.json ./
COPY services/catalog-service/package.json services/catalog-service/tsconfig.json services/catalog-service/nest-cli.json ./services/catalog-service/
COPY packages/common ./packages/common

# npm ci giữ dependency đồng nhất với lockfile root; không chạy lifecycle script
# không cần thiết trong lúc tạo image.
RUN npm ci --workspace=services/catalog-service --include=dev --ignore-scripts

# Chỉ copy mã nguồn của Catalog sau khi dependency đã được cache.
COPY services/catalog-service/src ./services/catalog-service/src

# Catalog dùng tsconfig.json hiện có để compile theo rootDir của monorepo.
RUN npx tsc -p services/catalog-service/tsconfig.json

# Loại compiler, Nest CLI và Jest trước khi chuyển node_modules sang runtime.
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Giai đoạn runtime: chỉ giữ JavaScript đã build và production dependency.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Catalog chỉ cần quyền đọc source, mở HTTP và kết nối PostgreSQL.
RUN addgroup -g 1001 -S nodejs \
  && adduser -S nestjs -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/catalog-service/dist/services/catalog-service/src ./dist

# Compose dùng 3003 trong network nội bộ; có thể override PORT khi chạy riêng.
ENV NODE_ENV=production \
  PORT=3003 \
  NODE_OPTIONS=--max-old-space-size=128

EXPOSE 3003

# Catalog bật URI versioning nên health dùng version v1 để Docker/Prometheus
# kiểm tra đúng route thật của service.
# ${PORT} cho phép healthcheck theo đúng port mà runtime đang dùng.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT}/api/v1/health" > /dev/null || exit 1

USER nestjs

# Chạy Node trực tiếp để process nhận SIGTERM đúng khi container được restart.
CMD ["node", "dist/main.js"]
