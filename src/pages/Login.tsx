import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Key } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest, buildApiUrl } from '../api/client';
import { useAppStore } from '../store';

export const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const setProfile = useAppStore((s) => s.setProfile);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (!session) return;
    const returnTo = (location.state as any)?.returnTo as string | undefined;
    navigate(returnTo || '/', { replace: true });
  }, [location.state, navigate, session]);

  useEffect(() => {
    let cancelled = false;
    const rememberKey = 'yijing_remember_me';
    const emailKey = 'yijing_saved_email';

    async function init() {
      try {
        const savedRemember = window.localStorage.getItem(rememberKey);
        const remember = savedRemember === null ? true : savedRemember === '1';
        const savedEmail = window.localStorage.getItem(emailKey);
        if (!cancelled) {
          setRememberMe(remember);
          if (remember && savedEmail) setEmail(savedEmail);
        }
      } catch {}
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return;

    setLoading(true);
    try {
      const returnTo = (location.state as any)?.returnTo as string | undefined;
      try {
        if (rememberMe) {
          window.localStorage.setItem('yijing_remember_me', '1');
          window.localStorage.setItem('yijing_saved_email', email);
        } else {
          window.localStorage.setItem('yijing_remember_me', '0');
          window.localStorage.removeItem('yijing_saved_email');
        }
      } catch {}

      if (isSignUp) {
        const data = await apiRequest<{ accessToken: string; profile: any }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, locale: i18n.language }),
        });
        setSession({ accessToken: data.accessToken });
        setProfile(data.profile ?? null);
      } else {
        const data = await apiRequest<{ accessToken: string; profile: any }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setSession({ accessToken: data.accessToken });
        setProfile(data.profile ?? null);
      }

      navigate(returnTo || '/');
    } catch (e: any) {
      const raw = String(e?.message ?? e).trim();
      const code = raw.match(/^http_(\d{3})$/)?.[1] ?? '';
      const msg =
        raw === 'invalid_credentials'
          ? isSignUp
            ? t('login.errors.invalid_credentials_register')
            : t('login.errors.invalid_credentials_login')
          : raw === 'email_taken'
            ? t('login.errors.email_taken')
            : raw === 'banned'
              ? t('login.errors.banned')
              : raw === 'db_error'
                ? t('login.errors.db_error')
                : raw === 'invalid_response_not_json'
                  ? t('login.errors.server_invalid')
                  : code
                    ? t('login.errors.http', { code })
                    : raw.toLowerCase().includes('failed to fetch') || raw.toLowerCase().includes('networkerror')
                      ? t('login.errors.network')
                      : t('login.errors.unknown');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const googleStartUrl = buildApiUrl(`/api/auth/google/start?redirect=${encodeURIComponent('/oauth')}`);

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-container w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h2 className="text-3xl font-serif text-dark-gold">{t('login.title')}</h2>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email')}
                className="input-field pl-10"
                autoComplete="email"
                required
              />
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password')}
                className="input-field pl-10"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>{t('login.remember_me')}</span>
            </label>
            {error && <div className="text-sm text-cinnabar-red">{error}</div>}

            <button type="submit" className="w-full btn-primary py-3 disabled:opacity-50" disabled={loading}>
              {isSignUp ? t('login.register') : t('login.submit')}
            </button>

            <a href={googleStartUrl} className="w-full btn-secondary py-3 text-center block">
              {t('login.google')}
            </a>

            <button
              type="button"
              className="w-full text-sm text-gray-400 hover:text-dark-gold transition-colors"
              onClick={() => setIsSignUp((v) => !v)}
            >
              {isSignUp ? t('login.back_to_login') : t('login.to_register')}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
