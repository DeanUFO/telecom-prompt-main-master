/**
 * Agent 客户端服务
 * 用于前端与后端 Agent API 通信
 */

import { Domain } from '../types';

export interface AgentCallOptions {
  domain: Domain;
  userInput: string;
  customApiKey?: string;
  thinkingMode?: boolean;
  preferredModels?: string[];
  modelCount?: number;
  parallelExecution?: boolean;
  useCache?: boolean;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  ok: boolean;
  result?: {
    taskId: string;
    domain: Domain;
    originalPrompt: string;
    responses: any[];
    summary: string;
    consensus?: string;
    divergences?: string[];
    generatedAt: number;
    executionTimeMs: number;
  };
  cacheStats?: {
    total: number;
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  error?: string;
}

export interface AIModel {
  name: string;
  id: string;
  type: string;
  strengths: string[];
  capabilities: {
    reasoning: number;
    creativity: number;
    accuracy: number;
    speed: number;
  };
}

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * Agent 客户端
 */
export class AgentClient {
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  /**
   * 调用 Agent 处理请求
   */
  async call(options: AgentCallOptions): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.serverUrl}/api/agent/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('[AgentClient] Call error:', error);
      return {
        ok: false,
        error: error.message || '与 Agent 通信失败',
      };
    }
  }

  /**
   * 流式调用 Agent（使用 Server-Sent Events）
   */
  async *streamCall(options: AgentCallOptions): AsyncGenerator<any, void, unknown> {
    try {
      const response = await fetch(`${this.serverUrl}/api/agent/call-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value);
        const lines = buffer.split('\n');

        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data;
            } catch (e) {
              console.error('[AgentClient] Parse error:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('[AgentClient] Stream error:', error);
      throw error;
    }
  }

  /**
   * 获取可用的 AI 模型列表
   */
  async getAvailableModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/agent/models`);
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('[AgentClient] Get models error:', error);
      return [];
    }
  }

  /**
   * 获取 MCP 服务器信息
   */
  async getMCPInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/agent/mcp-info`);
      const data = await response.json();
      return data.mcp || null;
    } catch (error) {
      console.error('[AgentClient] Get MCP info error:', error);
      return null;
    }
  }

  /**
   * 获取 MCP 工具列表
   */
  async getMCPTools(): Promise<MCPToolInfo[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/agent/mcp-tools`);
      const data = await response.json();
      return data.tools || [];
    } catch (error) {
      console.error('[AgentClient] Get MCP tools error:', error);
      return [];
    }
  }

  /**
   * 调用 MCP 工具
   */
  async callMCPTool(toolName: string, parameters: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/agent/mcp-tool-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolName, parameters }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AgentClient] MCP tool call error:', error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/agent/cache-stats`);
      const data = await response.json();
      return data.stats || null;
    } catch (error) {
      console.error('[AgentClient] Get cache stats error:', error);
      return null;
    }
  }

  /**
   * 清空缓存
   */
  async clearCache(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/agent/clear-cache`, {
        method: 'POST',
      });
      const data = await response.json();
      return data.ok || false;
    } catch (error) {
      console.error('[AgentClient] Clear cache error:', error);
      return false;
    }
  }

  /**
   * 获取执行历史
   */
  async getExecutionHistory(taskId?: string): Promise<any> {
    try {
      const url = new URL(`${this.serverUrl}/api/agent/history`);
      if (taskId) {
        url.searchParams.append('taskId', taskId);
      }
      const response = await fetch(url.toString());
      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('[AgentClient] Get execution history error:', error);
      return [];
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/agent/health`);
      const data = await response.json();
      return data.ok || false;
    } catch (error) {
      console.error('[AgentClient] Health check error:', error);
      return false;
    }
  }
}

// 创建全局 Agent 客户端实例
export const agentClient = new AgentClient();

export default AgentClient;
