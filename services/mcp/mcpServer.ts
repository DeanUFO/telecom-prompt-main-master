/**
 * MCP (Model Context Protocol) Server
 * 统一的 AI 工具接口定义与资源管理
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

// MCP 工具定义
export const MCP_TOOLS: Record<string, MCPTool> = {
  'generate-telecom-prompt': {
    name: 'generate-telecom-prompt',
    description: '生成电信领域专业提示词',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: '电信领域 (MOBILE/FIXED/DATACENTER/DEV/AI_DATA/SECURITY/AGENT_MCP)',
        },
        userInput: {
          type: 'string',
          description: '用户输入的需求描述',
        },
        thinkingMode: {
          type: 'boolean',
          description: '是否启用思考模式',
          default: false,
        },
      },
      required: ['domain', 'userInput'],
    },
  },
  'route-to-model': {
    name: 'route-to-model',
    description: '智能路由到最合适的 AI 模型',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '分析用的提示词',
        },
        domainCategory: {
          type: 'string',
          description: '领域分类',
        },
        aiPreference: {
          type: 'array',
          description: '偏好的 AI 模型列表',
          items: { type: 'string' },
        },
      },
      required: ['prompt'],
    },
  },
  'aggregate-responses': {
    name: 'aggregate-responses',
    description: '聚合多个 AI 模型的回应',
    inputSchema: {
      type: 'object',
      properties: {
        responses: {
          type: 'array',
          description: '来自不同模型的回应列表',
        },
        style: {
          type: 'string',
          description: '汇总样式 (summary/detailed/comparative)',
          enum: ['summary', 'detailed', 'comparative'],
        },
      },
      required: ['responses'],
    },
  },
  'cache-result': {
    name: 'cache-result',
    description: '缓存 AI 生成结果',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: '缓存键',
        },
        value: {
          type: 'string',
          description: '缓存值 (JSON)',
        },
        ttl: {
          type: 'number',
          description: '过期时间 (秒)',
          default: 3600,
        },
      },
      required: ['key', 'value'],
    },
  },
};

// MCP 提示词模板
export const MCP_PROMPTS: Record<string, MCPPrompt> = {
  'telecom-analysis-agent': {
    name: 'telecom-analysis-agent',
    description: '电信技术分析 Agent 提示词',
    arguments: [
      {
        name: 'domain',
        description: '技术领域',
        required: true,
      },
      {
        name: 'problem',
        description: '具体问题',
        required: true,
      },
    ],
  },
  'multi-ai-consensus': {
    name: 'multi-ai-consensus',
    description: '多 AI 共识生成提示词',
    arguments: [
      {
        name: 'topic',
        description: '讨论主题',
        required: true,
      },
      {
        name: 'perspectives',
        description: '各模型观点',
        required: true,
      },
    ],
  },
};

// MCP 资源类型
export const MCP_RESOURCES: Record<string, MCPResource> = {
  'telecom-standards': {
    uri: 'resource://telecom-standards',
    name: '电信标准库',
    description: '3GPP, IEEE, IETF 标准参考',
    mimeType: 'application/json',
  },
  'domain-examples': {
    uri: 'resource://domain-examples',
    name: '领域示例库',
    description: '各领域实际应用案例集',
    mimeType: 'application/json',
  },
  'ai-model-profiles': {
    uri: 'resource://ai-model-profiles',
    name: 'AI 模型档案',
    description: '各 AI 模型的能力与特长',
    mimeType: 'application/json',
  },
};

// MCP 服务器配置
export const MCP_SERVER_CONFIG: MCPServerConfig = {
  name: 'telecom-prompt-mcp',
  version: '1.0.0',
  capabilities: {
    tools: true,
    resources: true,
    prompts: true,
  },
};

/**
 * MCP 服务器基类
 */
export class MCPServer {
  private config: MCPServerConfig;
  private tools: Map<string, MCPTool>;
  private resources: Map<string, MCPResource>;
  private prompts: Map<string, MCPPrompt>;

  constructor(config: MCPServerConfig = MCP_SERVER_CONFIG) {
    this.config = config;
    this.tools = new Map(Object.entries(MCP_TOOLS));
    this.resources = new Map(Object.entries(MCP_RESOURCES));
    this.prompts = new Map(Object.entries(MCP_PROMPTS));
  }

  /**
   * 获取服务器信息
   */
  getServerInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
      capabilities: this.config.capabilities,
      tools: Array.from(this.tools.values()),
      resources: Array.from(this.resources.values()),
      prompts: Array.from(this.prompts.values()),
    };
  }

  /**
   * 获取工具列表
   */
  getTools() {
    return Array.from(this.tools.values());
  }

  /**
   * 获取特定工具
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * 注册自定义工具
   */
  registerTool(name: string, tool: MCPTool) {
    this.tools.set(name, tool);
  }

  /**
   * 获取资源列表
   */
  getResources() {
    return Array.from(this.resources.values());
  }

  /**
   * 注册资源
   */
  registerResource(uri: string, resource: MCPResource) {
    this.resources.set(uri, resource);
  }

  /**
   * 获取提示词列表
   */
  getPrompts() {
    return Array.from(this.prompts.values());
  }

  /**
   * 注册提示词
   */
  registerPrompt(name: string, prompt: MCPPrompt) {
    this.prompts.set(name, prompt);
  }
}

export default MCPServer;
