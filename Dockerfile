# 多階段構建：先編譯前端，再啟動後端
FROM node:20-alpine AS builder

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 構建前端
COPY . .
RUN npm run build

# 生產階段：只包含必要的文件
FROM node:20-alpine

WORKDIR /app

# 安裝導演執行工具（用於健康檢查）
RUN apk add --no-cache curl

# 複製 package 文件
COPY package*.json ./

# 只安裝生產依賴 + tsx（用於執行 TypeScript 後端）
RUN npm ci --legacy-peer-deps --omit=dev && npm install --save-dev tsx

# 從 builder 複製已編譯的代碼
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/services ./services

# 暴露端口
EXPOSE 3001

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 啟動後端
CMD ["npm", "run", "start:server"]
