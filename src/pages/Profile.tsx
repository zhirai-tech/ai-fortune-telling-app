import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { Save, User as UserIcon, Zap, FileText, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../api/client';
import { useLocation, useNavigate } from 'react-router-dom';

export const Profile = () => {
  const { t, i18n } = useTranslation();
  const { session, profile, setProfile } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Profile info state
  const defaultProfile = {
    name: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    birthDate: '',
    birthTime: '',
    relationshipStatus: 'single' as 'single' | 'unmarried' | 'dating' | 'married',
    birthPlace: '',
    currentResidence: '',
  };
  const [profileData, setProfileData] = useState(defaultProfile);
  const defaultMemory = {
    askingStyle: '',
    slotCareer: '',
    slotWealth: '',
    slotLove: '',
    slotHealth: '',
  };
  const [memoryData, setMemoryData] = useState(defaultMemory);
  const [infoSaved, setInfoSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    if (profile) return;

    let cancelled = false;

    async function loadMe() {
      setBootstrapLoading(true);
      setBootstrapError(null);
      try {
        const data = await apiRequest<{ profile: any }>('/api/me');
        if (cancelled) return;
        setProfile(data.profile ?? null);
      } catch (e: any) {
        if (cancelled) return;
        setBootstrapError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setBootstrapLoading(false);
      }
    }

    loadMe();

    return () => {
      cancelled = true;
    };
  }, [profile, session?.accessToken, setProfile]);

  useEffect(() => {
    if (!profile) return;
    setProfileData({
      name: profile.name ?? '',
      gender: (profile.gender as any) ?? '',
      birthDate: profile.birth_date ?? '',
      birthTime: profile.birth_time ?? '',
      relationshipStatus: (profile as any).relationship_status ?? 'single',
      birthPlace: profile.birth_place ?? '',
      currentResidence: profile.current_residence ?? '',
    });
  }, [profile]);

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    async function loadMem() {
      try {
        const data = await apiRequest<{ rows: any[] }>('/api/memories');
        if (cancelled) return;
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        const find = (k: string) => rows.find((r) => String(r?.kind ?? '') === k)?.content ?? '';
        setMemoryData({
          askingStyle: String(find('asking_style') ?? ''),
          slotCareer: String(find('slot_career') ?? ''),
          slotWealth: String(find('slot_wealth') ?? ''),
          slotLove: String(find('slot_love') ?? ''),
          slotHealth: String(find('slot_health') ?? ''),
        });
      } catch {}
    }
    loadMem();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const handleInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const goBackToChat = new URLSearchParams(location.search).get('back') === 'chat';
    if (!session?.accessToken) {
      const now = new Date().toISOString();
      setProfile({
        id: profile?.id ?? 'local',
        email: null,
        role: 'free',
        status: 'active',
        locale: String(i18n.language ?? 'en'),
        name: profileData.name,
        gender: profileData.gender,
        birth_date: profileData.birthDate || null,
        birth_time: profileData.birthTime || null,
        relationship_status: profileData.relationshipStatus || null,
        birth_place: profileData.birthPlace,
        current_residence: profileData.currentResidence,
        daily_remaining: 0,
        daily_date: '',
        monthly_remaining: 0,
        monthly_month: '',
        vip_expiry: null,
        created_at: now,
        updated_at: now,
      } as any);
      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 2000);
      if (goBackToChat) navigate('/chat');
      return;
    }
    try {
      let cur = profile;
      if (!cur) {
        const me = await apiRequest<{ profile: any }>('/api/me');
        if (me?.profile) {
          setProfile(me.profile);
          cur = me.profile;
        }
      }
      const data = await apiRequest<{ profile: any }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileData.name,
          gender: profileData.gender,
          birth_date: profileData.birthDate || null,
          birth_time: profileData.birthTime || null,
          relationship_status: profileData.relationshipStatus,
          birth_place: profileData.birthPlace,
          current_residence: profileData.currentResidence,
        }),
      });
      if (data?.profile) setProfile(data.profile);

      await apiRequest('/api/memories/bulk', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { kind: 'asking_style', content: memoryData.askingStyle, importance: 4 },
            { kind: 'slot_career', content: memoryData.slotCareer, importance: 5 },
            { kind: 'slot_wealth', content: memoryData.slotWealth, importance: 5 },
            { kind: 'slot_love', content: memoryData.slotLove, importance: 5 },
            { kind: 'slot_health', content: memoryData.slotHealth, importance: 5 },
          ],
        }),
      }).catch(() => null);
    } catch (e: any) {
      alert(String(e?.message ?? e));
      return;
    }
    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2000);
    if (goBackToChat) navigate('/chat');
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ 
      ...prev, 
      [name]: value,
    }));
  };

  const handleMemoryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMemoryData((prev) => ({ ...prev, [name]: value }));
  };

  const formatCityCountry = (city: string, country: string) => {
    const c = city.trim();
    const k = country.trim();
    if (!c && !k) return '';
    if (!k) return c;
    if (!c) return k;
    if (i18n.language?.toLowerCase().startsWith('zh')) return `${k}·${c}`;
    return `${c}, ${k}`;
  };

  const resolveCityCountryFromCoords = async (lat: number, lon: number) => {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('zoom', '10');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: { 'accept-language': i18n.language || 'en' },
    });
    if (!res.ok) throw new Error('reverse_geocode_failed');
    const json = (await res.json()) as any;
    const addr = json?.address ?? {};

    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.village ||
      addr.county ||
      addr.state ||
      '';
    const country = addr.country || '';

    return { city: String(city), country: String(country) };
  };

  const resolveCityCountryFromIp = async () => {
    const tryFetchJson = async (url: string) => {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('ip_geocode_failed');
      return (await res.json()) as any;
    };

    const providers: Array<() => Promise<{ city: string; country: string }>> = [
      async () => {
        const json = await tryFetchJson('https://ipapi.co/json/');
        return { city: String(json?.city ?? ''), country: String(json?.country_name ?? '') };
      },
      async () => {
        const json = await tryFetchJson('https://geolocation-db.com/json/');
        return { city: String(json?.city ?? ''), country: String(json?.country_name ?? '') };
      },
      async () => {
        const url = new URL('https://ipwho.is/');
        url.searchParams.set('fields', 'success,country,city');
        const json = await tryFetchJson(url.toString());
        if (!json?.success) throw new Error('ip_geocode_failed');
        return { city: String(json?.city ?? ''), country: String(json?.country ?? '') };
      },
    ];

    let lastErr: unknown = null;
    for (const fn of providers) {
      try {
        const out = await fn();
        if (out.city || out.country) return out;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error('ip_geocode_failed');
  };

  const handleAutoLocate = async () => {
    setLocateError(null);

    if (!('geolocation' in navigator)) {
      try {
        const { city, country } = await resolveCityCountryFromIp();
        const text = formatCityCountry(city, country);
        if (!text) {
          setLocateError(t('profile.location_no_city'));
          return;
        }
        setProfileData((prev) => ({ ...prev, currentResidence: text }));
      } catch {
        setLocateError(t('profile.location_unsupported'));
      }
      return;
    }

    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 10 * 60 * 1000,
        });
      });

      const { city, country } = await resolveCityCountryFromCoords(
        pos.coords.latitude,
        pos.coords.longitude,
      );
      const text = formatCityCountry(city, country);
      if (!text) {
        setLocateError(t('profile.location_no_city'));
        return;
      }

      setProfileData((prev) => ({ ...prev, currentResidence: text }));
    } catch (e: any) {
      const code = Number(e?.code);
      if (code === 1) setLocateError(t('profile.location_denied'));
      else {
        try {
          const { city, country } = await resolveCityCountryFromIp();
          const text = formatCityCountry(city, country);
          if (!text) {
            setLocateError(t('profile.location_no_city'));
            return;
          }
          setProfileData((prev) => ({ ...prev, currentResidence: text }));
        } catch {
          if (code === 2) setLocateError(t('profile.location_unavailable'));
          else if (code === 3) setLocateError(t('profile.location_timeout'));
          else setLocateError(t('profile.location_failed'));
        }
      }
    } finally {
      setLocating(false);
    }
  };

  if (!session) return null;
  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-gray-400">
        <div className="card-container bg-deep-blue backdrop-blur-none w-full max-w-md text-center">
          <div className="text-sm text-gray-300">
            {bootstrapLoading ? t('common.loading') : t('profile.load_failed')}
          </div>
          {bootstrapError && <div className="mt-2 text-xs text-cinnabar-red break-words">{bootstrapError}</div>}
          <button
            type="button"
            className="mt-4 btn-primary text-sm px-6 py-3 disabled:opacity-50"
            disabled={bootstrapLoading}
            onClick={() => window.location.reload()}
          >
            {t('profile.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-container"
      >
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-dark-gold/20 rounded-full">
            <UserIcon className="h-6 w-6 text-dark-gold" />
          </div>
          <div>
            <h2 className="text-2xl font-serif">{t('profile.title')}</h2>
            <p className="text-gray-400">{profile.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-sm text-gray-400 mb-1">{t('profile.role')}</div>
            <div className="flex items-center space-x-2">
              <Zap className={`h-5 w-5 ${profile.role === 'paid' ? 'text-yellow-400' : 'text-gray-400'}`} />
              <span className={`font-semibold ${profile.role === 'paid' ? 'text-yellow-400' : ''}`}>
                {profile.role === 'paid' ? t('profile.paid_user') : t('profile.free_user')}
              </span>
            </div>
            {profile.role === 'paid' && profile.vip_expiry && (
              <div className="text-xs text-gray-500 mt-2">
                {t('profile.vip_expiry')}: {profile.vip_expiry === 'infinity' ? t('profile.vip_permanent') : new Date(profile.vip_expiry).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-sm text-gray-400 mb-1">{t('profile.daily_remaining')}</div>
            <div className="text-2xl font-bold">{profile.daily_remaining}</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-sm text-gray-400 mb-1">{t('profile.monthly_remaining')}</div>
            <div className="text-2xl font-bold">{profile.monthly_remaining}</div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-container"
      >
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="h-6 w-6 text-dark-gold" />
          <h2 className="text-2xl font-serif">{t('profile.personal_info')}</h2>
        </div>

        <form onSubmit={handleInfoSave} className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('profile.name')}</label>
              <input 
                type="text" 
                name="name"
                value={profileData.name}
                onChange={handleProfileChange}
                className="input-field"
                placeholder={t('profile.name_placeholder')}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('profile.gender')}</label>
              <select 
                name="gender"
                value={profileData.gender}
                onChange={handleProfileChange}
                className="input-field appearance-none bg-deep-blue"
              >
                <option value="">{t('profile.gender_select')}</option>
                <option value="male">{t('profile.gender_male')}</option>
                <option value="female">{t('profile.gender_female')}</option>
                <option value="other">{t('profile.gender_other')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('profile.relationship_status')}</label>
              <select
                name="relationshipStatus"
                value={profileData.relationshipStatus}
                onChange={handleProfileChange}
                className="input-field appearance-none bg-deep-blue"
              >
                <option value="single">{t('profile.relationship_single')}</option>
                <option value="unmarried">{t('profile.relationship_unmarried')}</option>
                <option value="dating">{t('profile.relationship_dating')}</option>
                <option value="married">{t('profile.relationship_married')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('profile.birth_date')}</label>
              <input 
                type="date" 
                name="birthDate"
                value={profileData.birthDate}
                onChange={handleProfileChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('profile.birth_time')}</label>
              <input 
                type="time" 
                name="birthTime"
                value={profileData.birthTime}
                onChange={handleProfileChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('profile.birth_place')}</label>
              <input 
                type="text" 
                name="birthPlace"
                value={profileData.birthPlace}
                onChange={handleProfileChange}
                className="input-field"
                placeholder={t('profile.birth_place_placeholder')}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">{t('profile.current_residence')}</label>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  name="currentResidence"
                  value={profileData.currentResidence}
                  onChange={handleProfileChange}
                  className="input-field flex-1"
                  placeholder={t('profile.current_residence_placeholder')}
                />
                <button
                  type="button"
                  className="btn-primary px-4 py-3 whitespace-nowrap flex items-center gap-2"
                  onClick={handleAutoLocate}
                  disabled={locating}
                >
                  <MapPin className="h-4 w-4" />
                  <span>{locating ? t('profile.locating') : t('profile.auto_locate')}</span>
                </button>
              </div>
              {locateError && <div className="text-xs text-red-400 mt-2">{locateError}</div>}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="h-5 w-5 text-dark-gold" />
              <h3 className="text-lg font-serif">
                {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '记忆（用于更贴近你的解读）' : 'Memory (for a more grounded reading)'}
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '提问/回答偏好（可选）' : 'Asking / response style (optional)'}
                </label>
                <textarea
                  name="askingStyle"
                  value={memoryData.askingStyle}
                  onChange={handleMemoryChange}
                  className="input-field min-h-[84px]"
                  placeholder={
                    String(i18n.language ?? '').toLowerCase().startsWith('zh')
                      ? '例如：希望简短直白；不喜欢被带节奏；优先只看今天。'
                      : 'E.g., keep it short and direct; avoid over-leading; focus on today.'
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '事业槽位（可选）' : 'Career slot (optional)'}
                </label>
                <textarea
                  name="slotCareer"
                  value={memoryData.slotCareer}
                  onChange={handleMemoryChange}
                  className="input-field min-h-[72px]"
                  placeholder={
                    String(i18n.language ?? '').toLowerCase().startsWith('zh')
                      ? '例如：岗位/行业；办公室或体力；是否高风险。'
                      : 'E.g., role/industry; office vs physical; any high-risk.'
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '财运槽位（可选）' : 'Wealth slot (optional)'}
                </label>
                <textarea
                  name="slotWealth"
                  value={memoryData.slotWealth}
                  onChange={handleMemoryChange}
                  className="input-field min-h-[72px]"
                  placeholder={
                    String(i18n.language ?? '').toLowerCase().startsWith('zh')
                      ? '例如：更关注收入/支出/投资/负债；投资类型（股票/基金/生意等）。'
                      : 'E.g., focus: income/spending/investment/debt; investment type: stocks/funds/business.'
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '感情槽位（可选）' : 'Love slot (optional)'}
                </label>
                <textarea
                  name="slotLove"
                  value={memoryData.slotLove}
                  onChange={handleMemoryChange}
                  className="input-field min-h-[72px]"
                  placeholder={
                    String(i18n.language ?? '').toLowerCase().startsWith('zh')
                      ? '例如：单身/暧昧/恋爱/已婚；更在意沟通还是推进关系。'
                      : 'E.g., single/dating/married; focus: communication vs progress.'
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {String(i18n.language ?? '').toLowerCase().startsWith('zh') ? '健康槽位（可选）' : 'Health slot (optional)'}
                </label>
                <textarea
                  name="slotHealth"
                  value={memoryData.slotHealth}
                  onChange={handleMemoryChange}
                  className="input-field min-h-[72px]"
                  placeholder={
                    String(i18n.language ?? '').toLowerCase().startsWith('zh')
                      ? '例如：旧疾/新症状；持续多久；是否影响睡眠/工作。'
                      : 'E.g., ongoing vs new; duration; affects sleep/work.'
                  }
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary flex items-center space-x-2">
            <Save className="h-5 w-5" />
            <span>{infoSaved ? t('profile.info_saved') : t('profile.save')}</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
