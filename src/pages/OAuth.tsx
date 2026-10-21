import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../api/client';
import { useAppStore } from '../store';

export function OAuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAppStore((s) => s.setSession);
  const setProfile = useAppStore((s) => s.setProfile);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    const hash = String(window.location.hash ?? '').replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const token = String(params.get('token') ?? '').trim();
    const err = String(params.get('error') ?? '').trim();

    if (err) {
      setMsg(err);
      clearAuth();
      return;
    }
    if (!token) {
      setMsg('missing_token');
      clearAuth();
      return;
    }

    setSession({ accessToken: token });
    apiRequest<{ profile: any }>('/api/me')
      .then((d) => {
        if (d?.profile) setProfile(d.profile);
        navigate('/');
      })
      .catch((e: any) => {
        setMsg(String(e?.message ?? e));
        clearAuth();
      });
  }, [clearAuth, navigate, setProfile, setSession]);

  return (
    <div className="max-w-3xl mx-auto min-h-[calc(100dvh-4rem-7rem)] flex items-center justify-center py-10">
      <div className="card-container w-full max-w-md">
        <div className="text-lg font-serif text-dark-gold">{t('login.title')}</div>
        <div className="mt-3 text-sm text-gray-200 whitespace-pre-wrap">{msg || t('login.loading')}</div>
      </div>
    </div>
  );
}

