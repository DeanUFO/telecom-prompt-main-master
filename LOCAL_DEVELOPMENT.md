# 本機開發指南

此項目由前端（React + Vite）和後端（Express + Node.js）組成。

## 快速啟動

### 1️⃣ 啟動後端伺服器

在**終端 1** 中：

```bash
cd C:\Users\ufo\Downloads\telecom-prompt-main-master
npm run start:server
```

後端會在 `http://localhost:3001` 啟動，顯示可用端點。

### 2️⃣ 啟動前端開發伺服器

在**終端 2** 中：

```bash
cd C:\Users\ufo\Downloads\telecom-prompt-main-master
npm run dev
```

前端會在 `http://localhost:5173` 啟動。

### 3️⃣ 開啟瀏覽器

訪問 `http://localhost:5173`，應該能看到 AI 提示生成系統。

Vite 開發伺服器會自動將 `/api` 請求代理到 `http://localhost:3001`（在 `vite.config.ts` 中配置）。

---

## 功能測試

### Agent 功能
- 點擊「Call Agent」測試 AI 路由和聚合
- 查看多個 AI 模型的回應

### MCP 工具
- 查看可用的 MCP 工具列表
- 執行工具並查看結果

### 快取
- 觀看快取統計信息
- 測試相同提示詞的快取命中

---

## 環境變數（可選）

前端會自動偵測後端 URL：

### 本機開發
- 自動使用 `http://localhost:3001`（透過 Vite proxy）

### 生產部署（GitHub Pages）
- 在 GitHub Secrets 中設定 `BACKEND_URL`（例如 `https://your-api.example.com`）
- CI 會將此值注入為 `VITE_API_URL`

---

## 常見問題

### Q: 後端啟動報錯 `Cannot find module`？
A: 確認已安裝依賴：`npm ci --legacy-peer-deps`

### Q: 前端訪問 API 出現 CORS 錯誤？
A: 確認後端正在執行，且 `vite.config.ts` 中的 proxy 正確指向 `http://localhost:3001`

### Q: 想在生產環境使用不同的後端 URL？
A: 在 GitHub Secrets 設定 `BACKEND_URL`，Actions 會自動注入到前端

---

## 構建與部署

### 本機構建
```bash
npm run build
```

輸出到 `dist/` 目錄。

### 本機預覽
```bash
npm run preview
```

### GitHub Pages 自動部署
- 推送到 `main` 分支時，Actions 自動構建並部署到 GitHub Pages
- URL：`https://DeanUFO.github.io/telecom-prompt-main-master/`

---

## 架構概述

### 前端 (`services/client/agentClient.ts`)
- `AgentClient` 類別提供與後端通信的方法
- 支持流式傳輸（SSE）和快取

### 後端 (`server/index.js`)
- Express 伺服器運行在 port 3001
- 提供 10+ API 端點
- 支持 CORS

### Agent 服務 (`services/agent/TelecomAIAgent.ts`)
- 統一的 AI Agent 類別
- 支持並行/順序執行
- 集成 MCP、路由、快取

### MCP 伺服器 (`services/mcp/mcpServer.ts`)
- 定義 4 個 MCP 工具
- 支持提示詞模板和資源

### 快取層 (`services/cache/cacheManager.ts`)
- 多層快取（L1 記憶體 + L2 localStorage）
- 自動過期管理

---

有任何問題，請查看 `AGENT_MCP_INTEGRATION.md` 和 `QUICK_START.md`。
