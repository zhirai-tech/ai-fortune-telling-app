import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Sparkles, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import fogUrl from '../assets/misc/fog.svg?url';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const items: NavItem[] = [
    { to: '/', label: t('nav.today'), icon: HomeIcon },
    { to: '/divination', label: t('nav.divination'), icon: Sparkles },
    { to: '/chat', label: t('nav.chat'), icon: MessageCircle },
  ];

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 overflow-hidden"
      style={{
        backgroundImage: `url(${fogUrl}), linear-gradient(rgba(245,239,228,0.92), rgba(245,239,228,0.92))`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative z-20 max-w-7xl mx-auto px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
        <div className="grid grid-cols-3 gap-2">
          {items.map((it) => {
            const active = location.pathname === it.to || (it.to !== '/' && location.pathname.startsWith(it.to));
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1.5 transition-colors border ${
                  active
                    ? 'text-[#d9aa60] bg-black/60 border-white/15'
                    : 'text-white/90 bg-black/40 border-white/10 hover:text-[#d9aa60] hover:bg-black/60'
                }`}
              >
                <Icon className="h-7 w-7" />
                <span className={`text-[14px] leading-none ${active ? 'font-extrabold' : 'font-bold'}`}>{it.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
