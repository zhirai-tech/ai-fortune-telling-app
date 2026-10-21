import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { Heart, Coins, Activity, Briefcase, Sparkles, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../api/client';

export const Home = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session, profile } = useAppStore();
  const [fortunes, setFortunes] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const lang = (i18n.language || profile?.locale || 'zh').toLowerCase();
      const locale = lang.startsWith('zh') ? 'zh' : 'en';
      try {
        const data = await apiRequest<{ fortunes: any[] }>(`/api/daily-fortunes?locale=${locale}`);
        if (cancelled) return;
        setFortunes(data?.fortunes ?? []);
      } catch {
        if (cancelled) return;
        setFortunes([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [i18n.language, profile?.locale]);

  const dailyMap = useMemo(() => {
    const m = new Map<string, { score: number; text: string }>();
    for (const f of fortunes ?? []) m.set(f.dimension, { score: f.score, text: f.text });
    return m;
  }, [fortunes]);

  const dimensions = [
    { id: 'overall', icon: Star, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { id: 'love', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-400/10' },
    { id: 'wealth', icon: Coins, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { id: 'health', icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
    { id: 'career', icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ];

  const handleStartDivination = () => {
    if (!session) {
      navigate('/login');
      return;
    }
    navigate('/divination');
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const fallbackScore = (id: string) => {
    const lang = (i18n.language || profile?.locale || 'zh').toLowerCase();
    const locale = lang.startsWith('zh') ? 'zh' : 'en';
    const seed = `${today}:${locale}:${id}`;
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    const n = (h >>> 0) % 100;
    const base = id === 'overall' ? 62 : 55;
    const span = id === 'overall' ? 28 : 35;
    return base + (n % span);
  };

  const fallbackText = (id: string) => {
    const isZh = (i18n.language || 'zh').toLowerCase().startsWith('zh');
    const mapZh: Record<string, string> = {
      overall: `今日（${today}）宜守中持正，先稳后动。先把手头一件事做扎实，再顺势推进新的选择。`,
      love: `少猜多问，先听后说。用温和的语气把你的真实需求讲清楚，关系更容易回到顺位。`,
      wealth: `先保底再求增。今天适合整理预算与优先级，避免“冲动下单/高风险”带来的回撤。`,
      health: `别硬扛也别猛练。规律作息、补水与轻量活动更合时宜，压力要用呼吸与睡眠化开。`,
      career: `稳扎稳打更有效。把关键任务拆小、逐个完成；少分心，多复盘，机会会更清晰。`,
    };
    const mapEn: Record<string, string> = {
      overall: `Today (${today}): keep balance, move steadily, and avoid impulsive choices.`,
      love: `Be direct, stay warm, and listen before reacting.`,
      wealth: `Prioritize essentials; avoid risky shortcuts and overspending.`,
      health: `Sleep, hydrate, and keep a calm pace—small habits matter.`,
      career: `Focus on one task, finish it cleanly, then move to the next.`,
    };
    return (isZh ? mapZh : mapEn)[id] ?? '';
  };

  const clampText = (id: string, text: string) => {
    const s = (text || '').trim() || fallbackText(id);
    const isZh = (i18n.language || 'zh').toLowerCase().startsWith('zh');
    const max = isZh ? (id === 'overall' ? 90 : 60) : (id === 'overall' ? 180 : 140);
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-6 pt-[120px] pb-[120px] min-h-[calc(100dvh-4rem-7rem)]">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl text-center space-y-5 pt-14 pb-2 px-4"
      >
        <h1
          className="text-5xl sm:text-6xl font-serif font-extrabold tracking-wide"
          style={{
            fontFamily: 'Georgia, serif',
            color: '#f59e24',
            lineHeight: '54px',
            WebkitTextStroke: '1px rgba(0,0,0,0.55)',
            textShadow: '0 2px 14px rgba(0,0,0,0.22), 0 0 18px rgba(255,255,255,0.18)',
          }}
        >
          {t('common.app_name')}
        </h1>
        <p
          className="text-2xl sm:text-2xl font-serif font-bold tracking-wide"
          style={{
            color: '#2a2d41',
            WebkitTextStroke: '0.8px rgba(255,255,255,0.55)',
            textShadow: '0 2px 10px rgba(0,0,0,0.12)',
          }}
        >
          {t('home.daily_fortune')}
        </p>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl px-4"
      >
        {dimensions.filter((d) => d.id === 'overall').map((dim) => {
          const data0 = dailyMap.get(dim.id) ?? { score: 0, text: '' };
          const data = { ...data0, score: data0.score || fallbackScore(dim.id) };
          return (
            <motion.div
              key={dim.id}
              variants={item}
              className="card-container col-span-1 md:col-span-2 grid grid-rows-[auto_1fr] p-4 sm:p-6 min-h-[170px] sm:min-h-[180px] hover:-translate-y-2 transition-transform cursor-pointer group"
              onClick={handleStartDivination}
            >
              <div className="w-full h-full flex justify-between items-center">
                <h3 className="font-serif text-xl md:text-2xl leading-none text-gray-100" style={{ fontFamily: 'Tahoma, Geneva, sans-serif' }}>
                  {t(`home.${dim.id}`)}
                </h3>
                <span className={`text-xl md:text-2xl font-bold leading-none ${dim.color}`}>{data.score}%</span>
              </div>
              <p className="h-full flex items-center text-lg md:text-xl text-gray-100 text-center leading-snug clamp-3 sm:clamp-2">
                {clampText(dim.id, data.text)}
              </p>
            </motion.div>
          );
        })}

        {dimensions.filter((d) => d.id !== 'overall').map((dim) => {
          const data0 = dailyMap.get(dim.id) ?? { score: 0, text: '' };
          const data = { ...data0, score: data0.score || fallbackScore(dim.id) };
          return (
            <motion.div
              key={dim.id}
              variants={item}
              className="card-container grid grid-rows-[auto_1fr] p-4 sm:p-6 min-h-[170px] sm:min-h-[180px] hover:-translate-y-2 transition-transform cursor-pointer group"
              onClick={handleStartDivination}
            >
              <div className="w-full h-full flex justify-between items-center">
                <h3 className="font-serif text-xl md:text-2xl flex items-center gap-2 leading-none text-gray-100">
                  <dim.icon className={`h-5 w-5 md:h-6 md:w-6 ${dim.color}`} />
                  <span className="leading-none" style={{ fontFamily: 'Tahoma, Geneva, sans-serif' }}>
                    {t(`home.${dim.id}`)}
                  </span>
                </h3>
                <span className={`text-xl md:text-2xl font-bold leading-none ${dim.color}`}>{data.score}%</span>
              </div>
              <p className="h-full flex items-center text-lg md:text-xl text-gray-100 text-center leading-snug clamp-3 sm:clamp-2">
                {clampText(dim.id, data.text)}
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center gap-2 mt-auto"
      >
      </motion.div>
    </div>
  );
};
