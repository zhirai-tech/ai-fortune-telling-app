import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { LayoutDashboard, Users, Settings, LogOut, ArrowLeft, History, Key } from 'lucide-react';
import { apiRequest } from '../api/client';

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, clearAuth, setProfile } = useAppStore();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!session?.accessToken) {
        setBootstrapped(true);
        return;
      }
      try {
        const data = await apiRequest<{ profile: any }>('/api/me');
        if (cancelled) return;
        setProfile(data.profile ?? null);
      } catch {
        if (cancelled) return;
        clearAuth();
      } finally {
        if (cancelled) return;
        setBootstrapped(true);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [clearAuth, session?.accessToken, setProfile]);

  if (!bootstrapped) return <div className="min-h-screen bg-gray-900" />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== 'admin') return <Navigate to="/" replace />;

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: '数据大盘' },
    { path: '/admin/users', icon: Users, label: '用户管理' },
    { path: '/admin/records', icon: History, label: '测算记录' },
    { path: '/admin/codes', icon: Key, label: '兑换码管理' },
    { path: '/admin/models', icon: Settings, label: '模型配置' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-dark-gold font-serif">管理后台</h1>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-dark-gold/20 text-dark-gold' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <Link 
            to="/"
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>返回前台</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto bg-gray-900">
        <div className="h-16 flex items-center justify-end px-8 border-b border-gray-800 bg-gray-950/50 sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-full bg-dark-gold/20 flex items-center justify-center text-dark-gold font-bold">
              {profile?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className="text-sm text-gray-300">管理员</span>
          </div>
        </div>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
