import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { useAppStore } from '../store';
import { replaceChinesePhrasesWithPinyin, toPinyinOrNull, toTitleCaseWords } from '../lib/pinyin';
import { HexagramCard } from '../components/HexagramCard';

export const DivinationResult = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAppStore();
  const [result, setResult] = useState<any>(null);
  const [typedAnalysis, setTypedAnalysis] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [shouldAnimateTyping, setShouldAnimateTyping] = useState(false);

  const hexName = (name: string) => {
    const isZhUI = String(i18n.language ?? '').toLowerCase().startsWith('zh');
    const raw = String(name ?? '').trim();
    if (!raw) return '';
    if (isZhUI) return raw;
    const py = toPinyinOrNull(raw);
    return py ? toTitleCaseWords(py) : raw;
  };

  const parseAnalysis = (raw: string) => {
    const text = String(raw ?? '').trim();
    if (!text) return null;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const out: any = { takeaway: '', reading: '', actions: [] as string[], avoid: [] as string[] };

    const readAfter = (prefixes: string[]) => {
      const i = lines.findIndex((l) => prefixes.some((p) => l.startsWith(p)));
      if (i < 0) return '';
      const l = lines[i];
      for (const p of prefixes) if (l.startsWith(p)) return l.slice(p.length).trim();
      return '';
    };

    out.takeaway = readAfter(['一句话结论：', 'Takeaway:']);

    const readingIdx = lines.findIndex((l) => l.startsWith('具体解读：') || l.startsWith('Reading:'));
    if (readingIdx >= 0) {
      const prefix = lines[readingIdx].startsWith('具体解读：') ? '具体解读：' : 'Reading:';
      const head = lines[readingIdx].slice(prefix.length).trim();
      const tail = [];
      for (let j = readingIdx + 1; j < lines.length; j++) {
        const l = lines[j];
        if (l.startsWith('今日建议：') || l.startsWith("Today's actions:") || l.startsWith('今日避忌：') || l.startsWith('Avoid:')) break;
        tail.push(l);
      }
      out.reading = [head, ...tail].filter(Boolean).join('\n').trim();
    }

    const actionsIdx = lines.findIndex((l) => l.startsWith('今日建议：') || l.startsWith("Today's actions:"));
    if (actionsIdx >= 0) {
      for (let j = actionsIdx + 1; j < lines.length; j++) {
        const l = lines[j];
        if (l.startsWith('今日避忌：') || l.startsWith('Avoid:')) break;
        if (l.startsWith('-')) out.actions.push(l.replace(/^-+\s*/, '').trim());
      }
    }

    const avoidIdx = lines.findIndex((l) => l.startsWith('今日避忌：') || l.startsWith('Avoid:'));
    if (avoidIdx >= 0) {
      for (let j = avoidIdx + 1; j < lines.length; j++) {
        const l = lines[j];
        if (l.startsWith('-')) out.avoid.push(l.replace(/^-+\s*/, '').trim());
      }
    }

    return out;
  };

  const hasResult = useMemo(() => !!result?.analysis || !!result?.primary, [result]);
  const analysisText = useMemo(() => {
    const raw = String(result?.analysis ?? '').trim();
    if (!raw) return '';
    const isZhUI = String(i18n.language ?? '').toLowerCase().startsWith('zh');
    return isZhUI ? raw : replaceChinesePhrasesWithPinyin(raw);
  }, [i18n.language, result?.analysis]);

  useEffect(() => {
    if (!session) return;
    try {
      const raw = sessionStorage.getItem('yj_last_divination');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setResult(parsed);
      const doType = parsed?.typing === true;
      setShouldAnimateTyping(doType);
      if (doType) {
        try {
          sessionStorage.setItem('yj_last_divination', JSON.stringify({ ...parsed, typing: false }));
        } catch {}
      }
    } catch {}
  }, [session]);

  useEffect(() => {
    if (!hasResult) return;
    const text = analysisText;
    if (!text) {
      setTypedAnalysis('');
      setTypingDone(true);
      return;
    }

    if (!shouldAnimateTyping) {
      setTypedAnalysis(text);
      setTypingDone(true);
      return;
    }

    setTypedAnalysis('');
    setTypingDone(false);
    let i = 0;
    const speed = 14;
    const timer = window.setInterval(() => {
      i += 1;
      setTypedAnalysis(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(timer);
        setTypingDone(true);
        setShouldAnimateTyping(false);
      }
    }, speed);

    return () => {
      window.clearInterval(timer);
    };
  }, [analysisText, hasResult, shouldAnimateTyping]);

  const handleNew = () => {
    try {
      sessionStorage.removeItem('yj_last_divination');
    } catch {}
    navigate('/divination');
  };

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto min-h-[calc(100dvh-4rem-7rem)] flex flex-col justify-center py-4">
        <div className="card-container text-center space-y-4">
          <div className="text-gray-300">{t('chat.no_session')}</div>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            {t('login.submit')}
          </button>
        </div>
      </div>
    );
  }

  if (!hasResult) {
    const isZhUI = String(i18n.language ?? '').toLowerCase().startsWith('zh');
    return (
      <div className="max-w-3xl mx-auto min-h-[calc(100dvh-4rem-7rem)] flex flex-col justify-center py-4">
        <div className="card-container text-center space-y-4">
          <div className="text-gray-300">{isZhUI ? '暂无测算结果' : 'No divination result yet'}</div>
          <div className="flex justify-center gap-3">
            <button className="btn-primary" onClick={() => navigate('/divination')}>
              {isZhUI ? '去测算' : 'Start divination'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto min-h-[calc(100dvh-4rem-7rem)] flex flex-col justify-center py-4">
      <LayoutGroup>
        <div className="space-y-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif text-dark-gold mb-2">{t('divination.result')}</h2>
          </div>

          <div className="origin-top scale-[0.6]">
            <HexagramCard
              title={hexName(result.primary?.name)}
              primaryBinary={String(result.primary?.binary ?? '')}
              relatingTitle={hexName(result.relating?.name)}
              relatingBinary={String(result.relating?.binary ?? '')}
              changingLines={result.changingLines ?? []}
              basis={
                result.basis
                  ? {
                      judgment: String(result.basis.judgment ?? ''),
                      lines: Array.isArray(result.basis.lines) ? result.basis.lines : [],
                    }
                  : null
              }
              showRelating={!!(result.relating?.binary && result.relating?.binary !== result.primary?.binary)}
              showChanging={true}
              showBasis={true}
              layoutId="hexagram"
            />
          </div>

          <div className="card-container relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="h-24 w-24 text-dark-gold" />
            </div>
            <h3 className="text-xl font-serif text-dark-gold mb-4 flex items-center">
              <Sparkles className="h-5 w-5 mr-2" />
              {t('divination.ai_analysis')}
            </h3>
            {!typingDone ? (
              <div className="prose prose-invert text-gray-300 font-serif leading-relaxed whitespace-pre-wrap relative z-10">
                {typedAnalysis}
                <span className="inline-block w-[8px]">▍</span>
              </div>
            ) : (() => {
              const parsed = parseAnalysis(analysisText);
              const hasStructured =
                !!parsed &&
                (!!parsed.takeaway || !!parsed.reading || (parsed.actions?.length ?? 0) > 0 || (parsed.avoid?.length ?? 0) > 0);
              if (!hasStructured) {
                return (
                  <div className="prose prose-invert text-gray-300 font-serif leading-relaxed whitespace-pre-wrap relative z-10">
                    {typedAnalysis}
                  </div>
                );
              }
              const isZhUI = String(i18n.language ?? '').toLowerCase().startsWith('zh');
              return (
                <div className="relative z-10 space-y-4">
                  {!!parsed.takeaway && (
                    <div className="rounded-lg border border-dark-gold/25 bg-dark-gold/10 px-4 py-3">
                      <div className="text-xs text-dark-gold mb-1">{isZhUI ? '一句话结论' : 'Takeaway'}</div>
                      <div className="text-sm text-gray-100">{parsed.takeaway}</div>
                    </div>
                  )}
                  {!!parsed.reading && (
                    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">{isZhUI ? '解读' : 'Reading'}</div>
                      <div className="text-sm text-gray-200 whitespace-pre-wrap">{parsed.reading}</div>
                    </div>
                  )}
                  {(parsed.actions?.length ?? 0) > 0 && (
                    <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                      <div className="text-xs text-emerald-300 mb-2">{isZhUI ? '今日建议' : "Today's actions"}</div>
                      <div className="grid gap-2">
                        {parsed.actions.slice(0, 3).map((x: string, idx: number) => (
                          <div key={idx} className="text-sm text-gray-100">{x}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(parsed.avoid?.length ?? 0) > 0 && (
                    <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3">
                      <div className="text-xs text-rose-300 mb-2">{isZhUI ? '今日避忌' : 'Avoid'}</div>
                      <div className="grid gap-2">
                        {parsed.avoid.slice(0, 2).map((x: string, idx: number) => (
                          <div key={idx} className="text-sm text-gray-100">{x}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex justify-center gap-3 mt-8">
            <button onClick={handleNew} className="btn-primary">
              {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '再次测算' : 'New divination'}
            </button>
          </div>
        </div>
      </LayoutGroup>
    </div>
  );
};
