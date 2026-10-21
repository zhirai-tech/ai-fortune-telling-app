import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { toPinyinOrNull, toTitleCaseWords } from '../lib/pinyin';

type HistoryItem = {
  createdAt: string;
  dimension?: string;
  question?: string;
  primary?: { name?: string; binary?: string };
  relating?: { name?: string; binary?: string };
  changingLines?: number[];
  primaryLinesBottomToTop?: number[] | null;
  basis?: any;
  analysis?: string;
};

const KEY = 'yj_divination_history';

function readHistory(): HistoryItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(items: HistoryItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 5)));
  } catch {}
}

export const DivinationHistory = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAppStore();
  const [items, setItems] = useState<HistoryItem[]>([]);

  const hexName = (name: string) => {
    const isZhUI = String(i18n.language ?? '').toLowerCase().startsWith('zh');
    const raw = String(name ?? '').trim();
    if (!raw) return '';
    if (isZhUI) return raw;
    const py = toPinyinOrNull(raw);
    return py ? toTitleCaseWords(py) : raw;
  };

  useEffect(() => {
    setItems(readHistory().slice(0, 5));
  }, []);

  const list = useMemo(() => items.slice(0, 5), [items]);

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto min-h-[calc(100dvh-4rem-7rem)] flex flex-col justify-center py-4">
        <div className="card-container text-center space-y-4">
          <div className="text-gray-300">
            {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '请先登录' : 'Please login first'}
          </div>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '去登录' : 'Go to login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto min-h-[calc(100dvh-4rem-7rem)] py-4">
      <div className="card-container space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-serif text-dark-gold">
            {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '近 5 次测算' : 'Recent divinations (5)'}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => {
                writeHistory([]);
                setItems([]);
              }}
            >
              {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '清空' : 'Clear'}
            </button>
            <button className="btn-primary" onClick={() => navigate('/divination')}>
              {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '去测算' : 'Start divination'}
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="text-sm text-gray-400">
            {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '暂无记录' : 'No records'}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((it, idx) => {
              const title = String(hexName(it.primary?.name ?? '') || 'Hexagram');
              const dt = it.createdAt ? new Date(it.createdAt) : null;
              const time = dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleString() : '';
              return (
                <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-100 truncate">{title}</div>
                      <div className="text-xs text-gray-500 truncate">{it.question || ''}</div>
                    </div>
                    <button
                      className="btn-secondary whitespace-nowrap"
                      onClick={() => {
                        try {
                          sessionStorage.setItem('yj_last_divination', JSON.stringify({ ...it, typing: false }));
                        } catch {}
                        navigate('/divination/result');
                      }}
                    >
                      {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '查看' : 'View'}
                    </button>
                  </div>
                  {!!time && <div className="text-xs text-gray-500">{time}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
