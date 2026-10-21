import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Send, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../api/client';
import { useAppStore } from '../store';
import { HexagramCard } from '../components/HexagramCard';
import { useNavigate } from 'react-router-dom';
import coinJustUrl from '../assets/coins/just.png?url';
import coinOppositeUrl from '../assets/coins/opposite.png?url';

type MsgAction =
  | { type: 'cast'; label: string }
  | { type: 'send'; label: string; text: string }
  | { type: 'profile'; label: string };
type Msg = {
  id?: string;
  role: 'user' | 'assistant';
  text: string;
  quickReplies?: string[];
  castLine?: number;
  actions?: MsgAction[];
  masterId?: number;
  meta?: ChatMeta;
  castStage?: 'anim' | 'revealed';
  hexBinary?: string;
  hexName?: string;
};
type ChatMeta = {
  coins?: number[];
  changingLines?: number[];
  primary?: { name?: string; binary?: string };
  relating?: { name?: string; binary?: string };
  basis?: { judgment?: string; lines?: string[]; allLines?: string[]; tuan?: string; xiang?: string; wenyan?: string };
  aiError?: string;
} | null;

function computeCoinFacesForLine(value: number) {
  const v = Number(value);
  if (v === 6) return [180, 180, 180] as const;
  if (v === 7) return [0, 180, 180] as const;
  if (v === 8) return [0, 0, 180] as const;
  return [0, 0, 0] as const;
}

function Coin3D({ kf, duration }: { kf: [number, number, number]; duration: number }) {
  return (
    <div className="h-10 w-10 [perspective:600px]">
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: kf, scaleX: [1, 0.45, 1], scaleY: [1, 0.94, 1] }}
        transition={{ duration, times: [0, 0.75, 1], ease: ['linear', 'easeOut'] }}
      >
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),rgba(255,255,255,0.05),rgba(0,0,0,0.08))] opacity-60" />
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <img src={coinJustUrl} className="h-full w-full rounded-full" />
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <img src={coinOppositeUrl} className="h-full w-full rounded-full" />
        </div>
        <div className="absolute inset-0 rounded-full ring-1 ring-black/20" />
      </motion.div>
    </div>
  );
}

export function Chat() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ id: '__welcome__', role: 'assistant', text: t('chat.welcome') }]);
  const [chatMeta, setChatMeta] = useState<ChatMeta>(null);
  const pendingQuestionRef = useRef<string>('');
  const castInFlightRef = useRef(false);
  const castForceNewRef = useRef(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const castRetryRef = useRef(false);

  const profileOut = useMemo(() => {
    if (!profile) return null;
    return {
      name: profile.name,
      gender: profile.gender,
      birth_date: profile.birth_date,
      birth_time: profile.birth_time,
      relationship_status: profile.relationship_status,
      birth_place: profile.birth_place,
      current_residence: profile.current_residence,
    };
  }, [profile]);
  const [castKF, setCastKF] = useState<[[number, number, number], [number, number, number], [number, number, number]]>([
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]);
  const [castDur, setCastDur] = useState<[number, number, number]>([1.1, 1.6, 2.1]);
  const [masterAvatarError, setMasterAvatarError] = useState<Record<number, boolean>>({});
  const [activeMasterId, setActiveMasterId] = useState<number | null>(null);

  const locale = i18n.language || 'en';
  const [chatLocale, setChatLocale] = useState(locale);
  const canSend = useMemo(() => !loading && text.trim().length > 0, [loading, text]);
  const draftKey = useMemo(() => `yijing_chat_draft_v1_${String(chatLocale ?? '').toLowerCase()}`, [chatLocale]);
  const speechSupported = useMemo(() => {
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);
  const [speechOn, setSpeechOn] = useState(false);
  const [speechMsg, setSpeechMsg] = useState<string>('');
  const speechRef = useRef<any>(null);
  const speechBaseRef = useRef<string>('');
  const speechLang = useMemo(() => (String(chatLocale ?? '').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'), [chatLocale]);

  React.useEffect(() => {
    const cur = i18n.language || 'en';
    setChatLocale(cur);
    setMsgs((prev) => {
      if (prev.length === 1 && prev[0]?.id === '__welcome__') {
        return [{ ...prev[0], text: t('chat.welcome') }];
      }
      return prev;
    });
  }, [i18n.language, t]);

  React.useEffect(() => {
    return () => {
      try {
        if (speechRef.current) speechRef.current.stop();
      } catch {}
    };
  }, []);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      if (!parsed || parsed.v !== 1) return;
      if (Array.isArray(parsed.msgs) && parsed.msgs.length) setMsgs(parsed.msgs);
      if (parsed.chatMeta !== undefined) setChatMeta(parsed.chatMeta);
      if (typeof parsed.activeMasterId === 'number') setActiveMasterId(parsed.activeMasterId);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  React.useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ v: 1, msgs, chatMeta, activeMasterId }));
    } catch {}
  }, [draftKey, msgs, chatMeta, activeMasterId]);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!atBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [msgs.length]);

  const masters = useMemo(() => {
    return [
      {
        id: 0,
        name: '太极大师',
        avatar: '/avatars/masters/taiji.png',
        status: 'online' as const,
      },
    ];
  }, []);

  React.useEffect(() => {
    if (typeof activeMasterId === 'number') return;
    const online = masters.find((m) => m.status === 'online');
    setActiveMasterId(online?.id ?? masters[0]?.id ?? 0);
  }, [activeMasterId, masters]);

  const currentMasterId = typeof activeMasterId === 'number' ? activeMasterId : masters[0]?.id ?? 0;

  const masterById = useMemo(() => {
    const m = new Map<number, (typeof masters)[number]>();
    for (const x of masters) m.set(x.id, x);
    return m;
  }, [masters]);

  const shouldCast = (q: string) => {
    const s = String(q ?? '').trim();
    if (!s) return false;
    if (/^[\d\s]+$/.test(s)) return false;
    if (/^[\s~`!@#$%^&*()_\-+={}\[\]|\\:;"'<>,.?/]+$/.test(s)) return false;
    const hasZh = /[\u4e00-\u9fff]/.test(s);
    if (hasZh) return /(易经|算命|占卜|起卦|卦|爻|运势|运气|财运|财富|感情|爱情|恋爱|健康|事业|工作|升职|面试|合作|谈判)/.test(s);
    return /\b(i\s*ching|hexagram|divination|cast|fortune|luck|wealth|money|finance|love|relationship|health|career|work|job|negotiation|deal)\b/i.test(s);
  };

  const wantsRecast = (q: string) => {
    const s = String(q ?? '').trim();
    if (!s) return false;
    const hasZh = /[\u4e00-\u9fff]/.test(s);
    if (hasZh) return /(再算|重算|重新|再来一次|再来一卦|再起一卦|再占|再卜)/.test(s);
    return /\b(recast|redo|again|one more time|another cast)\b/i.test(s);
  };

  const startCastAnim = (lineValue: number) => {
    const faces = computeCoinFacesForLine(lineValue);
    const spins = [8, 10, 9] as const;
    const mk = (s: number, end: number) => {
      const mid = 360 * s;
      return [0, mid, mid + end] as [number, number, number];
    };
    setCastDur([1.1, 1.6, 2.1]);
    setCastKF([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    window.setTimeout(() => {
      setCastKF([mk(spins[0], faces[0]), mk(spins[1], faces[1]), mk(spins[2], faces[2])]);
    }, 30);
  };

  const ensureMeta = async (forceNew?: boolean) => {
    if (!forceNew && chatMeta?.basis?.judgment) return chatMeta;
    const d = await apiRequest<{ meta: any }>(`/api/chat/cast`, {
      method: 'POST',
      body: JSON.stringify({ locale: chatLocale }),
    });
    if (d?.meta) setChatMeta(d.meta);
    return d?.meta ?? null;
  };

  const splitIntoBubbles = (text: string, isZhUI: boolean) => {
    const raw = String(text ?? '').trim();
    if (!raw) return [];
    const paras = raw.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    const maxLen = isZhUI ? 60 : 140;
    const out: string[] = [];
    const splitSentences = (p: string) => {
      const re = isZhUI ? /([。！？；\n]+)/ : /([.?!;\n]+)/;
      const parts: string[] = [];
      let cur = '';
      for (const ch of p) {
        cur += ch;
        if (re.test(ch)) {
          const t = cur.trim();
          if (t) parts.push(t);
          cur = '';
        }
      }
      if (cur.trim()) parts.push(cur.trim());
      return parts;
    };
    for (const p of paras) {
      const sents = splitSentences(p);
      let cur = '';
      for (const s of sents) {
        if (!cur) {
          cur = s;
          continue;
        }
        if ((cur + s).length <= maxLen) {
          cur += (isZhUI ? '' : ' ') + s;
        } else {
          out.push(cur.trim());
          cur = s;
        }
      }
      if (cur.trim()) out.push(cur.trim());
    }
    return out.slice(0, 10);
  };

  const setProcessingTyping = (on: boolean) => {
    const isZhUI = chatLocale.toLowerCase().startsWith('zh');
    if (on) {
      setMsgs((prev) => {
        if (prev.some((m) => m.id === '__processing__')) return prev;
        return [...prev, { id: '__processing__', role: 'assistant', masterId: currentMasterId, text: isZhUI ? '正在输入' : 'Typing' }];
      });
    } else {
      setMsgs((prev) => prev.filter((m) => m.id !== '__processing__'));
    }
  };

  const enqueueAssistantChunks = async (reply: string, actions?: MsgAction[]) => {
    const text = String(reply ?? '').trim();
    if (!text) return;
    const isZhUI = chatLocale.toLowerCase().startsWith('zh');
    const chunks = splitIntoBubbles(text, isZhUI);
    const out = chunks.length ? chunks : [text];

    for (let i = 0; i < out.length; i++) {
      const mid = currentMasterId;
      setMsgs((prev) => [...prev, { id: '__typing__', role: 'assistant', masterId: mid, text: isZhUI ? '正在输入' : 'Typing' }]);
      const piece = out[i];
      const delay = Math.min(3500, Math.max(650, 520 + piece.length * (isZhUI ? 25 : 12)));
      await new Promise((r) => window.setTimeout(r, delay));
      setMsgs((prev) => {
        const next = prev.filter((m) => m.id !== '__typing__' && m.id !== '__processing__');
        const lastActions = i === out.length - 1 ? actions : undefined;
        return [...next, { role: 'assistant', masterId: mid, text: piece, actions: lastActions }];
      });
    }
  };

  const shortHexName = (name: string) => {
    const s = String(name ?? '').trim();
    if (!s) return '';
    if (/[\u4e00-\u9fff]/.test(s) && s.includes('为')) return s.split('为').slice(-1)[0].trim();
    return s;
  };

  const looksLikeCastPrompt = (text: string, isZhUI: boolean) => {
    const s = String(text ?? '').trim();
    if (!s) return false;
    if (isZhUI) return /(起卦|起一卦)/.test(s) && /(点击|按|按钮)/.test(s);
    return /\bcast\b/i.test(s) && /\b(click|press|button)\b/i.test(s);
  };

  const beginCastFlow = async () => {
    if (castInFlightRef.current) return;
    const question = pendingQuestionRef.current;
    if (!question) return;
    castInFlightRef.current = true;
    setLoading(true);
    try {
      const meta = await ensureMeta(castForceNewRef.current);
      setChatMeta(meta);
      const lineValue = Number(meta?.coins?.[0] ?? 8);
      const castId = `__cast__${Date.now()}`;
      setMsgs((prev) => [...prev, { id: castId, role: 'user', text: '', castLine: lineValue, castStage: 'anim', meta }]);
      startCastAnim(lineValue);
      await new Promise((r) => window.setTimeout(r, 2100));

      setMsgs((prev) => prev.map((m) => (m.id === castId ? { ...m, castStage: 'revealed' } : m)));

      const isZhUI = chatLocale.toLowerCase().startsWith('zh');
      const hb = String(meta?.primary?.binary ?? '').trim();
      const hn = String(meta?.primary?.name ?? '').trim();
      const masterId = currentMasterId;
      if (hb && hn) {
        setMsgs((prev) => [
          ...prev,
          {
            role: 'assistant',
            masterId,
            text: isZhUI ? `得卦：${shortHexName(hn)}` : `Hexagram: ${hn}`,
            hexBinary: hb,
            hexName: isZhUI ? shortHexName(hn) : hn,
            meta,
          }
        ]);
      }

      const history = msgs
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .filter((m) => m.id !== '__typing__' && !(m.id || '').startsWith('__cast__'))
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.text }));
      setProcessingTyping(true);
      const data = await apiRequest<{ reply: string; meta?: any; actions?: MsgAction[] }>(`/api/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: question, locale: chatLocale, history, meta, profile: profileOut }),
      });
      setProcessingTyping(false);
      const r0 = String(data?.reply ?? '').trim();
      const asksCastAgain = isZhUI ? /^要为此事起一卦吗[？?]?$/.test(r0) : /^Cast a hexagram for this\??$/.test(r0);
      if (asksCastAgain && meta?.basis?.judgment && !castRetryRef.current) {
        castRetryRef.current = true;
        const msg = isZhUI ? '请按刚才起得之卦，直接解读此事。' : 'Please interpret the cast for this question.';
        setProcessingTyping(true);
        const data2 = await apiRequest<{ reply: string; meta?: any; actions?: MsgAction[] }>(`/api/chat`, {
          method: 'POST',
          body: JSON.stringify({ message: msg, locale: chatLocale, history, meta, profile: profileOut }),
        });
        setProcessingTyping(false);
        if (data2?.meta) setChatMeta(data2.meta);
        await enqueueAssistantChunks(data2.reply, Array.isArray(data2.actions) ? data2.actions : undefined);
        return;
      }
      if (data?.meta) setChatMeta(data.meta);
      await enqueueAssistantChunks(data.reply, Array.isArray(data.actions) ? data.actions : undefined);
    } catch (e2: any) {
      const raw = String(e2?.message ?? e2).trim();
      const code = raw.match(/^http_(\d{3})$/)?.[1] ?? '';
      const msg =
        code === '404'
          ? chatLocale.toLowerCase().startsWith('zh')
            ? '对话接口未部署成功'
            : 'Chat API is not deployed.'
          : raw || (chatLocale.toLowerCase().startsWith('zh') ? '请求失败' : 'Request failed');
      setMsgs((prev) => [...prev, { role: 'assistant', masterId: currentMasterId, text: msg }]);
    } finally {
      setProcessingTyping(false);
      setLoading(false);
      castInFlightRef.current = false;
      pendingQuestionRef.current = '';
      castForceNewRef.current = false;
      castRetryRef.current = false;
    }
  };

  const sendText = async (q: string) => {
    const question = String(q ?? '').trim();
    if (!question) return;
    setLoading(true);
    setMsgs((prev) => [...prev, { id: `u_${Date.now()}`, role: 'user', text: question }]);
    try {
      setProcessingTyping(true);
      let meta = chatMeta;
      const recast = wantsRecast(question) && !!meta?.basis?.judgment;
      if (recast && shouldCast(question)) {
        pendingQuestionRef.current = question;
        castForceNewRef.current = true;
        const isZhUI = chatLocale.toLowerCase().startsWith('zh');
        const prompt = isZhUI
          ? '一事一占，以第一次为准；再起之卦仅供参考。还要再起一卦吗？'
          : 'One matter, one cast. The first is primary; recasts are for reference. Cast again?';
        const label = isZhUI ? '再起一卦' : 'Cast again';
        setMsgs((prev) => [...prev, { role: 'assistant', masterId: currentMasterId, text: prompt, actions: [{ type: 'cast', label }] }]);
        setLoading(false);
        return;
      }
      if (shouldCast(question)) {
        pendingQuestionRef.current = question;
        castForceNewRef.current = true;
        const isZhUI = chatLocale.toLowerCase().startsWith('zh');
        const prompt = isZhUI ? '要为此事起一卦吗？' : 'Cast a hexagram for this?';
        const label = isZhUI ? '起卦' : 'Cast';
        setMsgs((prev) => [...prev, { role: 'assistant', masterId: currentMasterId, text: prompt, actions: [{ type: 'cast', label }] }]);
        setLoading(false);
        return;
      }

      const history = [...msgs, { role: 'user', text: question } as Msg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .filter((m) => m.id !== '__typing__' && !(m.id || '').startsWith('__cast__'))
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.text }));
      const data = await apiRequest<{ reply: string; meta?: any; actions?: MsgAction[] }>(`/api/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: question, locale: chatLocale, history, meta, profile: profileOut }),
      });
      if (data?.meta) setChatMeta(data.meta);

      const isZhUI = chatLocale.toLowerCase().startsWith('zh');
      const serverActions = Array.isArray(data?.actions) ? data.actions : null;
      if ((serverActions && serverActions.some((a: any) => a?.type === 'cast')) || looksLikeCastPrompt(data?.reply, isZhUI)) {
        pendingQuestionRef.current = question;
        castForceNewRef.current = true;
        const label = isZhUI ? '起卦' : 'Cast';
        setMsgs((prev) => [
          ...prev,
          { role: 'assistant', masterId: currentMasterId, text: String(data?.reply ?? '').trim(), actions: serverActions ?? [{ type: 'cast', label }] },
        ]);
        setLoading(false);
        setProcessingTyping(false);
        return;
      }
      setProcessingTyping(false);
      await enqueueAssistantChunks(data.reply, serverActions ?? undefined);
    } catch (e2: any) {
      const raw = String(e2?.message ?? e2).trim();
      const code = raw.match(/^http_(\d{3})$/)?.[1] ?? '';
      const msg =
        raw === 'ai_failed' || raw === 'ai_empty'
          ? chatLocale.toLowerCase().startsWith('zh')
            ? '对话服务暂不可用（AI 未就绪），请稍后再试'
            : 'Chat service is temporarily unavailable (AI not ready). Please try again later.'
          : raw === 'rules_load_failed'
            ? chatLocale.toLowerCase().startsWith('zh')
              ? '对话服务初始化失败（规则库加载失败）'
              : 'Chat initialization failed (rules load failed).'
            : code === '404'
              ? chatLocale.toLowerCase().startsWith('zh')
                ? '对话接口未部署成功，请先更新后端并重启服务'
                : 'Chat API is not deployed. Please update backend and restart service.'
              : code
                ? chatLocale.toLowerCase().startsWith('zh')
                  ? `请求失败（${code}）`
                  : `Request failed (${code})`
                : raw || (chatLocale.toLowerCase().startsWith('zh') ? '请求失败' : 'Request failed');
      setMsgs((prev) => [...prev, { role: 'assistant', masterId: currentMasterId, text: msg }]);
    } finally {
      setProcessingTyping(false);
      setLoading(false);
    }
  };

  const handleQuickReply = async (q: string) => {
    if (loading) return;
    const s = String(q ?? '').trim();
    if (!s) return;
    setText('');
    await sendText(s);
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    const q = text.trim();
    if (!q) return;
    try {
      if (speechRef.current) speechRef.current.stop();
    } catch {}
    setSpeechOn(false);
    setText('');
    await sendText(q);
  };

  const toastSpeech = (s: string) => {
    setSpeechMsg(s);
    window.setTimeout(() => setSpeechMsg(''), 3500);
  };

  const toggleSpeech = async () => {
    if (!speechSupported) return;
    const isZhUI = chatLocale.toLowerCase().startsWith('zh');
    if (!window.isSecureContext) {
      toastSpeech(isZhUI ? '语音输入需要 HTTPS 才能使用' : 'Voice input requires HTTPS');
      return;
    }
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!speechOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        for (const t of stream.getTracks()) t.stop();
      } catch {
        toastSpeech(isZhUI ? '无法获取麦克风权限' : 'Microphone permission denied');
        return;
      }
      const rec = new SR();
      speechRef.current = rec;
      speechBaseRef.current = text;
      rec.lang = speechLang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = (evt: any) => {
        let finalText = '';
        let interim = '';
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          const res = evt.results[i];
          const piece = String(res?.[0]?.transcript ?? '');
          if (res?.isFinal) finalText += piece;
          else interim += piece;
        }
        const base = speechBaseRef.current || '';
        const combined = `${base}${base && (finalText || interim) ? ' ' : ''}${(finalText + interim).trim()}`.trimStart();
        setText(combined);
      };
      rec.onaudiostart = () => toastSpeech(isZhUI ? '正在听…' : 'Listening…');
      rec.onnomatch = () => toastSpeech(isZhUI ? '没听清，请再说一遍' : "Didn't catch that. Try again.");
      rec.onerror = (evt: any) => {
        const code = String(evt?.error ?? '');
        const mapZh: Record<string, string> = {
          'not-allowed': '麦克风权限被拒绝',
          'service-not-allowed': '语音服务不可用',
          'audio-capture': '无法访问麦克风',
          network: '网络异常导致语音识别不可用',
          'no-speech': '没有检测到语音',
          aborted: '已停止语音输入',
        };
        const mapEn: Record<string, string> = {
          'not-allowed': 'Microphone permission denied',
          'service-not-allowed': 'Speech service not allowed',
          'audio-capture': 'Cannot access microphone',
          network: 'Network error (speech unavailable)',
          'no-speech': 'No speech detected',
          aborted: 'Voice input stopped',
        };
        toastSpeech((isZhUI ? mapZh[code] : mapEn[code]) || (isZhUI ? '语音识别失败' : 'Speech recognition failed'));
        setSpeechOn(false);
        try {
          rec.stop();
        } catch {}
      };
      rec.onend = () => {
        setSpeechOn(false);
        toastSpeech(isZhUI ? '语音输入已停止' : 'Voice input stopped');
      };
      try {
        rec.start();
        setSpeechOn(true);
      } catch {
        setSpeechOn(false);
        toastSpeech(isZhUI ? '语音启动失败' : 'Failed to start voice input');
      }
      return;
    }
    try {
      if (speechRef.current) speechRef.current.stop();
    } catch {}
    setSpeechOn(false);
  };

  const isZhUI = chatLocale.toLowerCase().startsWith('zh');
  const activeMaster = masterById.get(currentMasterId) ?? masters[0];
  const headerTitle = msgs.some((m) => m.id === '__typing__' || m.id === '__processing__') || loading ? (isZhUI ? '正在输入…' : 'Typing…') : activeMaster?.name ?? (isZhUI ? '大师' : 'Master');

  return (
    <div className="fixed left-0 right-0 top-16 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 overflow-hidden">
      <div className="h-full w-full flex flex-col overflow-hidden border-t border-white/10 bg-transparent">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-transparent">
          <div className="flex items-center gap-3">
            <img
              src={activeMaster ? (masterAvatarError[activeMaster.id] ? '/avatars/user.svg' : activeMaster.avatar) : '/avatars/user.svg'}
              onError={() => {
                if (activeMaster) setMasterAvatarError((p) => ({ ...p, [activeMaster.id]: true }));
              }}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="h-10 w-10 rounded-full border border-white/10 bg-black/20"
            />
            <div className="text-sm font-bold text-gray-200/90" style={{ fontSize: '31px', lineHeight: '26px', color: '#1e1d1a' }}>
              {headerTitle}
            </div>
          </div>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto space-y-3 px-4 py-4"
          onScroll={() => {
            const el = listRef.current;
            if (!el) return;
            const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
            atBottomRef.current = gap < 80;
          }}
        >
          {msgs.map((m, idx) => (
            <div key={m.id || idx} className={`flex items-start gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && (
                (() => {
                  const mid = typeof m.masterId === 'number' ? m.masterId : currentMasterId;
                  const master = masterById.get(mid) ?? masters[0];
                  const src = masterAvatarError[master.id] ? '/avatars/user.svg' : master.avatar;
                  return (
                    <img
                      src={src}
                      onError={() => setMasterAvatarError((p) => ({ ...p, [master.id]: true }))}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="h-10 w-10 self-start rounded-full border border-white/10 bg-black/20"
                    />
                  );
                })()
              )}
              <div
                className={`max-w-[84%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 text-base leading-relaxed whitespace-pre-wrap shadow-sm ${
                  (m.id || '').startsWith('__cast__')
                    ? 'bg-transparent text-white shadow-none px-0 py-0'
                    : m.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-md'
                      : 'bg-white/95 text-slate-900 rounded-tl-md'
                }`}
                style={{ fontFamily: 'Tahoma, Geneva, sans-serif' }}
              >
                {(m.id || '').startsWith('__cast__') ? (
                  <div className="flex items-center gap-3 py-2">
                    <Coin3D kf={castKF[0]} duration={castDur[0]} />
                    <Coin3D kf={castKF[1]} duration={castDur[1]} />
                    <Coin3D kf={castKF[2]} duration={castDur[2]} />
                  </div>
                ) : m.id === '__typing__' ? (
                  <span className="animate-pulse">{m.text}</span>
                ) : (
                  m.text
                )}
                {m.role === 'assistant' && m.hexBinary && (
                  <div className="mt-2 inline-flex items-start">
                    <div className="origin-top-left scale-[0.45] -ml-3 -mt-3">
                      <HexagramCard
                        title={String(m.hexName ?? '')}
                        primaryBinary={String(m.hexBinary ?? '')}
                        relatingTitle={String(m.meta?.relating?.name ?? '')}
                        relatingBinary={String(m.meta?.relating?.binary ?? '')}
                        changingLines={Array.isArray(m.meta?.changingLines) ? m.meta?.changingLines : []}
                        showRelating={false}
                        showChanging={false}
                        showBasis={false}
                      />
                    </div>
                  </div>
                )}
                {m.role === 'assistant' && Array.isArray(m.actions) && m.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.actions.map((a, i) => (
                      <button
                        key={i}
                        type="button"
                        className="text-sm px-3 py-2 rounded-md border border-dark-gold/30 bg-dark-gold/10 hover:bg-dark-gold/15 transition-colors"
                        onClick={() => {
                          if (a.type === 'cast') beginCastFlow();
                          if (a.type === 'send') handleQuickReply(a.text);
                          if (a.type === 'profile') navigate('/profile?back=chat');
                        }}
                        disabled={loading}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <img src="/avatars/user.svg" className="h-10 w-10 self-start rounded-full border border-white/10 bg-black/20" />
              )}
            </div>
          ))}
          <div ref={listEndRef} />
        </div>

        <form onSubmit={send} className="flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-transparent">
          <input
            className="input-field flex-1 h-12 border-dark-gold/70 bg-dark-gold/55 text-[#1c1606] placeholder:text-[#1c1606]/70 focus:border-dark-gold focus:ring-dark-gold"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('chat.input_placeholder')}
            disabled={loading}
          />
          {speechSupported && (
            <button
              type="button"
              className="h-12 w-12 rounded-lg border border-dark-gold/70 bg-dark-gold/55 text-[#1c1606] hover:bg-dark-gold/65 hover:border-dark-gold transition-colors flex items-center justify-center disabled:opacity-50"
              onClick={() => toggleSpeech()}
              disabled={loading}
            >
              {speechOn ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          <button
            type="submit"
            className="h-12 w-12 rounded-lg border border-dark-gold/80 bg-dark-gold/60 text-[#1c1606] hover:bg-dark-gold/75 hover:shadow-[0_0_18px_rgba(212,175,55,0.35)] transition-colors flex items-center justify-center disabled:opacity-50"
            disabled={!canSend}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        {!!speechMsg && <div className="px-4 pb-2 text-xs text-gray-400">{speechMsg}</div>}
      </div>
    </div>
  );
}
