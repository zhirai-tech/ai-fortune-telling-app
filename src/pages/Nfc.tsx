import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../api/client';
import { useAppStore } from '../store';

export function NfcPage() {
  const { t } = useTranslation();
  const { session } = useAppStore();
  const [tagUid, setTagUid] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    const data = await apiRequest<{ rows: any[] }>('/api/nfc-bindings');
    setRows(data.rows ?? []);
  };

  useEffect(() => {
    load();
  }, [session]);

  const bind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const uid = tagUid.trim();
    if (!uid) return;
    setLoading(true);
    setMsg(null);
    try {
      await apiRequest('/api/nfc-bindings', {
        method: 'POST',
        body: JSON.stringify({ tag_uid: uid, label: label.trim() }),
      });
      setTagUid('');
      setLabel('');
      await load();
      setMsg(t('nfc.bind_ok'));
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  const unbind = async (id: string) => {
    if (!session) return;
    const ok = window.confirm(t('nfc.unbind_confirm'));
    if (!ok) return;
    try {
      await apiRequest(`/api/nfc-bindings/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert(String(e?.message ?? e));
    }
  };

  return (
    <div className="mx-auto max-w-3xl min-h-[calc(100dvh-4rem-7rem)] flex flex-col">
      <div className="card-container">
        <h2 className="text-xl font-serif text-dark-gold">{t('nfc.title')}</h2>
        <p className="mt-3 text-sm text-gray-300">{t('nfc.desc')}</p>

        {!session && <div className="mt-4 text-sm text-gray-400">{t('records.login_needed')}</div>}

        {session && (
          <>
            <form onSubmit={bind} className="mt-4 space-y-3">
              <input
                className="input-field"
                value={tagUid}
                onChange={(e) => setTagUid(e.target.value)}
                placeholder={t('nfc.uid')}
              />
              <input
                className="input-field"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('nfc.label')}
              />
              <button type="submit" className="btn-primary w-full py-3 disabled:opacity-50" disabled={loading}>
                {t('nfc.bind')}
              </button>
            </form>
            {msg && <div className={`mt-3 text-sm ${msg === t('nfc.bind_ok') ? 'text-green-400' : 'text-cinnabar-red'}`}>{msg}</div>}

            <div className="mt-5 space-y-2">
              <div className="text-sm text-gray-200">{t('nfc.list')}</div>
              {rows.length === 0 && <div className="text-sm text-gray-400">{t('nfc.empty')}</div>}
              {rows.map((r) => (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-200 truncate">{r.label || t('nfc.unnamed')}</div>
                    <div className="text-xs text-gray-400 truncate">{r.tag_uid}</div>
                  </div>
                  <button type="button" className="text-sm text-cinnabar-red hover:underline" onClick={() => unbind(r.id)}>
                    {t('nfc.unbind')}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
