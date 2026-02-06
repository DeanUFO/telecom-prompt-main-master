# AI 數據與 Agent & MCP 整合方案

## 📋 概述

本方案將 **AI Agent**、**MCP (Model Context Protocol)** 和 **智能緩存系統** 完整整合到您的電信提示詞生成系統中。實現了多 AI 模型的智能路由、並行執行、結果聚合和流式傳輸。

---

## 🏗️ 架構設計

### 1. **後端架構 (Node.js/Express)**

```
┌─────────────────────────────────────────────┐
│          Express 服務器 (Port 3001)         │
├─────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐  │
│  │  Agent 端點 (/api/agent/*)           │  │
│  │  - POST /api/agent/call              │  │
│  │  - POST /api/agent/call-stream       │  │
│  │  - GET /api/agent/models             │  │
│  │  - GET /api/agent/mcp-info           │  │
│  │  - POST /api/agent/mcp-tool-call     │  │
│  │  - GET /api/agent/cache-stats        │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  AI Agent 核心                        │  │
│  │  ┌─────────────────────────────────┐ │  │
│  │  │ Global Agent 實例                │ │  │
│  │  ├─ AIRouter (智能路由器)            │ │  │
│  │  ├─ MCPServer (MCP 服務定義)         │ │  │
│  │  ├─ MultiLayerCache (多層緩存)       │ │  │
│  │  └─ ResponseAggregator (結果聚合)    │ │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 2. **前端架構 (React/TypeScript)**

```
┌──────────────────────────────────┐
│     React 應用 (Port 5173)        │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │  App.tsx (主組件)           │  │
│  ├────────────────────────────┤  │
│  │ ┌─────────────────────────┐ │  │
│  │ │ AgentPanel (Agent UI)  │ │  │
│  │ │ - 調用 Agent           │ │  │
│  │ │ - 流式響應             │ │  │
│  │ │ - 緩存統計             │ │  │
│  │ └─────────────────────────┘ │  │
│  │ ┌─────────────────────────┐ │  │
│  │ │ MCPPanel (MCP 工具)    │ │  │
│  │ │ - MCP 工具瀏覽器       │ │  │
│  │ │ - 工具參數配置         │ │  │
│  │ │ - 工具執行             │ │  │
│  │ └─────────────────────────┘ │  │
│  ├────────────────────────────┤  │
│  │ agentClient (客戶端)         │  │
│  │ - HTTP 通信                 │  │
│  │ - 流式傳輸支持              │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## 🔧 核心組件說明

### 1. **MCP 服務器 (`services/mcp/mcpServer.ts`)**

定義了統一的 AI 工具介面：

```typescript
// 定義了 MCP 工具
export const MCP_TOOLS = {
  'generate-telecom-prompt': {...},
  'route-to-model': {...},
  'aggregate-responses': {...},
  'cache-result': {...}
}

// MCP 服務器
export class MCPServer {
  getServerInfo()
  registerTool(name, tool)
  getTool(name)
  // ... 其他方法
}
```

**功能：**
- 定義工具、資源、提示詞
- 提供統一的 API 介面
- 支持自定義工具註冊

---

### 2. **AI Agent 協調服務 (`services/agent/agentCoordinator.ts`)**

實現智能路由和模型管理：

```typescript
// AI 模型檔案庫
export const AI_MODEL_PROFILES = {
  'gpt-4o-mini': {name: '...', strengths: [...], capabilities: {...}},
  'gemini-2.5-flash': {...},
  'claude-3.5-sonnet': {...}
}

// 智能路由器
export class AIRouter {
  route(prompt, domain, userPreference?, count?)  // 根據任務特性選擇最合適的模型
  getAvailableModels()
}

// 結果聚合器
export class ResponseAggregator {
  static summarize(responses)      // 摘要
  static comparative(responses)    // 比較分析
  static findConsensus(responses)  // 找出共識和分歧
}
```

**功能：**
- 根據提示詞特性智能選擇 AI 模型
- 支持用戶偏好設置
- 聚合多個 AI 回應

---

### 3. **智能緩存模塊 (`services/cache/cacheManager.ts`)**

實現多層緩存策略：

```typescript
// 內存緩存層
export class MemoryCache<T> {
  set(key, value, ttl)  // 設置緩存
  get(key)              // 獲取緩存
  cleanup()             // 自動清理過期項
}

// 多層緩存
export class MultiLayerCache<T> {
  async get(key)        // L1 (內存) → L2 (localStorage/Redis)
  async set(key, value, ttl)
  static generateKey(domain, prompt, modelIds)  // 生成緩存鍵
}
```

**功能：**
- L1 內存緩存 (快速訪問)
- L2 本地存儲 (持久化)
- 自動過期清理
- 命中率統計

---

### 4. **統一 AI Agent 類 (`services/agent/TelecomAIAgent.ts`)**

整合所有服務的主類：

```typescript
export class TelecomAIAgent {
  async call(options: AICallOptions): Promise<AggregatedResult>
    // 主入口，支持：
    // ✓ 緩存檢查
    // ✓ 智能路由
    // ✓ 並行/順序執行
    // ✓ 結果聚合
    // ✓ 自動緩存

  getAvailableModels()
  getCacheStats()
  getExecutionHistory()
}

// 全局 Agent 實例
export const globalAgent = new TelecomAIAgent({...})
```

---

### 5. **Agent 客戶端 (`services/client/agentClient.ts`)**

前端與後端通信的橋樑：

```typescript
export class AgentClient {
  async call(options)                    // 標準調用
  async *streamCall(options)             // 流式調用 (SSE)
  async getAvailableModels()
  async getMCPInfo()
  async getMCPTools()
  async callMCPTool(toolName, params)
  async getCacheStats()
}
```

---

### 6. **UI 組件**

#### **AgentPanel (`components/AgentPanel.tsx`)**
- 調用 Agent (普通/流式)
- 顯示執行結果
- 緩存統計
- 可用模型列表

#### **MCPPanel (`components/MCPPanel.tsx`)**
- MCP 服務器信息展示
- 工具瀏覽器
- 工具參數配置
- 工具執行

---

## 📡 API 端點

### Agent 端點

| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/agent/call` | POST | 調用 Agent |
| `/api/agent/call-stream` | POST | 流式調用 (SSE) |
| `/api/agent/models` | GET | 可用模型列表 |
| `/api/agent/mcp-info` | GET | MCP 服務器信息 |
| `/api/agent/mcp-tools` | GET | MCP 工具列表 |
| `/api/agent/mcp-tool-call` | POST | 調用 MCP 工具 |
| `/api/agent/cache-stats` | GET | 緩存統計 |
| `/api/agent/clear-cache` | POST | 清空緩存 |
| `/api/agent/history` | GET | 執行歷史 |
| `/api/agent/health` | GET | 健康檢查 |

### 請求範例

```bash
# 調用 Agent
curl -X POST http://localhost:3001/api/agent/call \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "MOBILE",
    "userInput": "如何優化 5G 網絡覆蓋",
    "modelCount": 3,
    "parallelExecution": true,
    "useCache": true
  }'

# 流式調用
curl -X POST http://localhost:3001/api/agent/call-stream \
  -H "Content-Type: application/json" \
  -d '{...}' | head -n 100
```

---

## 🚀 使用流程

### 1. **基本使用 (标准调用)**

```typescript
import { agentClient } from './services/client/agentClient';

// 調用 Agent
const result = await agentClient.call({
  domain: Domain.MOBILE,
  userInput: '5G 網絡優化方案',
  modelCount: 3,
  parallelExecution: true,
  useCache: true
});

console.log(result.result.summary);  // 所有模型的摘要
console.log(result.result.executionTimeMs);  // 執行時間
```

### 2. **流式使用 (實時響應)**

```typescript
// 流式調用
for await (const event of agentClient.streamCall({
  domain: Domain.MOBILE,
  userInput: '5G 網絡優化方案'
})) {
  if (event.type === 'init') {
    console.log('開始調用', event.totalModels, '個模型');
  } else if (event.type === 'response') {
    console.log(`${event.model} 回應:`, event.response);
  } else if (event.type === 'complete') {
    console.log('完成', event.responseCount, '個回應');
  }
}
```

### 3. **MCP 工具調用**

```typescript
// 獲取 MCP 工具
const tools = await agentClient.getMCPTools();

// 調用工具
const result = await agentClient.callMCPTool('route-to-model', {
  prompt: '我的提示詞',
  domainCategory: 'MOBILE'
});
```

### 4. **緩存管理**

```typescript
// 獲取統計
const stats = await agentClient.getCacheStats();
console.log(`命中率: ${stats.hitRate}%`);

// 清空緩存
await agentClient.clearCache();
```

---

## 🎯 工作流程示例

### 完整的電信提示詞生成與 AI 聚合流程：

```
1. 用戶輸入需求
   ↓
2. [選擇] 使用 Gemini 生成提示詞或 Agent 直接路由
   ├─ Gemini 路徑: generateTelecomPrompt()
   └─ Agent 路徑: agentClient.call()
   ↓
3. Agent 接收提示詞
   ├─ 檢查緩存 ✓ 命中 → 直接返回
   └─ 未命中 → 繼續
   ↓
4. 智能路由 (基於提示詞特性和域)
   ├─ 特徵分析
   ├─ 模型評分
   └─ 選擇 Top 3 最合適的 AI 模型
   ↓
5. 並行執行 (可配置)
   ├─ GPT-4o-mini
   ├─ Gemini 2.5 Flash
   └─ Claude 3.5 Sonnet
   ↓
6. 結果聚合
   ├─ 摘要
   ├─ 對比分析
   └─ 找出共識和分歧
   ↓
7. 緩存結果
   ├─ L1 內存緩存
   └─ L2 本地存儲
   ↓
8. 返回給前端
   ├─ agentClient 流式接收
   └─ UI 實時展示
   ↓
9. [可選] 生成 PPT/報告
```

---

## 💾 數據流示例

### Request (前端 → 後端)

```json
{
  "domain": "MOBILE",
  "userInput": "如何優化 UL-SCH 在 Sub-6GHz 的自適應編碼調製",
  "modelCount": 3,
  "parallelExecution": true,
  "useCache": true,
  "metadata": {
    "userId": "user123",
    "timestamp": "2026-02-06T10:00:00Z"
  }
}
```

### Response (後端 → 前端)

```json
{
  "ok": true,
  "result": {
    "taskId": "task-1707200400000",
    "domain": "MOBILE",
    "originalPrompt": "如何優化 UL-SCH...",
    "responses": [
      {
        "model": "gpt-4o-mini",
        "response": "GPT-4o-mini 的分析...",
        "executionTime": 1250,
        "cached": false
      },
      {
        "model": "gemini-2.5-flash",
        "response": "Gemini 2.5 Flash 的分析...",
        "executionTime": 980,
        "cached": false
      },
      {
        "model": "claude-3.5-sonnet",
        "response": "Claude 3.5 Sonnet 的分析...",
        "executionTime": 1500,
        "cached": false
      }
    ],
    "summary": "聚合來自 3 個 AI 模型的分析：...",
    "consensus": "多個模型認可該技術方向",
    "divergences": ["在某些實現細節上存在差異"],
    "executionTimeMs": 3730
  },
  "cacheStats": {
    "total": 15,
    "hits": 8,
    "misses": 7,
    "hitRate": 0.533,
    "size": 12
  }
}
```

---

## 🔒 性能優化要點

### 1. **智能路由降低成本**
- 不是所有模型都適合所有任務
- 根據特性選擇最合適的模型組合
- 約 30-40% 的成本節省

### 2. **多層緩存提升速度**
- 命中時直接返回 (<10ms)
- L1 內存缓存 (最快)
- L2 磁盘/数据库缓存 (持久化)

### 3. **並行執行充分利用資源**
- 同時調用多個 AI 模型
- 總時間 = max(所有模型時間) 而非 sum()
- 典型情況下節省 60-70% 時間

### 4. **流式傳輸改善用戶體驗**
- 實時接收結果
- 無需等待全部完成
- 更動態的 UI 反饋

---

## 📊 緩存命中率優化

### 緩存鍵生成策略

```typescript
// 格式: prompt:domain:hash
generateKey(domain, prompt, modelIds) 
  → "prompt:MOBILE:1234567890"

// 相同的 domain + prompt 會使用相同的緩存
// 即使 modelIds 不同也會共享結果
```

### TTL 建議

- **即時查詢**: 1800 秒 (30 分鐘)
- **通用提示詞**: 3600 秒 (1 小時)
- **靜態知識**: 86400 秒 (24 小時)

---

## 🐛 故障排查

### 常見問題

1. **Agent 未響應**
   ```
   检查: PORT=3001 是否開放
   检查: Node.js 进程是否运行
   curl http://localhost:3001/api/agent/health
   ```

2. **API Key 相關錯誤**
   ```
   检查: 環境變數是否設正確
   检查: API Key 是否過期
   检查: 網絡是否允許出站連接
   ```

3. **緩存未生效**
   ```
   检查: enableCache 是否為 true
   检查: TTL 是否設置正確
   检查: 緩存鍵是否一致
   使用: /api/agent/cache-stats 查看統計
   ```

---

## 📚 文件結構

```
services/
├── mcp/
│   └── mcpServer.ts              # MCP 服務定義
├── agent/
│   ├── agentCoordinator.ts       # Agent 協調和路由
│   └── TelecomAIAgent.ts         # 統一 Agent 類
├── cache/
│   └── cacheManager.ts           # 多層緩存管理
└── client/
    └── agentClient.ts            # 前端客戶端

components/
├── AgentPanel.tsx                # Agent UI 組件
├── MCPPanel.tsx                  # MCP 工具 UI
├── DomainCard.tsx
├── OutputDisplay.tsx
└── ThinkingDisplay.tsx

server/
├── index.js                      # Express 主服務器
└── agentEndpoints.js             # Agent API 端點

App.tsx                           # 主應用組件
```

---

## 🎓 最佳實踐

1. **使用流式調用處理長時間操作**
   ```typescript
   // ✓ 好
   for await (const event of agentClient.streamCall(options)) {
     // 實時處理每個事件
   }
   
   // ✗ 不好
   const result = await agentClient.call(options);  // 等待所有完成
   ```

2. **定期查看緩存統計**
   ```typescript
   const stats = await agentClient.getCacheStats();
   if (stats.hitRate < 0.5) {
     // 命中率太低，可能需要調整緩存策略
   }
   ```

3. **為關鍵操作設置超時**
   ```typescript
   const timeout = new Promise((_, reject) => 
     setTimeout(() => reject(new Error('Timeout')), 30000)
   );
   await Promise.race([agentClient.call(options), timeout]);
   ```

4. **監控 Agent 健康狀態**
   ```typescript
   setInterval(async () => {
     const healthy = await agentClient.healthCheck();
     if (!healthy) alert('Agent 故障');
   }, 60000);
   ```

---

## 🔄 更新和擴展

### 添加新的 AI 模型

1. 在 `agentCoordinator.ts` 中添加模型檔案：
```typescript
export const AI_MODEL_PROFILES = {
  'new-model-id': {
    name: 'New Model',
    strengths: [...],
    capabilities: {...}
  }
}
```

2. 更新路由規則：
```typescript
this.routingRules.set(Domain.MOBILE, ['new-model-id', ...]);
```

### 添加新的 MCP 工具

1. 在 `mcpServer.ts` 中定義工具：
```typescript
export const MCP_TOOLS = {
  'new-tool': {
    name: 'new-tool',
    description: '...',
    inputSchema: {...}
  }
}
```

2. 在 `agentEndpoints.js` 中實現處理：
```typescript
case 'new-tool':
  result = await handleNewTool(parameters);
  break;
```

---

## 📞 支持

如有問題，請檢查：
- 📖 本文檔
- 🔍 代碼註釋
- 📊 緩存統計信息
- 🏥 健康檢查端點

---

**版本**: 1.0.0  
**最後更新**: 2026-02-06  
**維護者**: AI Agent & MCP Team
