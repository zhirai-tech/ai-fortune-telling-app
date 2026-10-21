import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';

export function SettingsPage() {
  const { t } = useTranslation();
  const { language, setLanguage, theme, setTheme, session, profile } = useAppStore();

  const clearRememberedEmail = () => {
    try {
      window.localStorage.removeItem('yijing_saved_email');
      window.localStorage.setItem('yijing_remember_me', '0');
    } catch {}
    alert(t('settings.cleared'));
  };

  return (
    <div className="mx-auto max-w-3xl min-h-[calc(100dvh-4rem-7rem)] flex flex-col">
      <div className="card-container">
        <h2 className="text-xl font-serif text-dark-gold">{t('settings.title')}</h2>
        <div className="mt-4 space-y-3">
          {session && (
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
              <div className="text-sm text-gray-200">{t('settings.account')}</div>
              <div className="mt-1 text-xs text-gray-400">{profile?.email || ''}</div>
              <div className="mt-1 text-xs text-gray-400">
                {t('settings.role')}: {profile?.role || 'free'}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <div>
              <div className="text-sm text-gray-200">{t('settings.language')}</div>
              <div className="text-xs text-gray-400">{t('settings.language_desc')}</div>
            </div>
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            >
              {language === 'zh' ? 'EN' : '中文'}
            </button>
          </div>

          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <div>
              <div className="text-sm text-gray-200">{t('settings.theme')}</div>
              <div className="text-xs text-gray-400">{t('settings.theme_desc')}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${theme === 'solid' ? 'bg-white/10 text-gray-100' : 'bg-white/5 text-gray-400 hover:text-gray-200'}`}
                onClick={() => setTheme('solid')}
              >
                {t('settings.theme_solid')}
              </button>
              <button
                type="button"
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${theme === 'glass' ? 'bg-white/10 text-gray-100' : 'bg-white/5 text-gray-400 hover:text-gray-200'}`}
                onClick={() => setTheme('glass')}
              >
                {t('settings.theme_glass')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <div>
              <div className="text-sm text-gray-200">{t('settings.remember')}</div>
              <div className="text-xs text-gray-400">{t('settings.remember_desc')}</div>
            </div>
            <button type="button" className="btn-primary text-sm" onClick={clearRememberedEmail}>
              {t('settings.clear')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
