import React, { useState, useEffect } from 'react';
import { agentClient } from '../services/client/agentClient';
import { Domain } from '../types';
import { Cpu, Loader, CheckCircle2, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';

interface AgentPanelProps {
  domain: Domain;
  userInput: string;
  isLoading: boolean;
  onStartCall: (isLoading: boolean) => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  domain,
  userInput,
  isLoading,
  onStartCall,
}) => {
  const [agentResult, setAgentResult] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [cacheStats, setCacheStats] = useState<any | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [streamingData, setStreamingData] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // 初始化时加载可用模型
    loadAvailableModels();
    loadCacheStats();
  }, []);

  const loadAvailableModels = async () => {
    const availableModels = await agentClient.getAvailableModels();
    setModels(availableModels);
  };

  const loadCacheStats = async () => {
    const stats = await agentClient.getCacheStats();
    setCacheStats(stats);
  };

  const handleAgentCall = async () => {
    if (!userInput.trim()) {
      alert('请输入提示词');
      return;
    }

    onStartCall(true);
    setIsLoading(true);

    try {
      const result = await agentClient.call({
        domain,
        userInput,
        modelCount: 3,
        parallelExecution: true,
        useCache: true,
      });

      if (result.ok && result.result) {
        setAgentResult(result.result);
        setCacheStats(result.cacheStats);
      } else {
        alert(`Agent 调用失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Agent call error:', error);
      alert('与 Agent 通信失败');
    } finally {
      onStartCall(false);
      setIsLoading(false);
    }
  };

  const handleStreamCall = async () => {
    if (!userInput.trim()) {
      alert('请输入提示词');
      return;
    }

    onStartCall(true);
    setIsStreaming(true);
    setStreamingData([]);

    try {
      let responseCount = 0;
      for await (const event of agentClient.streamCall({
        domain,
        userInput,
        modelCount: 3,
      })) {
        setStreamingData((prev) => [...prev, event]);

        if (event.type === 'response') {
          responseCount++;
        } else if (event.type === 'complete') {
          console.log('Stream complete:', event);
        }
      }
    } catch (error) {
      console.error('Stream call error:', error);
      alert('流式调用失败');
    } finally {
      onStartCall(false);
      setIsStreaming(false);
    }
  };

  const handleClearCache = async () => {
    const success = await agentClient.clearCache();
    if (success) {
      setCacheStats(await agentClient.getCacheStats());
      alert('缓存已清空');
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <Cpu className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-slate-800">AI Agent & MCP</h3>
      </div>

      <div className="space-y-4">
        {/* 调用选项 */}
        <div className="flex gap-2">
          <button
            onClick={handleAgentCall}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && <Loader className="w-4 h-4 animate-spin" />}
            Agent 调用
          </button>

          <button
            onClick={handleStreamCall}
            disabled={isLoading || isStreaming}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isStreaming && <Loader className="w-4 h-4 animate-spin" />}
            流式调用
          </button>

          <button
            onClick={loadCacheStats}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
          >
            刷新
          </button>
        </div>

        {/* 缓存统计 */}
        {cacheStats && (
          <div className="bg-white rounded-lg p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                缓存统计
              </h4>
              <button
                onClick={handleClearCache}
                className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
              >
                清空
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-slate-500 text-xs">命中率</span>
                <span className="font-bold text-slate-800">{(cacheStats.hitRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-xs">总大小</span>
                <span className="font-bold text-slate-800">{cacheStats.size} 项</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-xs">命中次数</span>
                <span className="font-bold text-slate-800">{cacheStats.hits}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-xs">未命中次数</span>
                <span className="font-bold text-slate-800">{cacheStats.misses}</span>
              </div>
            </div>
          </div>
        )}

        {/* Agent 结果 */}
        {agentResult && (
          <div className="bg-white rounded-lg border border-green-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-slate-700">Agent 结果</h4>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">执行时间:</span>
                <span className="font-mono font-bold text-slate-800">{agentResult.executionTimeMs}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">模型数量:</span>
                <span className="font-mono font-bold text-slate-800">{agentResult.responses?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">任务 ID:</span>
                <span className="font-mono text-xs text-slate-600 truncate">{agentResult.taskId}</span>
              </div>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-3 w-full px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-sm font-semibold transition-colors"
            >
              {showDetails ? '隐藏详情' : '显示详情'}
            </button>

            {showDetails && (
              <div className="mt-3 p-3 bg-slate-50 rounded text-xs">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(agentResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 流式数据 */}
        {streamingData.length > 0 && (
          <div className="bg-white rounded-lg border border-blue-100 p-4 max-h-64 overflow-y-auto">
            <h4 className="font-semibold text-slate-700 mb-2">流式响应</h4>
            {streamingData.map((data, idx) => (
              <div key={idx} className="mb-2 p-2 bg-slate-50 rounded text-xs">
                <div className="font-mono font-bold text-blue-600">{data.type}</div>
                {data.model && <div>模型: {data.model}</div>}
                {data.progress !== undefined && <div>进度: {data.progress.toFixed(0)}%</div>}
              </div>
            ))}
          </div>
        )}

        {/* 可用模型 */}
        {models.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-slate-100">
            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              可用模型
            </h4>
            <div className="flex flex-wrap gap-1">
              {models.map((model) => (
                <span key={model.id} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                  {model.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentPanel;
