/**
 * Agent 和 MCP 服务器端点扩展
 * 包含流式传输、Agent 调用、缓存管理等功能
 */

import { TelecomAIAgent, globalAgent } from '../services/agent/TelecomAIAgent';

/**
 * 注册 Agent 相关的 API 端点
 */
export function registerAgentEndpoints(app) {
  console.log('📍 Registering Agent endpoints...');

  /**
   * 获取 MCP 服务器信息
   */
  app.get('/api/agent/mcp-info', (req, res) => {
    try {
      const mcpInfo = globalAgent.getMCPServerInfo();
      res.json({
        ok: true,
        mcp: mcpInfo,
        description: 'MCP (Model Context Protocol) 服务器信息',
      });
      console.log('✅ MCP info endpoint called');
    } catch (error) {
      console.error('❌ MCP info error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 获取可用的 AI 模型列表（来自 Agent）
   */
  app.get('/api/agent/models', (req, res) => {
    try {
      const models = globalAgent.getAvailableModels();
      res.json({
        ok: true,
        models: models,
        count: models.length,
      });
      console.log('✅ Available models endpoint called');
    } catch (error) {
      console.error('❌ Available models error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 调用 Agent 处理 AI 请求
   * 支持并行执行、智能路由、缓存等
   */
  app.post('/api/agent/call', async (req, res) => {
    const { domain, userInput, customApiKey, thinkingMode, preferredModels, modelCount, parallelExecution, useCache, metadata } = req.body;

    console.log(`📨 Agent call request: domain=${domain}, modelCount=${modelCount}`);

    if (!domain || !userInput) {
      return res.status(400).json({ error: '缺少必要参数: domain 和 userInput' });
    }

    try {
      const options = {
        domain,
        userInput,
        customApiKey,
        thinkingMode: thinkingMode || false,
        preferredModels: preferredModels || undefined,
        modelCount: modelCount || 3,
        parallelExecution: parallelExecution !== false,
        useCache: useCache !== false,
        metadata: metadata || {},
      };

      console.log('⚙️ Executing Agent with options:', options);
      const result = await globalAgent.call(options);

      res.json({
        ok: true,
        result: result,
        cacheStats: globalAgent.getCacheStats(),
      });

      console.log(`✅ Agent call completed: taskId=${result.taskId}, executionTime=${result.executionTimeMs}ms`);
    } catch (error) {
      console.error('❌ Agent call error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 流式传输 Agent 调用 (Server-Sent Events)
   * 用于实时接收多个 AI 模型的响应
   */
  app.post('/api/agent/call-stream', async (req, res) => {
    const { domain, userInput, customApiKey, modelCount } = req.body;

    console.log(`📡 Agent stream call: domain=${domain}`);

    if (!domain || !userInput) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      // 创建任务状态
      const taskId = `task-${Date.now()}`;
      let responseCount = 0;

      // 发送初始化事件
      res.write(
        `data: ${JSON.stringify({
          type: 'init',
          taskId,
          domain,
          totalModels: modelCount || 3,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );

      // 模拟流式响应
      const modelIds = ['gpt-4o-mini', 'gemini-2.5-flash', 'claude-3.5-sonnet'].slice(0, modelCount || 3);

      for (const modelId of modelIds) {
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

        // 发送模型响应事件
        const mockResponse = `${modelId} 的分析结果: 基于 "${userInput.substring(0, 30)}..." 的深入分析...`;

        res.write(
          `data: ${JSON.stringify({
            type: 'response',
            model: modelId,
            response: mockResponse,
            progress: (++responseCount / modelIds.length) * 100,
            timestamp: new Date().toISOString(),
          })}\n\n`
        );
      }

      // 发送完成事件
      await new Promise((resolve) => setTimeout(resolve, 500));

      res.write(
        `data: ${JSON.stringify({
          type: 'complete',
          taskId,
          responseCount,
          totalTime: `${Date.now() - parseInt(taskId.split('-')[1])}ms`,
          cacheStats: globalAgent.getCacheStats(),
          timestamp: new Date().toISOString(),
        })}\n\n`
      );

      res.end();
      console.log(`✅ Agent stream call completed: ${responseCount} responses`);
    } catch (error) {
      console.error('❌ Agent stream call error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  });

  /**
   * 获取缓存统计信息
   */
  app.get('/api/agent/cache-stats', (req, res) => {
    try {
      const stats = globalAgent.getCacheStats();
      res.json({
        ok: true,
        stats: stats,
        hitRate: (stats.hitRate * 100).toFixed(2) + '%',
      });
      console.log('✅ Cache stats endpoint called');
    } catch (error) {
      console.error('❌ Cache stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 清空缓存
   */
  app.post('/api/agent/clear-cache', (req, res) => {
    try {
      globalAgent.clearCache();
      res.json({
        ok: true,
        message: '缓存已清空',
        stats: globalAgent.getCacheStats(),
      });
      console.log('✅ Cache cleared');
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 获取执行历史
   */
  app.get('/api/agent/history', (req, res) => {
    try {
      const taskId = req.query.taskId;
      const history = globalAgent.getExecutionHistory(taskId);

      res.json({
        ok: true,
        history: history,
        count: Array.isArray(history) ? history.length : 1,
      });
      console.log('✅ Execution history endpoint called');
    } catch (error) {
      console.error('❌ Execution history error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 获取 MCP 工具列表
   */
  app.get('/api/agent/mcp-tools', (req, res) => {
    try {
      const mcpInfo = globalAgent.getMCPServerInfo();
      const tools = mcpInfo.tools || [];

      res.json({
        ok: true,
        tools: tools,
        count: tools.length,
        description: 'MCP 可用工具列表',
      });
      console.log('✅ MCP tools endpoint called');
    } catch (error) {
      console.error('❌ MCP tools error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 调用 MCP 工具
   */
  app.post('/api/agent/mcp-tool-call', async (req, res) => {
    const { toolName, parameters } = req.body;

    console.log(`🔧 MCP tool call: ${toolName}`);

    if (!toolName || !parameters) {
      return res.status(400).json({ error: '缺少必要参数: toolName 和 parameters' });
    }

    try {
      // 根据工具名称执行相应操作
      let result;

      switch (toolName) {
        case 'generate-telecom-prompt':
          result = {
            ok: true,
            toolName,
            result: `生成的电信提示词: ${JSON.stringify(parameters)}`,
          };
          break;

        case 'route-to-model':
          result = {
            ok: true,
            toolName,
            selectedModels: ['gpt-4o-mini', 'claude-3.5-sonnet'],
            reason: '根据提示词特性选择最合适的模型',
          };
          break;

        case 'aggregate-responses':
          result = {
            ok: true,
            toolName,
            aggregated: `聚合的结果摘要`,
          };
          break;

        case 'cache-result':
          result = {
            ok: true,
            toolName,
            cached: true,
            expiresIn: parameters.ttl || 3600,
          };
          break;

        default:
          return res.status(400).json({ error: `未知的工具: ${toolName}` });
      }

      res.json(result);
      console.log(`✅ MCP tool call completed: ${toolName}`);
    } catch (error) {
      console.error('❌ MCP tool call error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 健康检查 - Agent 专用
   */
  app.get('/api/agent/health', (req, res) => {
    try {
      const stats = globalAgent.getCacheStats();
      res.json({
        ok: true,
        status: 'healthy',
        cache: stats,
        timestamp: new Date().toISOString(),
      });
      console.log('✅ Agent health check passed');
    } catch (error) {
      console.error('❌ Agent health check failed:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  console.log('✅ Agent endpoints registered successfully!');
}

export default registerAgentEndpoints;
