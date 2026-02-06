import React, { useState, useEffect } from 'react';
import { agentClient } from '../services/client/agentClient';
import { Zap, Settings2, BookOpen, Package } from 'lucide-react';

interface MCPPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MCPPanel: React.FC<MCPPanelProps> = ({ isOpen, onClose }) => {
  const [mcpInfo, setMcpInfo] = useState<any | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolParams, setToolParams] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      loadMCPData();
    }
  }, [isOpen]);

  const loadMCPData = async () => {
    setLoading(true);
    try {
      const [mcpData, toolsData] = await Promise.all([
        agentClient.getMCPInfo(),
        agentClient.getMCPTools(),
      ]);
      setMcpInfo(mcpData);
      setTools(toolsData);
    } catch (error) {
      console.error('Failed to load MCP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallTool = async () => {
    if (!selectedTool) {
      alert('请选择一个工具');
      return;
    }

    try {
      setLoading(true);
      const result = await agentClient.callMCPTool(selectedTool, toolParams);
      alert(`工具执行成功:\n${JSON.stringify(result, null, 2)}`);
    } catch (error: any) {
      alert(`工具执行失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto border border-slate-100">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            MCP 工具浏览器
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* MCP Server Info */}
          {mcpInfo && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-blue-600" />
                MCP 服务器信息
              </h3>
              <div className="text-sm text-slate-600 space-y-1">
                <div>
                  <strong>名称:</strong> {mcpInfo.name}
                </div>
                <div>
                  <strong>版本:</strong> {mcpInfo.version}
                </div>
                <div>
                  <strong>工具数量:</strong> {mcpInfo.tools?.length || 0}
                </div>
                <div>
                  <strong>资源数量:</strong> {mcpInfo.resources?.length || 0}
                </div>
                <div>
                  <strong>提示词数量:</strong> {mcpInfo.prompts?.length || 0}
                </div>
              </div>
            </div>
          )}

          {/* Tools Selection */}
          {tools.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                可用工具
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {tools.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => {
                      setSelectedTool(tool.name);
                      setToolParams({});
                    }}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      selectedTool === tool.name
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-semibold text-slate-800">{tool.name}</div>
                    <div className="text-xs text-slate-600">{tool.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tool Parameters */}
          {selectedTool && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-green-600" />
                工具参数
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-600 mb-3">
                  <strong>工具:</strong> {selectedTool}
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="参数 (JSON 格式)"
                    value={JSON.stringify(toolParams)}
                    onChange={(e) => {
                      try {
                        setToolParams(JSON.parse(e.target.value));
                      } catch {
                        // 忽略解析错误
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleCallTool}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors"
              >
                {loading ? '执行中...' : '执行工具'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MCPPanel;
