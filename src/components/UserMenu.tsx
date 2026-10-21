import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCircle2, LogOut, Settings, CreditCard, BadgeCheck, Nfc, ScrollText, X } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAppStore, type ProfileRow } from '../store';

type Props = {
  session: any | null;
  profile: ProfileRow | null;
  onLogoutDone: () => void;
};

export function UserMenu({ session, profile, onLogoutDone }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAppStore((s) => s.setSession);
  const setProfile = useAppStore((s) => s.setProfile);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => {
    const n = (profile?.name || profile?.email || '').trim();
    if (!n) return '';
    const parts = n.split(/\s+/).filter(Boolean);
    const s = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : `${parts[0][0]}`;
    return s.toUpperCase();
  }, [profile?.email, profile?.name]);

  useEffect(() => {
    try {
      const r = window.localStorage.getItem('yijing_remember_me');
      const remember = r === null ? true : r === '1';
      const savedEmail = window.localStorage.getItem('yijing_saved_email');
      setRememberMe(remember);
      if (remember && savedEmail) setEmail(savedEmail);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const persistRemember = () => {
    try {
      if (rememberMe) {
        window.localStorage.setItem('yijing_remember_me', '1');
        window.localStorage.setItem('yijing_saved_email', email);
      } else {
        window.localStorage.setItem('yijing_remember_me', '0');
        window.localStorage.removeItem('yijing_saved_email');
      }
    } catch {}
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const em = email.trim();
    if (!em || !password) return;

    setLoading(true);
    try {
      persistRemember();
      if (tab === 'register') {
        const data = await apiRequest<{ accessToken: string; profile: any }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email: em, password }),
        });
        setSession({ accessToken: data.accessToken });
        setProfile(data.profile ?? null);
      } else {
        const data = await apiRequest<{ accessToken: string; profile: any }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: em, password }),
        });
        setSession({ accessToken: data.accessToken });
        setProfile(data.profile ?? null);
      }
      setOpen(false);
      setPassword('');
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setSession(null);
    setProfile(null);
    onLogoutDone();
    setOpen(false);
    navigate('/login');
  };

  const openLogin = () => {
    setTab('login');
    setOpen(true);
  };

  const openRegister = () => {
    setTab('register');
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center overflow-hidden"
        onClick={() => setOpen(true)}
        aria-label={t('account.open_menu')}
      >
        {session && initials ? (
          <span className="text-xs font-semibold text-gray-100">{initials}</span>
        ) : (
          <UserCircle2 className="h-6 w-6 text-gray-300" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[999]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 z-0"
            onClick={() => setOpen(false)}
            aria-label={t('account.close')}
          />

          <div
            className={
              session
                ? 'absolute right-4 top-16 w-[min(92vw,380px)] z-10'
                : 'absolute left-1/2 top-20 -translate-x-1/2 w-[min(92vw,420px)] max-h-[calc(100dvh-8rem)] overflow-auto z-10'
            }
          >
            <div className="card-container p-4 bg-deep-blue backdrop-blur-none">
              <div className="flex items-center justify-between">
                <div className="font-serif text-base text-gray-100">{t('account.title')}</div>
                <button type="button" className="p-2 text-gray-400 hover:text-gray-200" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {session ? (
                <div className="mt-3 space-y-2">
                  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <div className="text-sm text-gray-200">{profile?.name || t('account.unnamed')}</div>
                    <div className="text-xs text-gray-400">{profile?.email || session?.user?.email || ''}</div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" onClick={() => setOpen(false)}>
                      <BadgeCheck className="h-4 w-4 text-dark-gold" />
                      <span className="text-sm">{t('account.profile')}</span>
                    </Link>
                    <Link to="/redeem" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" onClick={() => setOpen(false)}>
                      <CreditCard className="h-4 w-4 text-dark-gold" />
                      <span className="text-sm">{t('account.redeem')}</span>
                    </Link>
                    <Link to="/records" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" onClick={() => setOpen(false)}>
                      <ScrollText className="h-4 w-4 text-dark-gold" />
                      <span className="text-sm">{t('account.records')}</span>
                    </Link>
                    <Link to="/nfc" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" onClick={() => setOpen(false)}>
                      <Nfc className="h-4 w-4 text-dark-gold" />
                      <span className="text-sm">{t('account.nfc')}</span>
                    </Link>
                    <Link to="/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" onClick={() => setOpen(false)}>
                      <Settings className="h-4 w-4 text-dark-gold" />
                      <span className="text-sm">{t('account.settings')}</span>
                    </Link>
                  </div>

                  <button type="button" className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-200 hover:text-cinnabar-red hover:border-cinnabar-red/40 transition-colors" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">{t('account.logout')}</span>
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${tab === 'login' ? 'bg-white/10 text-gray-100' : 'bg-white/5 text-gray-400 hover:text-gray-200'}`}
                      onClick={() => setTab('login')}
                    >
                      {t('account.login')}
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${tab === 'register' ? 'bg-white/10 text-gray-100' : 'bg-white/5 text-gray-400 hover:text-gray-200'}`}
                      onClick={() => setTab('register')}
                    >
                      {t('account.register')}
                    </button>
                  </div>

                  <form onSubmit={submit} className="mt-3 space-y-3">
                    <input
                      className="input-field"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('login.email')}
                      autoComplete="email"
                      required
                    />
                    <input
                      className="input-field"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('login.password')}
                      autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                      required
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-400 select-none">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                      <span>{t('login.remember_me')}</span>
                    </label>

                    {error && <div className="text-sm text-cinnabar-red">{error}</div>}

                    <button type="submit" className="w-full btn-primary py-3 text-base disabled:opacity-50" disabled={loading}>
                      {tab === 'register' ? t('account.register') : t('account.login')}
                    </button>
                  </form>

                  <div className="mt-3 flex justify-between text-xs text-gray-400">
                    <button type="button" className="hover:text-gray-200" onClick={openLogin}>
                      {t('account.login')}
                    </button>
                    <button type="button" className="hover:text-gray-200" onClick={openRegister}>
                      {t('account.register')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
