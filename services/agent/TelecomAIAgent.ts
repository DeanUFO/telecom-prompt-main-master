/**
 * 统一的 AI Agent 类
 * 整合 MCP、路由、缓存、聚合等所有功能
 */

import MCPServer from '../mcp/mcpServer';
import { AIRouter, ResponseAggregator, AgentResponse, AggregatedResult, AgentExecutionContext } from './agentCoordinator';
import { MultiLayerCache } from '../cache/cacheManager';
import { Domain } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export interface AgentConfig {
  enableCache: boolean;
  enableParallelExecution: boolean;
  defaultModelCount: number;
  requestTimeout: number;
  maxRetries: number;
}

export interface AICallOptions {
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

/**
 * 主 Agent 类 - 协调所有服务
 */
export class TelecomAIAgent {
  private mcpServer: MCPServer;
  private router: AIRouter;
  private cache: MultiLayerCache;
  private config: AgentConfig;
  private executionHistory: Map<string, AgentExecutionContext>;

  constructor(config: Partial<AgentConfig> = {}) {
    this.mcpServer = new MCPServer();
    this.router = new AIRouter();
    this.cache = new MultiLayerCache(500, true);
    this.executionHistory = new Map();

    this.config = {
      enableCache: true,
      enableParallelExecution: true,
      defaultModelCount: 3,
      requestTimeout: 30000, // 30 秒
      maxRetries: 2,
      ...config,
    };

    console.log('[Agent] 已初始化 TelecomAIAgent');
  }

  /**
   * 执行 AI 调用（主入口）
   */
  async call(options: AICallOptions): Promise<AggregatedResult> {
    const taskId = uuidv4();
    const startTime = Date.now();

    // 创建执行上下文
    const context: AgentExecutionContext = {
      taskId,
      domain: options.domain,
      originalPrompt: options.userInput,
      timestamp: startTime,
      metadata: options.metadata,
    };

    this.executionHistory.set(taskId, context);

    try {
      console.log(`[Agent] 开始任务: ${taskId}, 域: ${options.domain}`);

      // 1. 尝试从缓存获取
      if (options.useCache !== false && this.config.enableCache) {
        const cached = await this.getFromCache(options.domain, options.userInput);
        if (cached) {
          console.log(`[Agent] 从缓存返回结果: ${taskId}`);
          return cached;
        }
      }

      // 2. 生成提示词（如果需要）
      const finalPrompt = await this.generatePrompt(options.domain, options.userInput, options.customApiKey, options.thinkingMode);

      // 3. 智能路由
      const routing = this.router.route(
        finalPrompt,
        options.domain,
        options.preferredModels,
        options.modelCount || this.config.defaultModelCount
      );

      console.log(`[Agent] 路由决策:`, routing.selectedModels);

      // 4. 并行执行或顺序执行
      const responses = options.parallelExecution !== false && this.config.enableParallelExecution
        ? await this.executeParallel(finalPrompt, routing.selectedModels, taskId)
        : await this.executeSequential(finalPrompt, routing.selectedModels, taskId);

      // 5. 聚合结果
      const aggregated = this.aggregateResponses(responses, context, options.userInput);

      // 6. 缓存结果
      if (options.useCache !== false && this.config.enableCache) {
        await this.cacheResult(options.domain, options.userInput, aggregated);
      }

      const executionTime = Date.now() - startTime;
      console.log(`[Agent] 任务完成: ${taskId}, 耗时: ${executionTime}ms`);

      return {
        ...aggregated,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      console.error(`[Agent] 任务失败: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * 并行执行 AI 调用
   */
  private async executeParallel(
    prompt: string,
    modelIds: string[],
    taskId: string
  ): Promise<AgentResponse[]> {
    console.log(`[Agent] 并行执行 ${modelIds.length} 个模型`);

    const promises = modelIds.map((modelId) =>
      this.callAIModel(prompt, modelId, taskId)
        .catch((error) => {
          console.error(`[Agent] 模型 ${modelId} 执行失败:`, error);
          return null;
        })
    );

    const results = await Promise.all(promises);
    return results.filter((r) => r !== null) as AgentResponse[];
  }

  /**
   * 顺序执行 AI 调用
   */
  private async executeSequential(
    prompt: string,
    modelIds: string[],
    taskId: string
  ): Promise<AgentResponse[]> {
    console.log(`[Agent] 顺序执行 ${modelIds.length} 个模型`);

    const results: AgentResponse[] = [];

    for (const modelId of modelIds) {
      try {
        const result = await this.callAIModel(prompt, modelId, taskId);
        results.push(result);
      } catch (error) {
        console.error(`[Agent] 模型 ${modelId} 执行失败:`, error);
      }
    }

    return results;
  }

  /**
   * 调用单个 AI 模型
   */
  private async callAIModel(
    prompt: string,
    modelId: string,
    taskId: string
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    console.log(`[Agent] 调用模型: ${modelId}`);

    // 这里应该调用实际的 AI API
    // 目前使用模拟响应进行演示
    const mockResponse = await this.getMockAIResponse(modelId, prompt);

    const executionTime = Date.now() - startTime;

    return {
      taskId,
      model: modelId,
      response: mockResponse,
      executionTime,
      cached: false,
    };
  }

  /**
   * 模拟 AI 响应（用于演示）
   */
  private async getMockAIResponse(modelId: string, prompt: string): Promise<string> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500));

    const responses: Record<string, string> = {
      'gpt-4o-mini': `ChatGPT (GPT-4o-mini) 的分析:\n\n基于您的提示词"${prompt.substring(0, 50)}...", 我提供以下建议:\n1. 技术架构:\n2. 实现策略:\n3. 最佳实践:`,
      'gemini-2.5-flash': `Google Gemini 2.5 Flash 的分析:\n\n针对"${prompt.substring(0, 50)}..."的技术方案:\n• 方案1\n• 方案2\n• 方案3`,
      'claude-3.5-sonnet': `Claude 3.5 Sonnet 的分析:\n\n深入分析"${prompt.substring(0, 50)}...":\n- 背景分析\n- 关键要点\n- 实施建议`,
      'perplexity-pro': `Perplexity AI 的分析:\n\n最新研究表明"${prompt.substring(0, 50)}...":\n※ 相关参考\n※ 最佳实践\n※ 行业动向`,
    };

    return (
      responses[modelId] ||
      `${modelId} 的分析:\n\n基于提示词的详细回应...\n- 关键点1\n- 关键点2\n- 结论`
    );
  }

  /**
   * 生成提示词
   */
  private async generatePrompt(
    domain: Domain,
    userInput: string,
    customApiKey?: string,
    thinkingMode?: boolean
  ): Promise<string> {
    // 如果需要，这里可以调用 Gemini 来增强提示词
    // 目前直接返回原始输入
    return userInput;
  }

  /**
   * 聚合响应
   */
  private aggregateResponses(
    responses: AgentResponse[],
    context: AgentExecutionContext,
    originalPrompt: string
  ): AggregatedResult {
    const { consensus, divergences } = ResponseAggregator.findConsensus(responses);

    return {
      taskId: context.taskId,
      domain: context.domain,
      originalPrompt,
      responses,
      summary: ResponseAggregator.summarize(responses),
      consensus: consensus.join('; '),
      divergences,
      generatedAt: Date.now(),
      executionTimeMs: 0, // 会在 call 方法中覆盖
    };
  }

  /**
   * 从缓存获取结果
   */
  private async getFromCache(domain: Domain, prompt: string): Promise<AggregatedResult | null> {
    const key = MultiLayerCache.generateKey(domain, prompt);
    const cached = await this.cache.get(key);
    return cached || null;
  }

  /**
   * 缓存结果
   */
  private async cacheResult(
    domain: Domain,
    prompt: string,
    result: AggregatedResult
  ): Promise<void> {
    const key = MultiLayerCache.generateKey(domain, prompt);
    await this.cache.set(key, result, 3600); // 缓存 1 小时
  }

  /**
   * 获取 MCP 服务器信息
   */
  getMCPServerInfo() {
    return this.mcpServer.getServerInfo();
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels() {
    return this.router.getAvailableModels();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(taskId?: string) {
    if (taskId) {
      return this.executionHistory.get(taskId);
    }
    return Array.from(this.executionHistory.values());
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 销毁 Agent
   */
  destroy(): void {
    this.cache.destroy();
    this.executionHistory.clear();
    console.log('[Agent] TelecomAIAgent 已销毁');
  }
}

// 创建全局 Agent 实例
export const globalAgent = new TelecomAIAgent({
  enableCache: true,
  enableParallelExecution: true,
  defaultModelCount: 3,
});

export default TelecomAIAgent;
