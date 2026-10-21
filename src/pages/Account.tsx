import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { BadgeCheck, CreditCard, ScrollText, Nfc, Settings, LogOut, History } from 'lucide-react';

export function AccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, profile, clearAuth } = useAppStore();

  const logout = async () => {
    clearAuth();
    navigate('/login');
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl min-h-[calc(100dvh-4rem-7rem)] flex flex-col">
        <div className="card-container bg-deep-blue backdrop-blur-none">
          <h2 className="text-xl font-serif text-dark-gold">{t('account.title')}</h2>
          <div className="mt-3 text-sm text-gray-300">{t('records.login_needed')}</div>
          <Link to="/login" className="mt-4 inline-flex btn-primary text-base px-6 py-3">
            {t('account.login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl min-h-[calc(100dvh-4rem-7rem)] flex flex-col">
      <div className="card-container bg-deep-blue backdrop-blur-none">
        <h2 className="text-xl font-serif text-dark-gold">{t('account.title')}</h2>

        <div className="mt-4 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
          <div className="text-sm text-gray-200">{profile?.name || t('account.unnamed')}</div>
          <div className="mt-1 text-xs text-gray-400">{profile?.email || ''}</div>
          <div className="mt-1 text-xs text-gray-400">
            {t('settings.role')}: {profile?.role || 'free'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <Link to="/profile" className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <BadgeCheck className="h-4 w-4 text-dark-gold" />
            <span className="text-sm">{t('account.profile')}</span>
          </Link>
          <Link to="/redeem" className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <CreditCard className="h-4 w-4 text-dark-gold" />
            <span className="text-sm">{t('account.redeem')}</span>
          </Link>
          <Link to="/records" className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <ScrollText className="h-4 w-4 text-dark-gold" />
            <span className="text-sm">{t('account.records')}</span>
          </Link>
          <Link to="/divination/history" className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <History className="h-4 w-4 text-dark-gold" />
            <span className="text-sm">{t('account.divination_history')}</span>
          </Link>
          <Link to="/nfc" className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <Nfc className="h-4 w-4 text-dark-gold" />
            <span className="text-sm">{t('account.nfc')}</span>
          </Link>
          <Link to="/settings" className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <Settings className="h-4 w-4 text-dark-gold" />
            <span className="text-sm">{t('account.settings')}</span>
          </Link>
        </div>

        <button
          type="button"
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/10 text-gray-200 hover:text-cinnabar-red hover:border-cinnabar-red/40 transition-colors"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">{t('account.logout')}</span>
        </button>
      </div>
    </div>
  );
}
