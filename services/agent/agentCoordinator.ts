/**
 * AI Agent 协调服务
 * 负责路由、并行执行、缓存和聚合 AI 模型的回应
 */

import { Domain } from '../../types';

export interface AIModel {
  name: string;
  id: string;
  type: 'llm' | 'embedding' | 'vision';
  strengths: string[];
  capabilities: {
    reasoning: number; // 0-100
    creativity: number;
    accuracy: number;
    speed: number;
  };
  costPerToken?: number;
}

export interface RoutingDecision {
  selectedModels: string[];
  reason: string;
  confidence: number;
}

export interface AgentExecutionContext {
  taskId: string;
  domain: Domain;
  originalPrompt: string;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  taskId: string;
  model: string;
  response: string;
  executionTime: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cached?: boolean;
}

export interface AggregatedResult {
  taskId: string;
  domain: Domain;
  originalPrompt: string;
  responses: AgentResponse[];
  summary: string;
  consensus?: string;
  divergences?: string[];
  generatedAt: number;
  executionTimeMs: number;
}

/**
 * AI Model 档案库
 */
export const AI_MODEL_PROFILES: Record<string, AIModel> = {
  'gpt-4o-mini': {
    name: 'ChatGPT (GPT-4o-mini)',
    id: 'gpt-4o-mini',
    type: 'llm',
    strengths: ['code-generation', 'reasoning', 'versatility'],
    capabilities: {
      reasoning: 95,
      creativity: 85,
      accuracy: 92,
      speed: 90,
    },
    costPerToken: 0.000015,
  },
  'gemini-2.5-flash': {
    name: 'Google Gemini 2.5 Flash',
    id: 'gemini-2.5-flash',
    type: 'llm',
    strengths: ['multimodal', 'reasoning', 'fast'],
    capabilities: {
      reasoning: 88,
      creativity: 82,
      accuracy: 90,
      speed: 95,
    },
    costPerToken: 0.0000075,
  },
  'claude-3.5-sonnet': {
    name: 'Anthropic Claude 3.5 Sonnet',
    id: 'claude-3.5-sonnet',
    type: 'llm',
    strengths: ['analysis', 'writing', 'reasoning'],
    capabilities: {
      reasoning: 92,
      creativity: 88,
      accuracy: 95,
      speed: 80,
    },
    costPerToken: 0.00003,
  },
  'perplexity-pro': {
    name: 'Perplexity AI Pro',
    id: 'perplexity-pro',
    type: 'llm',
    strengths: ['research', 'real-time', 'web-search'],
    capabilities: {
      reasoning: 85,
      creativity: 75,
      accuracy: 88,
      speed: 85,
    },
    costPerToken: 0.00002,
  },
};

/**
 * 智能路由器
 * 根据任务特征选择最合适的 AI 模型
 */
export class AIRouter {
  private models: Map<string, AIModel>;
  private routingRules: Map<string, string[]>;

  constructor() {
    this.models = new Map(Object.entries(AI_MODEL_PROFILES));
    this.initializeRoutingRules();
  }

  /**
   * 初始化路由规则
   */
  private initializeRoutingRules() {
    this.routingRules = new Map([
      // 移动网络相关 - 需要高精度和专业知识
      [Domain.MOBILE, ['gemini-2.5-flash', 'gpt-4o-mini', 'claude-3.5-sonnet']],
      // 固定网络 - 需要架构和设计思考
      [Domain.FIXED, ['claude-3.5-sonnet', 'gpt-4o-mini', 'gemini-2.5-flash']],
      // 数据中心 - 需要多角度分析
      [Domain.DATACENTER, ['gpt-4o-mini', 'claude-3.5-sonnet', 'gemini-2.5-flash']],
      // 开发 - 需要代码生成能力
      [Domain.DEV, ['gpt-4o-mini', 'claude-3.5-sonnet', 'gemini-2.5-flash']],
      // AI 数据 - 需要深度分析
      [Domain.AI_DATA, ['claude-3.5-sonnet', 'gpt-4o-mini', 'gemini-2.5-flash']],
      // 安全 - 需要严谨和准确性
      [Domain.SECURITY, ['claude-3.5-sonnet', 'gpt-4o-mini', 'perplexity-pro']],
      // Agent MCP - 需要先进推理和架构思考
      [Domain.AGENT_MCP, ['claude-3.5-sonnet', 'gpt-4o-mini', 'gemini-2.5-flash']],
    ]);
  }

  /**
   * 根据域和提示词进行智能路由
   */
  route(
    prompt: string,
    domain: Domain,
    userPreference?: string[],
    count: number = 3
  ): RoutingDecision {
    // 优先使用用户偏好
    let candidates = userPreference || this.routingRules.get(domain) || Array.from(this.models.keys());

    // 按用户偏好排序候选模型
    if (userPreference) {
      candidates = userPreference.filter((m) => this.models.has(m));
    }

    // 根据提示词特性进一步优化选择
    const selectedModels = this.optimizeSelection(prompt, candidates, count);

    return {
      selectedModels,
      reason: `根据 ${domain} 域和提示词特性选择最合适的 ${selectedModels.length} 个模型`,
      confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
    };
  }

  /**
   * 根据提示词特性优化模型选择
   */
  private optimizeSelection(prompt: string, candidates: string[], count: number): string[] {
    const features = this.analyzePromptFeatures(prompt);
    const scores = new Map<string, number>();

    candidates.forEach((modelId) => {
      const model = this.models.get(modelId);
      if (!model) return;

      let score = 0;
      if (features.needs_reasoning && model.capabilities.reasoning > 85) score += 30;
      if (features.needs_creativity && model.capabilities.creativity > 80) score += 20;
      if (features.needs_accuracy && model.capabilities.accuracy > 90) score += 25;
      if (features.needs_speed && model.capabilities.speed > 85) score += 15;

      // 偏好相关领域的模型
      if (features.code_related && model.strengths.includes('code-generation')) score += 20;
      if (features.research_related && model.strengths.includes('web-search')) score += 15;
      if (features.multimodal && model.strengths.includes('multimodal')) score += 10;

      scores.set(modelId, score);
    });

    // 按分数排序并返回前 N 个
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([modelId]) => modelId);
  }

  /**
   * 分析提示词特性
   */
  private analyzePromptFeatures(prompt: string) {
    const lower = prompt.toLowerCase();
    return {
      needs_reasoning: /推理|分析|比较|论证|设计/.test(lower),
      needs_creativity: /创意|创新|想象|头脑风暴/.test(lower),
      needs_accuracy: /准确|精确|严谨|详细|完整/.test(lower),
      needs_speed: /快速|立即|快点|紧急/.test(lower),
      code_related: /代码|编程|脚本|算法|函数/.test(lower),
      research_related: /研究|查询|搜索|最新|信息/.test(lower),
      multimodal: /图|视频|音频|多媒体/.test(lower),
    };
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelId: string): AIModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * 获取所有可用模型
   */
  getAvailableModels(): AIModel[] {
    return Array.from(this.models.values());
  }
}

/**
 * 结果聚合器
 * 将多个 AI 回应合并为有意义的汇总
 */
export class ResponseAggregator {
  /**
   * 聚合多个回应为摘要
   */
  static summarize(responses: AgentResponse[]): string {
    if (responses.length === 0) return '';
    if (responses.length === 1) return responses[0].response;

    const modelSummaries = responses
      .map((r) => `\n**${r.model}:**\n${r.response.substring(0, 200)}...`)
      .join('\n');

    return `**聚合来自 ${responses.length} 个 AI 模型的分析：**${modelSummaries}`;
  }

  /**
   * 进行比较分析
   */
  static comparative(responses: AgentResponse[]): string {
    if (responses.length < 2) return this.summarize(responses);

    let analysis = '## 对比分析\n\n';
    analysis += `### 参与模型 (${responses.length} 个)\n`;
    responses.forEach((r) => {
      analysis += `- **${r.model}** (执行时间: ${r.executionTime}ms)\n`;
    });

    analysis += '\n### 观点对比\n';
    responses.forEach((r, idx) => {
      analysis += `\n#### ${idx + 1}. ${r.model}\n`;
      analysis += r.response.substring(0, 300) + '...\n';
    });

    return analysis;
  }

  /**
   * 找出共识和分歧
   */
  static findConsensus(
    responses: AgentResponse[]
  ): { consensus: string[]; divergences: string[] } {
    // 这是一个简化版本，实际应用中应该使用更复杂的 NLP 分析
    const consensus: string[] = [];
    const divergences: string[] = [];

    if (responses.length >= 2) {
      consensus.push('多个模型认可该技术方向');
      divergences.push('在某些实现细节上存在差异');
    }

    return { consensus, divergences };
  }
}

export default {
  AIRouter,
  ResponseAggregator,
  AI_MODEL_PROFILES,
};
