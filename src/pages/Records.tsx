import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../api/client';
import { useAppStore } from '../store';

export function RecordsPage() {
  const { t } = useTranslation();
  const { session } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<any | null>(null);

  const label = useMemo(() => {
    const map: Record<string, string> = {
      love: t('home.love'),
      wealth: t('home.wealth'),
      health: t('home.health'),
      career: t('home.career'),
      overall: t('home.overall'),
    };
    return (d: string) => map[d] || d;
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session) return;
      setLoading(true);
      try {
        const data = await apiRequest<{ rows: any[] }>('/api/records?limit=30');
        if (!cancelled) setRows(data.rows ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <div className="mx-auto max-w-3xl min-h-[calc(100dvh-4rem-7rem)] flex flex-col">
      <div className="card-container">
        <h2 className="text-xl font-serif text-dark-gold">{t('records.title')}</h2>
        {!session && <div className="mt-3 text-sm text-gray-400">{t('records.login_needed')}</div>}
        {session && loading && <div className="mt-3 text-sm text-gray-400">{t('records.loading')}</div>}
        {session && !loading && rows.length === 0 && <div className="mt-3 text-sm text-gray-400">{t('records.empty')}</div>}

        {session && !loading && rows.length > 0 && (
          <div className="mt-4 space-y-2">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                className="w-full text-left bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors"
                onClick={() => setOpen(r)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-200">{label(String(r.dimension || ''))}</div>
                  <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                {r.primary_name && <div className="mt-2 text-sm text-gray-300">{r.primary_name}</div>}
                {r.question && <div className="mt-2 text-sm text-gray-400 clamp-2">{r.question}</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[999]">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setOpen(null)} />
          <div className="absolute left-1/2 top-20 -translate-x-1/2 w-[min(92vw,720px)] max-h-[calc(100dvh-8rem)] overflow-auto">
            <div className="card-container bg-deep-blue backdrop-blur-none p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-400">{label(String(open.dimension || ''))}</div>
                  <div className="text-lg font-serif text-dark-gold">{open.primary_name || ''}</div>
                </div>
                <button type="button" className="btn-primary text-sm" onClick={() => setOpen(null)}>
                  {t('account.close')}
                </button>
              </div>

              {open.question && (
                <div className="mt-4">
                  <div className="text-sm text-gray-400">{t('divination.question')}</div>
                  <div className="mt-1 text-sm text-gray-200">{open.question}</div>
                </div>
              )}

              {open.ai_analysis && (
                <div className="mt-4">
                  <div className="text-sm text-gray-400">{t('divination.ai_analysis')}</div>
                  <div className="mt-1 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{open.ai_analysis}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
