import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { Heart, Coins, Activity, Briefcase, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { apiRequest } from '../api/client';
import coinJustUrl from '../assets/coins/just.png?url';
import coinOppositeUrl from '../assets/coins/opposite.png?url';

export const Divination = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session, setProfile } = useAppStore();
  const [step, setStep] = useState(1); // 1: form, 2: animating, 3: result
  const [animPhase, setAnimPhase] = useState<'coins' | 'wait' | 'lines'>('coins');
  const [dimension, setDimension] = useState('career');
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState<any>(null);
  const [revealCount, setRevealCount] = useState(0);
  const [coinKF, setCoinKF] = useState<[[number, number, number], [number, number, number], [number, number, number]]>([
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]);
  const [coinDur, setCoinDur] = useState<[number, number, number]>([1.6, 2.0, 2.4]);
  const [coinAnimDone, setCoinAnimDone] = useState(false);
  const coinTimeoutRef = useRef<number | null>(null);
  const lineTimeoutsRef = useRef<number[]>([]);
  const linesStartedRef = useRef(false);

  const HexLine = ({
    isYang,
    isChanging,
    shown,
    animateIn,
  }: {
    isYang: boolean;
    isChanging: boolean;
    shown: boolean;
    animateIn: boolean;
  }) => {
    return (
      <div className={`w-full h-2 ${isChanging ? 'drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]' : ''}`}>
        {!shown ? (
          <div className="w-full h-full rounded bg-white/10" />
        ) : isYang ? (
          <motion.div
            initial={animateIn ? { x: -18, scaleX: 0, opacity: 0 } : false}
            animate={{ x: 0, scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full h-full rounded bg-dark-gold origin-center"
          />
        ) : (
          <div className="w-full h-full flex justify-between">
            <motion.div
              initial={animateIn ? { x: -18, scaleX: 0, opacity: 0 } : false}
              animate={{ x: 0, scaleX: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-[45%] h-full rounded bg-dark-gold origin-left"
            />
            <motion.div
              initial={animateIn ? { x: 18, scaleX: 0, opacity: 0 } : false}
              animate={{ x: 0, scaleX: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-[45%] h-full rounded bg-dark-gold origin-right"
            />
          </div>
        )}
      </div>
    );
  };

  const Coin3D = ({ kf, duration }: { kf: [number, number, number]; duration: number }) => {
    return (
      <div className="h-14 w-14 [perspective:600px]">
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: kf, scaleX: [1, 0.38, 1], scaleY: [1, 0.92, 1] }}
          transition={{ duration, times: [0, 0.75, 1], ease: ['linear', 'easeOut'] }}
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.20),rgba(255,255,255,0.06),rgba(0,0,0,0.08))] opacity-60" />
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <img src={coinJustUrl} className="h-full w-full rounded-full" />
          </div>
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <img src={coinOppositeUrl} className="h-full w-full rounded-full" />
          </div>
          <div className="absolute inset-0 rounded-full ring-1 ring-black/20" />
        </motion.div>
      </div>
    );
  };

  const computeCoinFacesForLine = (v: number) => {
    const n = Number(v);
    if (n === 6) return [180, 180, 180] as const;
    if (n === 7) return [0, 180, 180] as const;
    if (n === 8) return [0, 0, 180] as const;
    return [0, 0, 0] as const;
  };

  const presets = useMemo(() => {
    const en: Record<string, string[]> = {
      love: [
        'What should I focus on in my relationship today?',
        'How can I communicate better with the person I care about?',
        'Is it a good time to start a new relationship?',
      ],
      wealth: [
        'What is the best financial focus for today?',
        'Should I avoid any spending decisions today?',
        'How can I improve my long-term stability?',
      ],
      health: [
        'What should I prioritize for my health today?',
        'What habit would bring the biggest benefit right now?',
        'How can I reduce stress effectively today?',
      ],
      career: [
        'What is the best move for my career today?',
        'What should I avoid at work today?',
        'How can I make progress with the least resistance?',
      ],
    };
    const zh: Record<string, string[]> = {
      love: ['我今天的感情相处重点是什么？', '我该如何更好地沟通？', '现在适合开始一段新关系吗？'],
      wealth: ['我今天的财务重点是什么？', '今天有哪些消费需要避免？', '如何提升长期稳定性？'],
      health: ['我今天健康应优先关注什么？', '现在最值得养成的习惯是什么？', '如何有效减压？'],
      career: ['我今天事业上最好的行动是什么？', '工作上我需要避免什么？', '如何用最小阻力推进进展？'],
    };
    const map = (i18n.language?.toLowerCase().startsWith('zh') ? zh : en) as Record<string, string[]>;
    return map;
  }, [i18n.language]);

  const [presetValue, setPresetValue] = useState('');

  useEffect(() => {
    setPresetValue('');
  }, [dimension]);

  const dimensions = [
    { id: 'love', icon: Heart, label: t('home.love') },
    { id: 'wealth', icon: Coins, label: t('home.wealth') },
    { id: 'health', icon: Activity, label: t('home.health') },
    { id: 'career', icon: Briefcase, label: t('home.career') },
  ];

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      navigate('/login');
      return;
    }

    setStep(2);
    setPending(null);
    setAnimPhase('coins');
    setRevealCount(0);
    setCoinAnimDone(false);
    linesStartedRef.current = false;
    if (coinTimeoutRef.current) window.clearTimeout(coinTimeoutRef.current);
    lineTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
    lineTimeoutsRef.current = [];

    const face = () => (Math.random() < 0.5 ? 0 : 180);
    const spins = [8, 10, 9] as const;
    const mk = (s: number) => {
      const mid = 360 * s;
      const end = mid + face();
      return [0, mid, end] as [number, number, number];
    };
    const kf = [mk(spins[0]), mk(spins[1]), mk(spins[2])] as [[number, number, number], [number, number, number], [number, number, number]];
    const durs = [1.1, 1.6, 2.1] as [number, number, number];
    setCoinDur(durs);
    setCoinKF([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    window.setTimeout(() => setCoinKF(kf), 20);
    coinTimeoutRef.current = window.setTimeout(() => setCoinAnimDone(true), Math.max(...durs) * 1000 + 120);

    let data: any = null;
    let errMsg: string | null = null;
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 20000);
      data = await apiRequest<any>('/api/divination', {
        method: 'POST',
        body: JSON.stringify({ dimension, question, locale: i18n.language }),
        signal: ctrl.signal,
      });
      window.clearTimeout(timer);
    } catch (e: any) {
      errMsg = String(e?.message ?? e);
    }

    if (errMsg) {
      alert(errMsg);
      setStep(1);
      return;
    }

    if (data?.profile) setProfile(data.profile);
    setPending(data);
  };

  useEffect(() => {
    if (step !== 2) {
      if (coinTimeoutRef.current) window.clearTimeout(coinTimeoutRef.current);
      coinTimeoutRef.current = null;
      lineTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      lineTimeoutsRef.current = [];
      linesStartedRef.current = false;
      return;
    }

    if (coinAnimDone && !pending) setAnimPhase('wait');
    if (!pending || !coinAnimDone) return;
    if (linesStartedRef.current) return;
    linesStartedRef.current = true;

    const coins = pending?.coins;
    const lines = pending?.primaryLinesBottomToTop;
    const ok = Array.isArray(coins) && coins.length === 6 && Array.isArray(lines) && lines.length === 6;

    const payload = {
      createdAt: new Date().toISOString(),
      dimension,
      question,
      primary: pending?.primary,
      relating: pending?.relating,
      changingLines: pending?.changingLines ?? [],
      primaryLinesBottomToTop: pending?.primaryLinesBottomToTop ?? null,
      basis: pending?.basis,
      analysis: pending?.analysis
    };

    const persistAndGo = () => {
      const payloadSession = { ...payload, typing: true };
      const payloadHistory = { ...payload, typing: false };
      try {
        sessionStorage.setItem('yj_last_divination', JSON.stringify(payloadSession));
      } catch {}
      try {
        const key = 'yj_divination_history';
        const raw = window.localStorage.getItem(key);
        const arr = Array.isArray(JSON.parse(raw ?? '[]')) ? JSON.parse(raw ?? '[]') : [];
        const next = [payloadHistory, ...arr].slice(0, 5);
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      setPending(null);
      setStep(1);
      navigate('/divination/result');
    };

    if (!ok) {
      persistAndGo();
      return;
    }

    setAnimPhase('lines');
    setRevealCount(0);
    const LINE_GAP = 150;
    for (let i = 1; i <= 6; i++) {
      lineTimeoutsRef.current.push(
        window.setTimeout(() => {
          setRevealCount(i);
        }, i * LINE_GAP)
      );
    }
    lineTimeoutsRef.current.push(window.setTimeout(persistAndGo, 6 * LINE_GAP + 240));

    return () => {
      lineTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      lineTimeoutsRef.current = [];
    };
  }, [coinAnimDone, dimension, navigate, pending, question, step]);

  return (
    <div className="max-w-3xl mx-auto min-h-[calc(100dvh-4rem-7rem)] flex flex-col justify-center py-4">
      <LayoutGroup>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="card-container space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-serif text-dark-gold" style={{ fontFamily: 'Tahoma, Geneva, sans-serif' }}>
                {t('divination.title')}
              </h2>
              <p className="text-gray-400" style={{ fontFamily: 'Tahoma, Geneva, sans-serif', color: '#ffffff' }}>
                {t('divination.helper')}
              </p>
            </div>

            <form onSubmit={handleStart} className="space-y-8">
              <div className="space-y-4">
                <label className="block text-lg font-serif" style={{ fontFamily: 'Tahoma, Geneva, sans-serif' }}>
                  {t('divination.dimension')}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {dimensions.map(dim => (
                    <button
                      key={dim.id}
                      type="button"
                      onClick={() => setDimension(dim.id)}
                      className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
                        dimension === dim.id 
                          ? 'border-dark-gold bg-dark-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.2)]' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <dim.icon className={`h-6 w-6 mb-2 ${dimension === dim.id ? 'text-dark-gold' : 'text-gray-400'}`} />
                      <span className={dimension === dim.id ? 'text-dark-gold font-medium' : 'text-gray-400'}>
                        {dim.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-lg font-serif">{t('divination.question')}</label>
                <select
                  value={presetValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPresetValue(v);
                    if (v) setQuestion(v);
                  }}
                  className="input-field appearance-none bg-deep-blue"
                >
                  <option value="">{t('divination.pick_preset')}</option>
                  {(presets[dimension] ?? []).map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="input-field min-h-[120px] resize-none placeholder:text-white/70"
                  placeholder={t('divination.question_placeholder')}
                  required
                />
              </div>

              <button type="submit" className="w-full btn-primary py-3 text-lg flex justify-center items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span style={{ fontFamily: 'Tahoma, Geneva, sans-serif' }}>{t('divination.submit')}</span>
              </button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="animating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center space-y-8"
          >
            <div className="w-full max-w-md card-container bg-deep-blue backdrop-blur-none p-4">
              <div className="mt-6 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {animPhase !== 'lines' ? (
                    <motion.div
                      key="coins"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center justify-center gap-4 py-8"
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
                          <Coin3D kf={coinKF[i]} duration={coinDur[i]} />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="lines"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="w-[240px] sm:w-[220px] flex flex-col-reverse gap-2 py-4"
                      layoutId="hexagram"
                    >
                      {(() => {
                        const lines = (pending?.primaryLinesBottomToTop ?? []) as number[];
                        const changing = new Set<number>((pending?.changingLines ?? []) as number[]);
                        return [...Array(6)].map((_, idx) => {
                          const lineNo = idx + 1;
                          const v = Number(lines[idx] ?? 0);
                          const isYang = v === 1;
                          const shown = revealCount >= lineNo;
                          const isChanging = changing.has(lineNo);
                          const animateIn = shown && revealCount === lineNo;
                          return (
                            <div key={lineNo} className="w-full h-3 flex items-center justify-center">
                              <HexLine isYang={isYang} isChanging={isChanging} shown={shown} animateIn={animateIn} />
                            </div>
                          );
                        });
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 text-center text-xs text-gray-400">
                {(() => {
                  const isZhUI = String(i18n.language ?? '').toLowerCase().startsWith('zh');
                  const list = (pending?.changingLines ?? []) as number[];
                  const v = list.length ? list.join(',') : isZhUI ? '无' : 'none';
                  return isZhUI ? `变爻：${v}` : `Changing: ${v}`;
                })()}
              </div>
            </div>
            
            <motion.h3 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-2xl font-serif text-dark-gold tracking-widest"
            >
              {revealCount < 6 ? t('divination.analyzing') : t('divination.result')}
            </motion.h3>
          </motion.div>
        )}

      </AnimatePresence>
      </LayoutGroup>
    </div>
  );
};
