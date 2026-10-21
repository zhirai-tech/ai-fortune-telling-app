import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShieldAlert, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../../api/client';
import type { ProfileRow } from '../../store';

export const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);

  const ITEMS_PER_PAGE = 5;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const e = String(u.email ?? '').toLowerCase();
      const n = String(u.name ?? '').toLowerCase();
      return e.includes(term) || n.includes(term);
    });
  }, [searchTerm, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageUsers = useMemo(() => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(from, from + ITEMS_PER_PAGE);
  }, [currentPage, filtered]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await apiRequest<{ rows: ProfileRow[] }>('/api/admin/users');
        if (cancelled) return;
        setUsers((data?.rows ?? []) as any);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusToggle = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    const next = u.status === 'active' ? 'banned' : 'active';
    if (!window.confirm('确定要更改该用户的状态吗？')) return;

    apiRequest(`/api/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
      .then(() => setUsers((prev) => prev.map((p) => (p.id === userId ? ({ ...p, status: next } as any) : p))))
      .catch((e) => alert(String((e as any)?.message ?? e)));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">用户管理</h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索邮箱或姓名..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-dark-gold w-64"
          />
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
                <th className="py-4 px-6 text-sm font-medium text-gray-400">用户信息</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">角色</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">测算次数</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">加入时间</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400">状态</th>
                <th className="py-4 px-6 text-sm font-medium text-gray-400 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {!loading && users.length > 0 ? (
                pageUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/20 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-medium">
                          {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-white">{user.name || '未知用户'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-400/10 text-red-400' :
                        user.role === 'paid' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {user.role === 'admin' ? '管理员' : user.role === 'paid' ? '高级会员' : '免费用户'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-300">-</td>
                    <td className="py-4 px-6 text-gray-400 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center space-x-1 ${
                        user.status === 'active' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                        <span className="text-sm">{user.status === 'active' ? '正常' : '封禁'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {user.role !== 'admin' && (
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleStatusToggle(user.id)}
                            title={user.status === 'active' ? '封禁用户' : '解封用户'}
                            className={`p-2 rounded-lg transition-colors ${
                              user.status === 'active' 
                                ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' 
                                : 'text-gray-400 hover:text-green-400 hover:bg-green-400/10'
                            }`}
                          >
                            {user.status === 'active' ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    {loading ? '加载中...' : '没有找到匹配的用户'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/30 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            显示 {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} 到 {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} 条，共 {filtered.length} 条
          </span>
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1 || filtered.length === 0}
              className="px-3 py-1 border border-gray-700 rounded bg-gray-800 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <button 
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || filtered.length === 0}
              className="px-3 py-1 border border-gray-700 rounded bg-gray-800 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
