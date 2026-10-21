import React, { useEffect, useState } from 'react';
import { Search, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../../api/client';

type RecordRow = {
  id: string;
  created_at: string;
  dimension: string;
  question: string;
  primary_name: string;
  user_email?: string | null;
};

export const AdminRecords = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiRequest<{ rows: RecordRow[] }>('/api/admin/records?limit=200');
        if (cancelled) return;
        const all = (data?.rows ?? []) as any[];
        const term = searchTerm.trim().toLowerCase();
        setRecords(term ? all.filter((r) => String(r.question ?? '').toLowerCase().includes(term)) : (all as any));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">测算记录</h2>
        
        <div className="flex space-x-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select className="pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white appearance-none focus:outline-none focus:border-dark-gold">
              <option>全部时间</option>
              <option>今天</option>
              <option>最近7天</option>
              <option>最近30天</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户或问题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-dark-gold w-64"
            />
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700">
                <th className="py-4 px-6 text-sm font-medium text-gray-400">时间</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">用户</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">维度</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">所问问题</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">所得卦象</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {!loading && records.length > 0 ? records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="py-4 px-6 text-sm text-gray-400">{new Date(record.created_at).toLocaleString()}</td>
                  <td className="py-4 px-6 text-sm text-gray-300">{record.user_email ?? '-'}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                      {record.dimension}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-300 max-w-xs truncate" title={record.question}>
                    {record.question}
                  </td>
                  <td className="py-4 px-6 text-sm font-serif text-dark-gold">{record.primary_name}</td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-dark-gold hover:text-yellow-400 text-sm font-medium transition-colors">
                      查看详情
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">{loading ? '加载中...' : '暂无记录'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
