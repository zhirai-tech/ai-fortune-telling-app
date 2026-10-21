import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { Compass, Languages, UserCircle2 } from 'lucide-react';
import { MobileNav } from './MobileNav';
import bgUrl from '../assets/bg/background.svg?url';
import baguaUrl from '../assets/bg/bagua.svg?url';
import taijiUrl from '../assets/bg/taiji-ink.png?url';
import fogUrl from '../assets/misc/fog.svg?url';

export const Layout = () => {
  const { t, i18n } = useTranslation();
  const { session, profile, clearAuth, language, setLanguage, theme } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isChat = location.pathname === '/chat';

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    const cls = 'theme-solid';
    if (theme === 'solid') document.body.classList.add(cls);
    else document.body.classList.remove(cls);
  }, [theme]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-transparent text-gray-200 relative">
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />

      <div className="fixed inset-x-0 top-0 pointer-events-none z-10">
        <div className="relative mx-auto h-[52vh] max-w-[980px]">
          <div className="absolute left-1/2 top-12 -translate-x-1/2 w-[min(96vmin,760px)] aspect-square">
            <img
              src={fogUrl}
              className="absolute left-1/2 top-[6%] w-[1200px] opacity-70 z-0 fog-drift-right [filter:blur(0.7px)_contrast(1.12)_brightness(1.08)]"
              style={{
                animationDuration: '240s',
                animationDelay: '-61s',
                WebkitMaskImage: 'radial-gradient(closest-side, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                maskImage: 'radial-gradient(closest-side, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
              }}
            />
            <img
              src={fogUrl}
              className="absolute left-1/2 top-[84%] w-[980px] opacity-70 z-0 fog-drift-left [filter:blur(0.7px)_contrast(1.12)_brightness(1.08)]"
              style={{
                animationDuration: '285s',
                animationDelay: '-143s',
                WebkitMaskImage: 'radial-gradient(closest-side, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                maskImage: 'radial-gradient(closest-side, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
              }}
            />
            <div
              className="absolute inset-0 w-full h-full opacity-80 spin-cw z-10"
              style={{
                backgroundColor: '#d9aa60',
                maskImage: `url(${baguaUrl})`,
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                maskSize: 'contain',
                WebkitMaskImage: `url(${baguaUrl})`,
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                WebkitMaskSize: 'contain',
              }}
            />
            <div className="absolute inset-0 scale-[0.56] z-10">
              <img src={taijiUrl} className="absolute inset-0 w-full h-full opacity-42 spin-ccw" />
            </div>
          </div>
        </div>
      </div>
      
      <nav
        className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 overflow-hidden"
        style={{
          backgroundImage: `url(${fogUrl}), linear-gradient(rgba(245,239,228,0.92), rgba(245,239,228,0.92))`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Compass className="h-8 w-8 text-[#d9aa60] drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" />
              <span className="font-serif text-2xl font-bold text-[#d9aa60] drop-shadow-[0_1px_10px_rgba(0,0,0,0.35)]">
                {t('common.app_name')}
              </span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-lg border border-white/10 bg-black/40 text-white/90 hover:text-[#d9aa60] hover:bg-black/60 transition-colors"
              >
                <Languages className="h-5 w-5" />
              </button>
              <Link
                to={session ? '/account' : '/login'}
                className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center overflow-hidden"
                aria-label={t('account.open_menu')}
              >
                {session ? (
                  <img src="/avatars/user.svg" className="h-full w-full" />
                ) : (
                  <UserCircle2 className="h-6 w-6 text-gray-300" />
                )}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main
        className={
          isChat
            ? 'relative z-20 h-[calc(100dvh-4rem)] overflow-hidden p-0 m-0 max-w-none'
            : 'relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pt-24 md:pb-[calc(8rem+env(safe-area-inset-bottom))]'
        }
      >
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};
