import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { Nfc, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../api/client';

export const Redeem = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile, setProfile } = useAppStore();
  const [code, setCode] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeFromUrl = params.get('code');
    if (codeFromUrl) {
      setCode(codeFromUrl);
    }
  }, [location]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      navigate('/login', { state: { returnTo: `/redeem?code=${code}` } });
      return;
    }
    
    try {
      const data = await apiRequest<{ profile?: any }>('/api/redeem', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      if (data?.profile) setProfile(data.profile);
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (e: any) {
      alert(String(e?.message ?? e) || '兑换失败');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-container w-full max-w-md text-center space-y-8"
      >
        {!isSuccess ? (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-dark-gold/20 rounded-full animate-pulse">
                <Nfc className="h-12 w-12 text-dark-gold" />
              </div>
            </div>
            <h2 className="text-2xl font-serif text-dark-gold">{t('redeem.title')}</h2>
            
            <form onSubmit={handleRedeem} className="space-y-6">
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('redeem.code')}
                className="input-field text-center text-lg tracking-widest uppercase"
                required
              />
              <button type="submit" className="w-full btn-primary py-3">
                {t('redeem.submit')}
              </button>
            </form>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-8"
          >
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-serif text-green-500">{t('redeem.success')}</h2>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
