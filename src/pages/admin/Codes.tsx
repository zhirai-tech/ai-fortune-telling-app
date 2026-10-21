import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Copy, Check, Calendar, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { CodeType } from '../../store';
import { apiRequest } from '../../api/client';

type RedeemCodeRow = {
  id: string;
  code: string;
  type: CodeType;
  status: 'unused' | 'used' | 'revoked';
  created_at: string;
  used_by: string | null;
  used_at: string | null;
};

export const AdminCodes = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<CodeType>('monthly');
  const [codes, setCodes] = useState<RedeemCodeRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiRequest<{ rows: RedeemCodeRow[] }>('/api/admin/codes');
        if (cancelled) return;
        const all = (data?.rows ?? []) as any[];
        const term = searchTerm.trim().toLowerCase();
        setCodes(term ? all.filter((c) => String(c.code ?? '').toLowerCase().includes(term)) : (all as any));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async () => {
    const data = await apiRequest<{ codes: RedeemCodeRow[] }>('/api/admin/codes/generate', {
      method: 'POST',
      body: JSON.stringify({ type: selectedType, count: 1 }),
    });
    const generated = (data?.codes ?? []) as RedeemCodeRow[];
    if (generated.length > 0) setCodes((prev) => [...generated, ...prev]);
    setShowGenerateModal(false);
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('确定要作废这个兑换码吗？作废后不可恢复。')) return;
    await apiRequest(`/api/admin/codes/${id}/revoke`, { method: 'PATCH' });
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'revoked' } : c)));
  };

  const getTypeLabel = (type: CodeType) => {
    switch (type) {
      case 'monthly': return '月度 (100次)';
      case 'quarterly': return '季度 (300次)';
      case 'yearly': return '年度 (1200次)';
      case 'permanent': return '永久 (9999次)';
      default: return '未知';
    }
  };

  const filteredCodes = useMemo(() => codes, [codes]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">兑换码管理</h2>
        
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索兑换码..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-dark-gold w-64"
            />
          </div>
          <button 
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center space-x-2 bg-dark-gold text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-500 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>生成兑换码</span>
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700">
                <th className="py-4 px-6 text-sm font-medium text-gray-400">兑换码</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">类型/额度</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">状态</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">使用信息</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">创建时间</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {!loading && filteredCodes.length > 0 ? (
                filteredCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-white tracking-wider bg-gray-900 px-2 py-1 rounded border border-gray-700">
                          {code.code}
                        </span>
                        <button 
                          onClick={() => handleCopy(code.code, code.id)}
                          className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                          title="复制"
                        >
                          {copiedId === code.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-300">
                       <span className="inline-flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{getTypeLabel(code.type)}</span>
                       </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        code.status === 'unused' ? 'bg-green-400/10 text-green-400' : 
                        code.status === 'used' ? 'bg-gray-700 text-gray-400' : 'bg-red-400/10 text-red-400'
                      }`}>
                        {code.status === 'unused' ? '未使用' : code.status === 'used' ? '已使用' : '已作废'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {code.status === 'used' ? (
                        <div className="text-sm">
                          <div className="text-gray-300">{code.used_by}</div>
                          <div className="text-gray-500 text-xs">{code.used_at}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">{code.created_at}</td>
                    <td className="py-4 px-6 text-right">
                      {code.status === 'unused' && (
                        <button 
                          onClick={() => handleRevoke(code.id)}
                          className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                        >
                          作废
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">{loading ? '加载中...' : '没有找到兑换码'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 生成兑换码弹窗 */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-4">生成兑换码</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">选择会员时长类型</label>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as CodeType)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-gold"
                >
                  <option value="monthly">月度会员 (30天，送100次高级测算)</option>
                  <option value="quarterly">季度会员 (90天，送300次高级测算)</option>
                  <option value="yearly">年度会员 (365天，送1200次高级测算)</option>
                  <option value="permanent">终身会员 (永久，无限次)</option>
                </select>
              </div>
              
              <div className="bg-dark-gold/10 border border-dark-gold/20 p-3 rounded-lg flex items-start space-x-2">
                 <ShieldAlert className="h-5 w-5 text-dark-gold flex-shrink-0 mt-0.5" />
                 <div className="text-sm text-dark-gold">
                    生成的兑换码为单次消耗品，一码仅限一个账号使用。用户兑换后将自动升级并延长对应时长的VIP。
                 </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleGenerate}
                className="px-4 py-2 rounded-lg bg-dark-gold text-gray-900 font-medium hover:bg-yellow-500 transition-colors"
              >
                确认生成
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
