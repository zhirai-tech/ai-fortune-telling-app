import React, { useEffect, useMemo, useState } from 'react';
import { Users, Activity, CreditCard, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { apiRequest } from '../../api/client';

export const AdminDashboard = () => {
  const [rangeDays, setRangeDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (cancelled) return;
        const data = await apiRequest<any>(`/api/admin/stats?days=${rangeDays}`);
        if (cancelled) return;
        setData(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [rangeDays]);

  const totalUsers = Number(data?.totalUsers ?? 0);
  const activeUsers = Number(data?.activeUsers ?? 0);
  const paidUsers = Number(data?.paidUsers ?? 0);
  const totalDivinations = Number(data?.totalDivinations ?? 0);

  const stats = [
    { label: '总用户数', value: totalUsers.toString(), change: '+12%', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: '活跃用户', value: activeUsers.toString(), change: '+5%', icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: '总测算次数', value: totalDivinations.toString(), change: '+24%', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: '付费会员', value: paidUsers.toString(), change: '+8%', icon: CreditCard, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  ];

  const growthData = useMemo(() => {
    const arr = Array.isArray(data?.growth) ? data.growth : [];
    return arr.map((x: any) => ({
      name: String(x.date).slice(5),
      users: Number(x.users ?? 0),
      divinations: Number(x.divinations ?? 0),
    }));
  }, [data]);

  const dimensionData = useMemo(() => {
    const arr = Array.isArray(data?.dimensions) ? data.dimensions : [];
    const mapZh: Record<string, string> = { career: '事业', love: '爱情', wealth: '财富', health: '健康', overall: '综合' };
    return arr.map((x: any) => ({ name: mapZh[String(x.name)] ?? String(x.name), value: Number(x.value ?? 0) }));
  }, [data]);

  const COLORS = ['#60A5FA', '#F472B6', '#FBBF24', '#34D399'];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">数据大盘</h2>
        <select
          className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-gold"
          value={rangeDays}
          onChange={(e) => setRangeDays(Number(e.target.value))}
        >
          <option value={7}>最近7天</option>
          <option value={30}>最近30天</option>
          <option value={90}>最近90天</option>
        </select>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-400 font-medium">{stat.change}</span>
                <span className="text-gray-500 ml-2">较上期</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 h-96 flex flex-col"
        >
          <h3 className="text-lg font-medium text-white mb-6">用户增长与测算趋势</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDiv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                  itemStyle={{ color: '#E5E7EB' }}
                />
                <Area type="monotone" dataKey="users" name="新增用户" stroke="#D4AF37" fillOpacity={1} fill="url(#colorUsers)" />
                <Area type="monotone" dataKey="divinations" name="测算次数" stroke="#60A5FA" fillOpacity={1} fill="url(#colorDiv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 h-96 flex flex-col"
        >
          <h3 className="text-lg font-medium text-white mb-6">热门测算维度分布</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dimensionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {dimensionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#E5E7EB' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
