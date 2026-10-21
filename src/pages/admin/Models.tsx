import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, CheckCircle2, FlaskConical, Pencil } from 'lucide-react';
import { apiRequest } from '../../api/client';

type AiProvider = 'deepseek' | 'openai_compatible' | 'gemini';

type AiConfigRow = {
  id: string;
  provider: AiProvider;
  name: string;
  base_url: string | null;
  model: string;
  api_key_last4: string | null;
  is_default: boolean;
  updated_at: string;
};

const providerLabel: Record<AiProvider, string> = {
  deepseek: 'DeepSeek',
  openai_compatible: 'OpenAI 兼容',
  gemini: 'Google Gemini',
};

export const AdminModels = () => {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<AiConfigRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AiConfigRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [provider, setProvider] = useState<AiProvider>('deepseek');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  const templates = useMemo(() => {
    return {
      deepseek: { provider: 'deepseek' as const, name: '默认 DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
      openai_compatible: { provider: 'openai_compatible' as const, name: 'OpenAI 兼容', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
      gemini: { provider: 'gemini' as const, name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash' },
    };
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const data = await apiRequest<{ rows: AiConfigRow[] }>('/api/admin/models');
      setConfigs((data?.rows ?? []) as AiConfigRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openCreate(p: AiProvider) {
    const t = templates[p];
    setEditing(null);
    setProvider(t.provider);
    setName(t.name);
    setBaseUrl(t.baseUrl);
    setModel(t.model);
    setApiKey('');
    setIsDefault(true);
    setOpen(true);
  }

  function openEdit(row: AiConfigRow) {
    setEditing(row);
    setProvider(row.provider);
    setName(row.name);
    setBaseUrl(row.base_url ?? '');
    setModel(row.model);
    setApiKey('');
    setIsDefault(row.is_default);
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) return alert('请填写名称');
    if (!model.trim()) return alert('请填写模型');
    if (!editing && !apiKey.trim()) return alert('请填写 API Key');

    setSaving(true);
    try {
      const payload = {
        id: editing?.id ?? undefined,
        provider,
        name,
        baseUrl,
        model,
        apiKey: apiKey.trim() ? apiKey : undefined,
        isDefault,
      };

      const data = await apiRequest<{ id: string }>('/api/admin/models', { method: 'POST', body: JSON.stringify(payload) });
      const id = data?.id as string | undefined;
      if (!id) return alert('保存失败');

      setOpen(false);
      setApiKey('');
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string) {
    await apiRequest('/api/admin/models/set-default', { method: 'POST', body: JSON.stringify({ id }) });
    await refresh();
  }

  async function testConfig(id: string) {
    setTestingId(id);
    try {
      const data = await apiRequest<any>('/api/admin/models/test', { method: 'POST', body: JSON.stringify({ id }) });
      if (data?.ok) {
        alert(`连通性正常（${data.latencyMs}ms）`);
      } else {
        alert(`连通性失败：${data?.error ?? 'unknown'}`);
      }
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">模型配置</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-gray-700 text-sm rounded-lg text-white hover:bg-gray-700 transition-colors"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            <span>刷新</span>
          </button>
          <button
            onClick={() => openCreate('deepseek')}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-dark-gold text-black text-sm rounded-lg hover:bg-yellow-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>新增</span>
          </button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">名称</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">提供商</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">模型</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Base URL</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Key</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">默认</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {configs.length > 0 ? (
                configs.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="py-4 px-6 text-gray-200">{c.name}</td>
                    <td className="py-4 px-6 text-gray-300">{providerLabel[c.provider]}</td>
                    <td className="py-4 px-6 text-gray-300">{c.model}</td>
                    <td className="py-4 px-6 text-gray-400 text-sm max-w-xs truncate" title={c.base_url ?? ''}>
                      {c.base_url ?? '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">{c.api_key_last4 ? `****${c.api_key_last4}` : '-'}</td>
                    <td className="py-4 px-6">
                      {c.is_default ? (
                        <span className="inline-flex items-center space-x-1 text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">是</span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">否</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        {!c.is_default && (
                          <button
                            className="px-3 py-1 rounded bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-dark-gold transition-colors"
                            onClick={() => setDefault(c.id)}
                          >
                            设为默认
                          </button>
                        )}
                        <button
                          className="px-3 py-1 rounded bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-dark-gold transition-colors inline-flex items-center gap-1"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-4 w-4" />
                          编辑
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-dark-gold transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                          onClick={() => testConfig(c.id)}
                          disabled={testingId === c.id}
                        >
                          <FlaskConical className="h-4 w-4" />
                          测试
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    {loading ? '加载中...' : '暂无配置'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-xl bg-gray-900 border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-white">{editing ? '编辑配置' : '新增配置'}</div>
              <button className="text-gray-400 hover:text-white" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-gray-400 mb-1">提供商</div>
                  <select
                    value={provider}
                    onChange={(e) => {
                      const p = e.target.value as AiProvider;
                      const t = templates[p];
                      setProvider(p);
                      setName(t.name);
                      setBaseUrl(t.baseUrl);
                      setModel(t.model);
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dark-gold"
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai_compatible">OpenAI 兼容</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">名称</div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dark-gold"
                  />
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Base URL</div>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dark-gold"
                />
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">模型</div>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dark-gold"
                />
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">API Key（留空则保持不变）</div>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-dark-gold"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                设为默认
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 hover:border-dark-gold" onClick={() => setOpen(false)}>
                取消
              </button>
              <button className="px-4 py-2 rounded-lg bg-dark-gold text-black hover:bg-yellow-400 disabled:opacity-50" onClick={save} disabled={saving}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
