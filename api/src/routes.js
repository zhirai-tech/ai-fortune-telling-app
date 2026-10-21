import express from 'express';
import { exec, getPool, query } from './db.js';
import { callChatJSON, callChatText } from './ai.js';
import {
  buildBasis,
  castCoins,
  computeHexagramsFromCoins,
  isZh,
  loadIchingRules
} from './iching.js';
import { compilePatterns, fillTemplate, loadChatConfig, matchAny } from './chat_config.js';
import {
  loadProfile,
  normalizeProfileRow,
  registerUser,
  requireAdmin,
  requireAuth,
  optionalAuth,
  signAccessToken,
  upsertGoogleUser,
  verifyLogin
} from './auth.js';

export function buildRouter() {
  const r = express.Router();
  const chatPatternCache = { zh: null, en: null };
  let memoryTableEnsured = false;

  const ensureMemoryTable = async () => {
    if (memoryTableEnsured) return;
    await exec(
      `create table if not exists user_memories (
        id char(36) primary key,
        user_id char(36) not null,
        kind varchar(32) not null,
        content text not null,
        importance tinyint not null default 1,
        created_at datetime not null,
        updated_at datetime not null,
        index idx_um_user_updated (user_id, updated_at),
        index idx_um_user_kind (user_id, kind),
        constraint fk_um_user foreign key (user_id) references users(id) on delete cascade
      ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;`
    );
    memoryTableEnsured = true;
  };

  const loadUserMemories = async (userId, limit = 8) => {
    await ensureMemoryTable();
    const n = Math.min(20, Math.max(1, Number(limit ?? 8)));
    const rows = await query(
      'select id,kind,content,importance,updated_at from user_memories where user_id=? order by importance desc, updated_at desc limit ?',
      [userId, n]
    ).catch(() => []);
    return Array.isArray(rows) ? rows : [];
  };

  const countUserMemories = async (userId) => {
    await ensureMemoryTable();
    const rows = await query('select count(1) as c from user_memories where user_id=?', [userId]).catch(() => []);
    const n = Number((Array.isArray(rows) ? rows?.[0]?.c : 0) ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const upsertSingletonMemory = async (userId, kind, content, importance = 3) => {
    await ensureMemoryTable();
    const k = String(kind ?? '').trim().slice(0, 32);
    const c = String(content ?? '').trim();
    const imp = Math.min(5, Math.max(1, Number(importance ?? 3)));
    if (!k || !c) return;
    const now = new Date();
    const rows = await query('select id from user_memories where user_id=? and kind=? order by updated_at desc limit 1', [userId, k]).catch(
      () => []
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row?.id) {
      await exec('update user_memories set content=?, importance=?, updated_at=? where id=? and user_id=?', [c, imp, now, row.id, userId]);
      return;
    }
    await exec('insert into user_memories (id,user_id,kind,content,importance,created_at,updated_at) values (?,?,?,?,?,?,?)', [
      crypto.randomUUID(),
      userId,
      k,
      c,
      imp,
      now,
      now
    ]);
  };

  const upsertUserMemory = async (userId, kind, content, importance = 1) => {
    await ensureMemoryTable();
    const k = String(kind ?? '').trim().slice(0, 32);
    const c = String(content ?? '').trim();
    const imp = Math.min(5, Math.max(1, Number(importance ?? 1)));
    if (!k || !c) return;
    const now = new Date();
    const exist = await query('select id,importance from user_memories where user_id=? and kind=? and content=? limit 1', [userId, k, c]).catch(
      () => []
    );
    const row = Array.isArray(exist) ? exist[0] : null;
    if (row?.id) {
      const nextImp = Math.max(Number(row.importance ?? 1), imp);
      await exec('update user_memories set importance=?, updated_at=? where id=? and user_id=?', [nextImp, now, row.id, userId]);
      return;
    }
    await exec('insert into user_memories (id,user_id,kind,content,importance,created_at,updated_at) values (?,?,?,?,?,?,?)', [
      crypto.randomUUID(),
      userId,
      k,
      c,
      imp,
      now,
      now
    ]);
  };

  const allowedMemoryKinds = new Set([
    'preference',
    'fact',
    'constraint',
    'asking_style',
    'slot_career',
    'slot_wealth',
    'slot_love',
    'slot_health',
    'profile_summary'
  ]);

  const isSingletonKind = (k) => {
    const s = String(k ?? '').trim();
    return s === 'profile_summary' || s === 'asking_style' || s.startsWith('slot_');
  };

  const replaceUserMemories = async (userId, items, keepKinds = []) => {
    await ensureMemoryTable();
    const keep = new Set(Array.isArray(keepKinds) ? keepKinds : []);
    const keptRows = keep.size
      ? await query(
          `select id,user_id,kind,content,importance,created_at,updated_at from user_memories where user_id=? and kind in (${[
            ...keep
          ]
            .map(() => '?')
            .join(',')})`,
          [userId, ...[...keep]]
        ).catch(() => [])
      : [];
    await exec('delete from user_memories where user_id=?', [userId]);
    const now = new Date();
    const rowsToInsert = [];
    const append = (k, c, imp) => {
      const kind = String(k ?? '').trim().slice(0, 32);
      const content = String(c ?? '').trim();
      const importance = Math.min(5, Math.max(1, Number(imp ?? 1)));
      if (!kind || !content) return;
      rowsToInsert.push([crypto.randomUUID(), userId, kind, content, importance, now, now]);
    };
    for (const r of Array.isArray(keptRows) ? keptRows : []) append(r.kind, r.content, r.importance);
    for (const it of Array.isArray(items) ? items : []) append(it.kind, it.content, it.importance);
    for (const row of rowsToInsert) {
      await exec('insert into user_memories (id,user_id,kind,content,importance,created_at,updated_at) values (?,?,?,?,?,?,?)', row);
    }
  };

  r.get('/health', (_req, res) => res.json({ ok: true }));

  r.get('/daily-fortunes', async (req, res) => {
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;
    const locale = String(req.query.locale ?? 'en');

    const dims = ['overall', 'love', 'wealth', 'health', 'career'];

    const rows = await query(
      'select dimension,score,text,locale,date from daily_fortunes where date=? and locale=?',
      [today, locale]
    );
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === dims.length) {
      const byDim = new Map(list.map((r) => [String(r.dimension), r]));
      const fortunes = dims.map((dim) => ({
        dimension: dim,
        score: Number(byDim.get(dim)?.score ?? 0),
        text: String(byDim.get(dim)?.text ?? ''),
        locale
      }));
      return res.json({ date: today, fortunes, generatedBy: 'db' });
    }

    let fortunes = [];
    try {
      const prompt = isZh(locale)
        ? `请为日期 ${today} 生成“每日运势”JSON（只输出JSON对象），维度固定为 overall,love,wealth,health,career。\n要求：\n- 返回格式：{ "fortunes": [ { "dimension": "overall|love|wealth|health|career", "score": 0-100整数, "text": "一段中文，40-90字" } ] }\n- 文案必须每天不同，不要套模板，不要重复前一天。\n- 文字用人话，避免夸张承诺；建议具体可执行。\n- fortunes 数组必须包含且仅包含这5个维度。\n只输出 JSON。`
        : `Generate daily fortunes JSON for date ${today}. Output JSON only: { "fortunes": [ { "dimension": "overall|love|wealth|health|career", "score": integer 0-100, "text": "40-120 chars" } ] }. Include exactly these 5 dimensions and vary content daily.`;

      const out = await callChatJSON(prompt);
      const arr = Array.isArray(out?.fortunes) ? out.fortunes : [];
      const byDim = new Map();
      for (const it of arr) {
        const dim = String(it?.dimension ?? '');
        if (!dims.includes(dim)) continue;
        const score = Math.max(0, Math.min(100, Number(it?.score ?? 0)));
        const text = String(it?.text ?? '').trim();
        if (!text) continue;
        byDim.set(dim, { dimension: dim, score, text, locale });
      }
      fortunes = dims.map((dim) => byDim.get(dim)).filter(Boolean);
      if (fortunes.length !== dims.length) throw new Error('daily_fortunes_incomplete');

      const now = new Date();
      for (const f of fortunes) {
        await exec(
          'insert into daily_fortunes (date,locale,dimension,score,text,created_at,updated_at) values (?,?,?,?,?,?,?) on duplicate key update score=values(score), text=values(text), updated_at=values(updated_at)',
          [today, locale, f.dimension, f.score, f.text, now, now]
        );
      }
      return res.json({ date: today, fortunes, generatedBy: 'ai' });
    } catch (e) {
      const msg = String(e?.message ?? e);
      return res.status(503).json({ error: 'daily_fortunes_not_ready', detail: msg });
    }
  });

  r.post('/admin/daily-fortunes/generate', async (req, res) => {
    const token = String(req.query.token ?? req.body?.token ?? '').trim();
    const cron = String(process.env.CRON_TOKEN ?? '').trim();
    if (!cron || token !== cron) return res.status(403).json({ error: 'forbidden' });

    let date = String(req.query.date ?? req.body?.date ?? '').trim();
    const locale = String(req.query.locale ?? req.body?.locale ?? 'en').trim();
    if (!date) {
      const d = new Date();
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      date = `${yyyy}-${mm}-${dd}`;
    }

    const dims = ['overall', 'love', 'wealth', 'health', 'career'];

    const prompt = isZh(locale)
      ? `请为日期 ${date} 生成“每日运势”JSON（只输出JSON对象），维度固定为 overall,love,wealth,health,career。\n要求：\n- 返回格式：{ "fortunes": [ { "dimension": "overall|love|wealth|health|career", "score": 0-100整数, "text": "一段中文，40-90字" } ] }\n- 文案必须每天不同，不要套模板，不要重复前一天。\n- 文字用人话，避免夸张承诺；建议具体可执行。\n- fortunes 数组必须包含且仅包含这5个维度。\n只输出 JSON。`
      : `Generate daily fortunes JSON for date ${date}. Output JSON only: { "fortunes": [ { "dimension": "overall|love|wealth|health|career", "score": integer 0-100, "text": "40-120 chars" } ] }. Include exactly these 5 dimensions and vary content daily.`;

    const out = await callChatJSON(prompt);
    const arr = Array.isArray(out?.fortunes) ? out.fortunes : [];
    const byDim = new Map();
    for (const it of arr) {
      const dim = String(it?.dimension ?? '');
      if (!dims.includes(dim)) continue;
      const score = Math.max(0, Math.min(100, Number(it?.score ?? 0)));
      const text = String(it?.text ?? '').trim();
      if (!text) continue;
      byDim.set(dim, { dimension: dim, score, text, locale });
    }
    const fortunes = dims.map((dim) => byDim.get(dim)).filter(Boolean);
    if (fortunes.length !== dims.length) return res.status(502).json({ error: 'daily_fortunes_incomplete' });

    const now = new Date();
    for (const f of fortunes) {
      await exec(
        'insert into daily_fortunes (date,locale,dimension,score,text,created_at,updated_at) values (?,?,?,?,?,?,?) on duplicate key update score=values(score), text=values(text), updated_at=values(updated_at)',
        [date, locale, f.dimension, f.score, f.text, now, now]
      );
    }
    return res.json({ ok: true });
  });

  r.post('/auth/register', async (req, res) => {
    try {
      const { email, password, locale } = req.body ?? {};
      const out = await registerUser(email, password, locale ?? 'en');
      const profile = await loadProfile(out.userId);
      const token = signAccessToken({ userId: out.userId, role: profile?.role ?? 'free', status: profile?.status ?? 'active' });
      return res.json({ accessToken: token, profile });
    } catch (e) {
      const msg = String(e?.message ?? e);
      const isDb =
        msg === 'mysql_env_missing' ||
        msg.includes('ER_ACCESS_DENIED_ERROR') ||
        msg.toLowerCase().includes('access denied') ||
        msg.toLowerCase().includes('connect') ||
        msg.toLowerCase().includes('unknown database');
      if (isDb) return res.status(500).json({ error: 'db_error' });
      const code = msg.includes('email_taken') ? 409 : msg.includes('invalid_credentials') ? 400 : 400;
      return res.status(code).json({ error: msg });
    }
  });

  r.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      const v = await verifyLogin(email, password);
      const profile = await loadProfile(v.userId);
      const token = signAccessToken({ userId: v.userId, role: v.role, status: v.status });
      return res.json({ accessToken: token, profile });
    } catch (e) {
      const msg = String(e?.message ?? e);
      const isDb =
        msg === 'mysql_env_missing' ||
        msg.includes('ER_ACCESS_DENIED_ERROR') ||
        msg.toLowerCase().includes('access denied') ||
        msg.toLowerCase().includes('connect') ||
        msg.toLowerCase().includes('unknown database');
      if (isDb) return res.status(500).json({ error: 'db_error' });
      const code = msg.includes('invalid_credentials') ? 400 : msg.includes('banned') ? 403 : 400;
      return res.status(code).json({ error: msg });
    }
  });

  r.get('/auth/google/start', async (req, res) => {
    const clientId = String(process.env.GOOGLE_CLIENT_ID ?? '').trim();
    const redirectUri = String(process.env.GOOGLE_REDIRECT_URI ?? '').trim();
    if (!clientId || !redirectUri) return res.status(500).json({ error: 'google_oauth_not_configured' });

    const frontendRedirect = String(req.query.redirect ?? '').trim() || '/oauth';
    const state = signAccessToken({ t: 'google_oauth', redirect: frontendRedirect });

    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.searchParams.set('client_id', clientId);
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'openid email profile');
    u.searchParams.set('access_type', 'online');
    u.searchParams.set('prompt', 'select_account');
    u.searchParams.set('state', state);

    return res.redirect(u.toString());
  });

  r.get('/auth/google/callback', async (req, res) => {
    const clientId = String(process.env.GOOGLE_CLIENT_ID ?? '').trim();
    const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET ?? '').trim();
    const redirectUri = String(process.env.GOOGLE_REDIRECT_URI ?? '').trim();
    const frontendBase = String(process.env.FRONTEND_BASE_URL ?? '').trim();
    if (!clientId || !clientSecret || !redirectUri || !frontendBase) return res.status(500).send('google_oauth_not_configured');

    const code = String(req.query.code ?? '').trim();
    const state = String(req.query.state ?? '').trim();
    if (!code || !state) return res.status(400).send('missing_code');

    let decoded;
    try {
      decoded = (await (async () => {
        const jwt = (await import('jsonwebtoken')).default;
        return jwt.verify(state, (process.env.JWT_SECRET ?? '').trim());
      }))();
    } catch {
      return res.status(400).send('invalid_state');
    }

    const redirectPath = String(decoded?.redirect ?? '/oauth');
    const redirectUrl = new URL(redirectPath, frontendBase);

    try {
      const params = new URLSearchParams();
      params.set('code', code);
      params.set('client_id', clientId);
      params.set('client_secret', clientSecret);
      params.set('redirect_uri', redirectUri);
      params.set('grant_type', 'authorization_code');

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const tokenJson = await tokenRes.json().catch(() => null);
      if (!tokenRes.ok) throw new Error(String(tokenJson?.error_description || tokenJson?.error || 'token_exchange_failed'));

      const accessToken = String(tokenJson?.access_token ?? '');
      if (!accessToken) throw new Error('no_access_token');

      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { authorization: `Bearer ${accessToken}` }
      });
      const info = await infoRes.json().catch(() => null);
      if (!infoRes.ok) throw new Error(String(info?.error_description || info?.error || 'userinfo_failed'));

      const sub = String(info?.sub ?? '').trim();
      const email = String(info?.email ?? '').trim().toLowerCase();
      if (!sub) throw new Error('no_sub');

      const out = await upsertGoogleUser({ sub, email, locale: 'en' });
      if (out.status === 'banned') {
        redirectUrl.hash = '#error=banned';
        return res.redirect(redirectUrl.toString());
      }

      const profile = await loadProfile(out.userId);
      const jwtToken = signAccessToken({ userId: out.userId, role: out.role, status: out.status });
      redirectUrl.hash = `#token=${encodeURIComponent(jwtToken)}`;
      if (profile?.email) redirectUrl.hash += `&email=${encodeURIComponent(profile.email)}`;
      return res.redirect(redirectUrl.toString());
    } catch (e) {
      redirectUrl.hash = `#error=${encodeURIComponent(String(e?.message ?? e))}`;
      return res.redirect(redirectUrl.toString());
    }
  });

  r.get('/me', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const profile = await loadProfile(userId);
    if (!profile) return res.status(404).json({ error: 'profile_not_found' });
    if (profile.status === 'banned') return res.status(403).json({ error: 'banned' });
    return res.json({ profile });
  });

  r.patch('/profile', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const profile = await loadProfile(userId);
    if (!profile) return res.status(404).json({ error: 'profile_not_found' });
    if (profile.status === 'banned') return res.status(403).json({ error: 'banned' });

    const allowed = [
      'locale',
      'name',
      'gender',
      'birth_date',
      'birth_time',
      'relationship_status',
      'birth_place',
      'current_residence'
    ];

    const patch = {};
    for (const k of allowed) {
      if (k in (req.body ?? {})) patch[k] = req.body[k];
    }

    const keys = Object.keys(patch);
    if (!keys.length) return res.json({ profile });

    const setSql = keys.map((k) => `${k}=?`).join(',');
    await exec(`update profiles set ${setSql}, updated_at=? where user_id=?`, [...keys.map((k) => patch[k]), new Date(), userId]);
    const fresh = await loadProfile(userId);
    return res.json({ profile: fresh });
  });

  async function ensureDefaultAgentExists() {
    const rows = await query('select id from agents limit 1').catch(() => []);
    if (Array.isArray(rows) && rows.length) return;

    const now = new Date();
    const id = crypto.randomUUID();
    await exec(
      "insert into agents (id,status,is_default,name_zh,name_en,description_zh,description_en,system_prompt_zh,system_prompt_en,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        'active',
        1,
        '易经助手',
        'I Ching Assistant',
        '基于易经思路给出可执行建议，语言随界面切换。',
        'Gives practical advice with I Ching-style reasoning. Language follows UI.',
        '你是“易经对话助手”。你会用易经的思路（阴阳、时机、取舍）帮助用户做决策，但不要装神弄鬼，不要承诺绝对结果。\n要求：\n- 先问清关键信息（如缺失）。\n- 给出结构化建议：结论/原因/建议/避忌。\n- 用中文输出。',
        'You are an "I Ching conversation assistant". Use I Ching-style reasoning (timing, balance, trade-offs) to help decisions. Do not make absolute promises.\nRules:\n- Ask clarifying questions when needed.\n- Provide structured output: takeaway / reasoning / actions / avoid.\n- Output in English.',
        now,
        now
      ]
    );
  }

  async function getDefaultAgentForUser(userId) {
    await ensureDefaultAgentExists();
    const pref = await query(
      'select a.* from user_agent_prefs p join agents a on a.id=p.default_agent_id where p.user_id=? and a.status=? limit 1',
      [userId, 'active']
    ).catch(() => []);
    if (Array.isArray(pref) && pref.length) return pref[0];

    const def = await query('select * from agents where is_default=1 and status=? order by updated_at desc limit 1', ['active']).catch(() => []);
    if (Array.isArray(def) && def.length) return def[0];

    const any = await query('select * from agents where status=? order by updated_at desc limit 1', ['active']).catch(() => []);
    return Array.isArray(any) ? any[0] : null;
  }

  function presentAgent(a, locale) {
    return {
      id: a.id,
      name: isZh(locale) ? a.name_zh : a.name_en,
      description: isZh(locale) ? a.description_zh : a.description_en
    };
  }

  r.get('/agents', requireAuth, async (req, res) => {
    const locale = String(req.query.locale ?? 'en');
    await ensureDefaultAgentExists();
    const rows = await query('select * from agents where status=? order by is_default desc, updated_at desc limit 50', ['active']).catch(() => []);
    return res.json({ rows: (Array.isArray(rows) ? rows : []).map((a) => presentAgent(a, locale)) });
  });

  r.get('/agents/default', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const locale = String(req.query.locale ?? 'en');
    const a = await getDefaultAgentForUser(userId);
    if (!a) return res.status(404).json({ error: 'agent_not_found' });
    return res.json({ agent: presentAgent(a, locale) });
  });

  r.put('/me/default-agent', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const agentId = String(req.body?.agentId ?? '').trim();
    if (!agentId) return res.status(400).json({ error: 'invalid_agent' });
    await ensureDefaultAgentExists();
    const rows = await query('select id from agents where id=? and status=? limit 1', [agentId, 'active']).catch(() => []);
    if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'agent_not_found' });
    const now = new Date();
    await exec(
      'insert into user_agent_prefs (user_id,default_agent_id,updated_at) values (?,?,?) on duplicate key update default_agent_id=values(default_agent_id), updated_at=values(updated_at)',
      [userId, agentId, now]
    );
    return res.json({ ok: true });
  });

  r.post('/chat/cast', async (req, res) => {
    const locale = String(req.body?.locale ?? 'en');
    let rules;
    try {
      rules = await loadIchingRules();
    } catch (e) {
      return res.status(500).json({ error: 'rules_load_failed', detail: String(e?.message ?? e) });
    }

    const coins = castCoins();
    const computed = computeHexagramsFromCoins(coins);

    const primaryZh = rules.byBinaryZh.get(computed.primaryBinary);
    const primaryEn = rules.byBinaryEn.get(computed.primaryBinary);
    const relateZh = rules.byBinaryZh.get(computed.relateBinary);
    const relateEn = rules.byBinaryEn.get(computed.relateBinary);
    if (!primaryZh || !primaryEn || !relateZh || !relateEn) return res.status(500).json({ error: 'hexagram_not_found' });

    const basisZh = buildBasis(primaryZh, computed.changingLines);
    const basisEn = buildBasis(primaryEn, computed.changingLines);
    const isZhUI = isZh(locale);

    return res.json({
      meta: {
        coins,
        changingLines: computed.changingLines,
        primary: { name: isZhUI ? primaryZh.name : primaryEn.name, binary: computed.primaryBinary },
        relating: { name: isZhUI ? relateZh.name : relateEn.name, binary: computed.relateBinary },
        basis: isZhUI ? basisZh : basisEn
      }
    });
  });

  r.post('/chat', optionalAuth, async (req, res) => {
    const locale = String(req.body?.locale ?? 'en');
    const message = String(req.body?.message ?? '').trim();
    const historyIn = Array.isArray(req.body?.history) ? req.body.history : [];
    const metaIn = req.body?.meta ?? null;
    const profileIn = req.body?.profile ?? null;
    const userId = String(req.auth?.userId ?? '').trim();

    if (!message) return res.status(400).json({ error: 'invalid_message' });

    const isZhUI = isZh(locale) || /[\u4e00-\u9fff]/.test(message);
    const lower = message.toLowerCase();
    const onlyDigits = /^[\d\s]+$/.test(message);
    const onlySymbols = /^[\s~`!@#$%^&*()_\-+={}\[\]|\\:;"'<>,.?/]+$/.test(message);
    const cfgAll = await loadChatConfig().catch(() => null);
    const cfg = (isZhUI ? cfgAll?.zh : cfgAll?.en) ?? {};
    const presets = cfg?.presets ?? {};
    const modeHints = cfg?.modeHints ?? {};
    const patterns = cfg?.patterns ?? {};

    const langKey = isZhUI ? 'zh' : 'en';
    if (!chatPatternCache[langKey]) {
      chatPatternCache[langKey] = {
        greeting: compilePatterns(patterns.greeting),
        thanks: compilePatterns(patterns.thanks),
        topicHint: compilePatterns(patterns.topicHint),
        todayFortune: compilePatterns(patterns.todayFortune),
        detail: compilePatterns(patterns.detail),
        time: compilePatterns(patterns.time),
        weather: compilePatterns(patterns.weather),
        news: compilePatterns(patterns.news),
      };
    }
    const re = chatPatternCache[langKey];

    const isPreset = Array.isArray(presets.openers) && presets.openers.includes(message);
    const isGreeting = matchAny(re.greeting, isZhUI ? message : lower);
    const isThanks = matchAny(re.thanks, isZhUI ? message : lower);
    const topicHint = matchAny(re.topicHint, isZhUI ? message : lower);
    const unclearTopic = !topicHint;
    const wantsDetail = matchAny(re.detail, isZhUI ? message : lower);

    const metaBasicOk =
      !!metaIn &&
      typeof metaIn === 'object' &&
      typeof metaIn.primary?.binary === 'string' &&
      typeof metaIn.relating?.binary === 'string' &&
      Array.isArray(metaIn.changingLines);

    if (metaBasicOk && (!metaIn.basis || typeof metaIn.basis?.judgment !== 'string' || !Array.isArray(metaIn.basis?.lines))) {
      let rules;
      try {
        rules = await loadIchingRules();
      } catch {
        rules = null;
      }
      if (rules) {
        const b1 = String(metaIn.primary.binary).trim();
        const b2 = String(metaIn.relating.binary).trim();
        const primary = (isZhUI ? rules.byBinaryZh : rules.byBinaryEn).get(b1);
        const relating = (isZhUI ? rules.byBinaryZh : rules.byBinaryEn).get(b2);
        if (primary && relating) {
          metaIn.primary.name = metaIn.primary.name || primary.name;
          metaIn.relating.name = metaIn.relating.name || relating.name;
          metaIn.basis = buildBasis(primary, metaIn.changingLines);
        }
      }
    }

    const metaOk =
      metaBasicOk &&
      typeof metaIn.primary?.name === 'string' &&
      typeof metaIn.relating?.name === 'string' &&
      typeof metaIn.basis?.judgment === 'string' &&
      Array.isArray(metaIn.basis?.lines) &&
      (!('allLines' in metaIn.basis) || Array.isArray(metaIn.basis?.allLines));

    const isTodayFortune = matchAny(re.todayFortune, isZhUI ? message : lower);
    const askTime = matchAny(re.time, isZhUI ? message : lower);
    const askWeather = matchAny(re.weather, isZhUI ? message : lower);
    const askNews = matchAny(re.news, isZhUI ? message : lower);
    const mathMatch = message.match(/(-?\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(-?\d+(?:\.\d+)?)/);
    const askMath = !!mathMatch;
    const mathExpr = mathMatch ? `${mathMatch[1]} ${mathMatch[2]} ${mathMatch[3]}` : '';
    let mathResult = '';
    if (mathMatch) {
      const a = Number(mathMatch[1]);
      const op = String(mathMatch[2]);
      const b = Number(mathMatch[3]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const v = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b === 0 ? null : a / b;
        mathResult = v === null ? (isZhUI ? '无法计算（除以 0）' : 'cannot compute (division by zero)') : String(v);
      }
    }

    const dimension =
      isZhUI
        ? /财运|财富/.test(message)
          ? 'wealth'
          : /感情|爱情|恋爱/.test(message)
            ? 'love'
            : /健康/.test(message)
              ? 'health'
              : /事业|工作|升职|面试|合作|谈判/.test(message)
                ? 'career'
                : ''
        : /\b(wealth|money|finance)\b/.test(lower)
          ? 'wealth'
          : /\b(love|relationship)\b/.test(lower)
            ? 'love'
            : /\b(health)\b/.test(lower)
              ? 'health'
              : /\b(career|work|job|negotiation|deal)\b/.test(lower)
                ? 'career'
                : '';

    const pickProfile = (p) => {
      if (!p || typeof p !== 'object') return null;
      const out = {
        name: String(p.name ?? '').trim(),
        gender: String(p.gender ?? '').trim(),
        birth_date: p.birth_date ? String(p.birth_date).trim() : '',
        birth_time: p.birth_time ? String(p.birth_time).trim() : '',
        relationship_status: p.relationship_status ? String(p.relationship_status).trim() : '',
        birth_place: String(p.birth_place ?? '').trim(),
        current_residence: String(p.current_residence ?? '').trim(),
      };
      const any = Object.values(out).some((v) => String(v ?? '').trim());
      return any ? out : null;
    };
    let profile = pickProfile(profileIn);
    if (userId) {
      try {
        const dbProf = await loadProfile(userId);
        const norm = normalizeProfileRow(dbProf);
        const picked = pickProfile(norm);
        if (picked) profile = picked;
      } catch {}
    }

    const recentUserText = [
      ...historyIn
        .filter((m) => String(m?.role) === 'user')
        .slice(-4)
        .map((m) => String(m?.content ?? '')),
      message
    ]
      .join(' ')
      .trim();

    const dimensionCtx =
      dimension ||
      (isZhUI
        ? /财运|财富/.test(recentUserText)
          ? 'wealth'
          : /感情|爱情|恋爱/.test(recentUserText)
            ? 'love'
            : /健康/.test(recentUserText)
              ? 'health'
              : /事业|工作|升职|面试|合作|谈判/.test(recentUserText)
                ? 'career'
                : ''
        : /\b(wealth|money|finance)\b/i.test(recentUserText)
          ? 'wealth'
          : /\b(love|relationship)\b/i.test(recentUserText)
            ? 'love'
            : /\b(health)\b/i.test(recentUserText)
              ? 'health'
              : /\b(career|work|job|negotiation|deal)\b/i.test(recentUserText)
                ? 'career'
                : '');

    const timeframeCtx = isZhUI
      ? /(今日|今天)/.test(recentUserText)
        ? 'today'
        : /(本周|这周|本星期)/.test(recentUserText)
          ? 'week'
          : /(近期|最近|接下来几天)/.test(recentUserText)
            ? 'recent'
            : ''
      : /\b(today|daily)\b/i.test(recentUserText)
        ? 'today'
        : /\b(this week|weekly)\b/i.test(recentUserText)
          ? 'week'
          : /\b(recently|soon|next few days)\b/i.test(recentUserText)
            ? 'recent'
            : '';

    const allowVagueFollowup = metaOk && wantsDetail;

    let mode = 'normal';
    let modeHint = '';
    let actionsOut = null;

    if (isGreeting) {
      mode = 'greeting';
      modeHint = String(modeHints.greeting ?? '');
    } else if (isThanks) {
      mode = 'thanks';
      modeHint = String(modeHints.thanks ?? '');
    } else if (!isPreset && (onlyDigits || onlySymbols)) {
      mode = 'unclear';
      modeHint = String(modeHints.unclear ?? '');
    } else if (!isPreset && (askTime || askWeather || askNews || askMath)) {
      mode = 'offtopic';
      const serverNow = new Date();
      const y = serverNow.getFullYear();
      const mo = String(serverNow.getMonth() + 1).padStart(2, '0');
      const d = String(serverNow.getDate()).padStart(2, '0');
      const hh = String(serverNow.getHours()).padStart(2, '0');
      const mm = String(serverNow.getMinutes()).padStart(2, '0');
      const ss = String(serverNow.getSeconds()).padStart(2, '0');
      const nowStr = `${y}-${mo}-${d} ${hh}:${mm}:${ss}`;
      const vars = { now: nowStr, math_expr: mathExpr, math_result: mathResult };
      const tpl = askTime
        ? modeHints.offtopic_time
        : askWeather
          ? modeHints.offtopic_weather
          : askNews
            ? modeHints.offtopic_news
            : askMath
              ? modeHints.offtopic_math
              : modeHints.offtopic_other;
      modeHint = fillTemplate(String(tpl ?? ''), vars);
    } else if (!isPreset && (unclearTopic && !allowVagueFollowup)) {
      mode = 'clarify';
      modeHint = String(modeHints.clarify ?? '');
    } else if (isTodayFortune && !dimension) {
      mode = 'pick_aspect';
      modeHint = String(modeHints.pick_aspect ?? '');
    } else if (!metaOk && (topicHint || isTodayFortune || dimension)) {
      mode = 'ask_cast';
      modeHint = String(modeHints.ask_cast ?? '');
      actionsOut = [{ type: 'cast', label: isZhUI ? '起卦' : 'Cast' }];
    }

    const profileIncomplete =
      !profile ||
      !String(profile.name ?? '').trim() ||
      !String(profile.birth_date ?? '').trim() ||
      (dimensionCtx === 'love' && !String(profile.relationship_status ?? '').trim());

    const earlyGuideMode =
      !metaOk &&
      (mode === 'greeting' || mode === 'thanks' || mode === 'unclear' || mode === 'clarify' || mode === 'pick_aspect' || mode === 'offtopic');

    const bootstrapGuideMode =
      !metaOk &&
      !isPreset &&
      historyIn.filter((m) => String(m?.role) === 'user').length < 1 &&
      !topicHint &&
      !isTodayFortune &&
      !dimension &&
      !askTime &&
      !askWeather &&
      !askNews &&
      !askMath;

    if ((earlyGuideMode && mode !== 'ask_cast') || bootstrapGuideMode) {
      const reply = isZhUI
        ? profileIncomplete
          ? '我可以为你起卦解读。可选：补充一点资料（姓名、生日；感情还需要关系状态），解读会更贴近你。你也可以直接回复我：姓名 + 生日（YYYY-MM-DD）。你想先看：事业/感情/财运/健康 哪一项？'
          : '我可以为你起卦解读。你想先看：事业/感情/财运/健康 哪一项？'
        : profileIncomplete
          ? 'I can cast and read for you. Optional: share name + birth date (and for love, relationship status) so the reading feels more personal. You can reply with: name + birth date (YYYY-MM-DD). Which area first: career / love / wealth / health?'
          : 'I can cast and read for you. Which area first: career / love / wealth / health?';

      const quick = isZhUI
        ? [
            { type: 'send', label: '今日事业', text: '我想问今日事业/工作运势如何？' },
            { type: 'send', label: '今日感情', text: '我想问今日感情运势如何？' },
            { type: 'send', label: '今日财运', text: '我想问今日财运如何？' },
            { type: 'send', label: '今日健康', text: '我想问今日健康需要注意什么？' },
          ]
        : [
            { type: 'send', label: "Today's career", text: "Today's career luck?" },
            { type: 'send', label: "Today's love", text: "Today's love luck?" },
            { type: 'send', label: "Today's wealth", text: "Today's wealth luck?" },
            { type: 'send', label: "Today's health", text: 'Health caution today?' },
          ];

      const actions = profileIncomplete ? [{ type: 'profile', label: isZhUI ? '完善资料（可选）' : 'Add details (optional)' }, ...quick] : quick;

      return res.json({
        reply,
        meta: null,
        actions,
      });
    }

    let coins = null;
    let computed = null;
    let primaryZh = null;
    let primaryEn = null;
    let relateZh = null;
    let relateEn = null;
    let basisZh = null;
    let basisEn = null;

    if (metaOk) {
      let rules;
      try {
        rules = await loadIchingRules();
      } catch (e) {
        return res.status(500).json({ error: 'rules_load_failed', detail: String(e?.message ?? e) });
      }
      primaryZh = rules.byBinaryZh.get(metaIn.primary.binary);
      primaryEn = rules.byBinaryEn.get(metaIn.primary.binary);
      relateZh = rules.byBinaryZh.get(metaIn.relating.binary);
      relateEn = rules.byBinaryEn.get(metaIn.relating.binary);
      if (!primaryZh || !primaryEn || !relateZh || !relateEn) return res.status(500).json({ error: 'hexagram_not_found' });
      basisZh = buildBasis(primaryZh, metaIn.changingLines);
      basisEn = buildBasis(primaryEn, metaIn.changingLines);
    }

    const sys = String(cfg?.system ?? '').trim();

    const context = metaOk
      ? isZhUI
        ? `本卦：${metaIn.primary.name}（${metaIn.primary.binary}）
之卦：${metaIn.relating.name}（${metaIn.relating.binary}）
变爻：${metaIn.changingLines.length ? metaIn.changingLines.join(',') : '无'}
卦辞：${metaIn.basis.judgment}
爻辞：${metaIn.basis.lines.length ? metaIn.basis.lines.join(' ') : '无'}`
        : `Primary: ${metaIn.primary.name} (${metaIn.primary.binary})
Relating: ${metaIn.relating.name} (${metaIn.relating.binary})
Changing lines: ${metaIn.changingLines.length ? metaIn.changingLines.join(',') : 'none'}
Judgment: ${metaIn.basis.judgment}
Lines: ${metaIn.basis.lines.length ? metaIn.basis.lines.join(' ') : 'none'}`
      : '';

    const history = historyIn
      .slice(-10)
      .map((m) => ({ role: String(m?.role), content: String(m?.content ?? '') }))
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content);

    const maxChars = isZhUI ? (wantsDetail ? 520 : 380) : wantsDetail ? 900 : 650;
    const styleHint =
      metaOk && !wantsDetail && mode !== 'ask_cast'
        ? isZhUI
          ? `请把解读分成 3-6 段短句输出（每段 20-60 字），用空行分段；总字数不超过 ${maxChars} 字；不要半句截断。`
          : `Split the reading into 3–6 short paragraphs (each 1–2 sentences), separated by blank lines. Keep total length within ${maxChars} characters. Do not cut mid-sentence.`
        : '';
    const castStateHint = metaOk
      ? isZhUI
        ? '已提供本次起卦结果与依据，请直接解读；不要再次要求起卦，除非用户明确说“再起一卦/重算”。'
        : 'A cast (with sources) is already provided in context. Interpret it now; do NOT ask to cast again unless the user explicitly requests a recast.'
      : '';
    const profileHint = profile
      ? isZhUI
        ? `用户资料（优先参考）：姓名=${profile.name || '未填'}；性别=${profile.gender || '未填'}；生日=${profile.birth_date || '未填'} ${profile.birth_time || ''}；出生地=${profile.birth_place || '未填'}；现居=${profile.current_residence || '未填'}；情感状态=${profile.relationship_status || '未填'}。`
        : `User profile (use first): name=${profile.name || 'n/a'}; gender=${profile.gender || 'n/a'}; birth=${profile.birth_date || 'n/a'} ${profile.birth_time || ''}; birthplace=${profile.birth_place || 'n/a'}; current=${profile.current_residence || 'n/a'}; relationship=${profile.relationship_status || 'n/a'}.`
      : '';
    const profileNeedHint =
      !profile && (topicHint || isTodayFortune || dimensionCtx || timeframeCtx)
        ? isZhUI
          ? dimensionCtx === 'love'
            ? '尚无用户资料。若想让感情解读更贴近现实，可以先确认：你目前是单身/暧昧/恋爱/已婚（或已分手）？'
            : dimensionCtx === 'wealth'
              ? '尚无用户资料。若想让财运解读更贴近现实，可以先确认：你更关心收入、支出（意外扣款/续费/维修）、投资，还是负债哪一块？'
              : dimensionCtx === 'career'
                ? '尚无用户资料。若想让事业解读更贴近现实，可以先确认：你大致是什么岗位/行业（偏办公室还是体力/高风险）？'
                : dimensionCtx === 'health'
                  ? '尚无用户资料。若想让健康解读更贴近现实，可以先确认：这是旧疾还是新出现、持续多久、是否影响睡眠/工作？严重请就医。'
                  : '尚无用户资料。若想让解读更贴近个人，可以补充：姓名 + 出生日期（YYYY-MM-DD）（出生时间可选）。'
          : dimensionCtx === 'love'
            ? 'No user profile is available. If you want a more grounded love reading, ask ONE question about relationship status (single / dating / married / separated).'
            : dimensionCtx === 'wealth'
              ? 'No user profile is available. If you want a more grounded wealth reading, ask ONE question about which area matters most: income / spending (unexpected charges) / investment / debt.'
              : dimensionCtx === 'career'
                ? 'No user profile is available. If you want a more grounded career reading, ask ONE question about role/industry and whether it is office / physical / high-risk.'
                : dimensionCtx === 'health'
                  ? 'No user profile is available. If you want a more grounded health reading, ask ONE question: ongoing vs new, how long, and whether it affects sleep/work (suggest a professional if serious).'
                  : 'No user profile is available. If you want a more personal reading, you may ask for name + birth date (YYYY-MM-DD) (birth time optional).'
        : '';
    const scopeLockHint =
      metaOk && (dimensionCtx || timeframeCtx)
        ? isZhUI
          ? `对话范围锁定：主题=${dimensionCtx || '本次所问'}；时间范围=${timeframeCtx === 'today' ? '今天' : timeframeCtx === 'week' ? '本周' : timeframeCtx === 'recent' ? '近期' : '当前'}。追问必须紧扣用户刚刚的回答与本次主题，不要发散到行业新规/陌生领域/长期规划等无根据猜测；若需要背景，只能用一个简单问题确认（例如收入/支出哪一块、是否自动续费/维修/账单等）。`
          : `Scope lock: topic=${dimensionCtx || 'this matter'}; timeframe=${timeframeCtx || 'current'}. Follow-up must stay tightly on the user's last answer and this topic; do not drift into speculative areas (industry regulations, new ventures, long-term plans) unless the user mentioned them. If context is needed, ask exactly ONE simple clarifying question.`
        : '';
    const closingHint =
      mode !== 'ask_cast'
        ? isZhUI
          ? '结尾用一句温和收束即可，不要强行带节奏。只有在确实需要澄清信息时，最多追问一个问题；否则直接停在建议上。'
          : 'End with a calm closing line. You may ask ONE follow-up question if it helps; otherwise stop without pushing the user.'
        : '';

    const plainEnglishHint = !isZhUI
      ? 'Use plain modern English. Avoid Chinese cultural or poetic phrasing. Do not over-lead: offer options, avoid assumptions, and ask at most one question only when necessary.'
      : '';
    const plainChineseHint = isZhUI
      ? '用更口语、更直白的中文解释，不要堆成语/国学套话；少假设、少带节奏；给选择而不是替用户下结论。'
      : '';

    let memoryHint = '';
    if (userId) {
      const mems = await loadUserMemories(userId, 30);
      const pickMemories = () => {
        const out = [];
        const add = (k) => {
          const m = mems.find((x) => String(x.kind ?? '') === k);
          if (m) out.push(m);
        };
        add('profile_summary');
        add('asking_style');
        add('slot_career');
        add('slot_wealth');
        add('slot_love');
        add('slot_health');
        for (const m of mems) {
          if (out.length >= 8) break;
          if (out.some((x) => x.id === m.id)) continue;
          const kind = String(m.kind ?? '');
          if (!allowedMemoryKinds.has(kind)) continue;
          out.push(m);
        }
        return out.slice(0, 8);
      };
      const picked = pickMemories();
      if (picked.length) {
        if (isZhUI) {
          memoryHint =
            '用户记忆（可参考，若无关请忽略）：\n' +
            picked
              .map((m) => `- [${String(m.kind ?? '').trim() || 'info'}] ${String(m.content ?? '').trim()}`.trim())
              .filter(Boolean)
              .slice(0, 8)
              .join('\n');
        } else {
          memoryHint =
            'User memory (use only if relevant):\n' +
            picked
              .map((m) => `- [${String(m.kind ?? '').trim() || 'info'}] ${String(m.content ?? '').trim()}`.trim())
              .filter(Boolean)
              .slice(0, 8)
              .join('\n');
        }
      }
    }

    const slotNeedHint = (() => {
      if (!userId) return '';
      if (!dimensionCtx) return '';
      const slotKind =
        dimensionCtx === 'career'
          ? 'slot_career'
          : dimensionCtx === 'wealth'
            ? 'slot_wealth'
            : dimensionCtx === 'love'
              ? 'slot_love'
              : dimensionCtx === 'health'
                ? 'slot_health'
                : '';
      if (!slotKind) return '';
      const hasSlot = memoryHint && memoryHint.includes(`[${slotKind}]`);
      if (hasSlot) return '';
      if (isZhUI) {
        if (slotKind === 'slot_career')
          return '若要给出更贴近现实的事业建议，先用一个问题确认用户工作/岗位类型（办公室/体力/高风险等），再给建议。';
        if (slotKind === 'slot_wealth')
          return '若要给出更贴近现实的财运建议，先用一个问题确认用户关注点与类型（收入/支出/投资；若投资是哪类：股票/基金/生意等），再给建议。';
        if (slotKind === 'slot_love')
          return '若要给出更贴近现实的感情建议，先用一个问题确认用户关系状态（单身/暧昧/恋爱/已婚/分手），再给建议。';
        if (slotKind === 'slot_health')
          return '若要给出更贴近现实的健康建议，先用一个问题确认是旧疾还是新出现、持续多久、是否影响睡眠/工作，再给建议。';
      }
      if (slotKind === 'slot_career')
        return 'For a grounded career reading, ask ONE question to confirm their role/industry and whether it is office / physical / high-risk.';
      if (slotKind === 'slot_wealth')
        return 'For a grounded wealth reading, ask ONE question about their focus and type (income/spending/investment; if investment, what type).';
      if (slotKind === 'slot_love')
        return 'For a grounded love reading, ask ONE question about relationship status (single / dating / married / separated).';
      if (slotKind === 'slot_health')
        return 'For a grounded health reading, ask ONE question: ongoing vs new, how long, and whether it affects sleep/work.';
      return '';
    })();

    const messages = [
      { role: 'system', content: sys },
      ...(modeHint ? [{ role: 'system', content: modeHint }] : []),
      ...(styleHint ? [{ role: 'system', content: styleHint }] : []),
      ...(castStateHint ? [{ role: 'system', content: castStateHint }] : []),
      ...(profileHint ? [{ role: 'system', content: profileHint }] : []),
      ...(profileNeedHint ? [{ role: 'system', content: profileNeedHint }] : []),
      ...(plainEnglishHint ? [{ role: 'system', content: plainEnglishHint }] : []),
      ...(plainChineseHint ? [{ role: 'system', content: plainChineseHint }] : []),
      ...(memoryHint ? [{ role: 'system', content: memoryHint }] : []),
      ...(slotNeedHint ? [{ role: 'system', content: slotNeedHint }] : []),
      ...(scopeLockHint ? [{ role: 'system', content: scopeLockHint }] : []),
      ...(closingHint ? [{ role: 'system', content: closingHint }] : []),
      { role: 'system', content: context },
      ...history,
      { role: 'user', content: message }
    ];

    try {
      let reply = String(
        await callChatText(messages, {
          temperature: wantsDetail ? 0.7 : 0.4,
          maxTokens: wantsDetail ? (isZhUI ? 650 : 900) : (isZhUI ? 300 : 520)
        })
      ).trim();
      if (!reply) return res.status(502).json({ error: 'ai_empty' });
      reply = reply
        .split('\n')
        .filter(
          (l) =>
            !/^(本卦：|之卦：|变爻：|卦辞：|爻辞：|Primary:|Relating:|Changing lines:|Judgment:|Lines:)/.test(l.trim()) &&
            !/^\s*SUGGEST:\s*/i.test(l)
        )
        .join('\n')
        .trim();

      const smartTruncate = (s, n) => {
        const t = String(s ?? '').trim();
        if (t.length <= n) return t;
        const head = t.slice(0, n);
        const re = isZhUI ? /[。！？；\n]/g : /[.?!;\n]/g;
        let last = -1;
        let m;
        while ((m = re.exec(head))) last = m.index;
        if (last >= Math.max(20, Math.floor(n * 0.6))) return head.slice(0, last + 1).trim();
        return head.trim();
      };

      reply = smartTruncate(reply, maxChars);
      if (userId) {
        const u = message;
        const a = reply;
        const loc = locale;
        const dim = dimensionCtx;
        const tf = timeframeCtx;
        const prof = profile;
        setImmediate(async () => {
          try {
            const langIsZh = isZh(loc) || /[\u4e00-\u9fff]/.test(String(u ?? ''));
            if (prof) {
              const intro = langIsZh
                ? [
                    `姓名：${prof.name || '未填'}`,
                    prof.gender ? `性别：${prof.gender}` : '',
                    prof.birth_date ? `生日：${prof.birth_date}${prof.birth_time ? ` ${prof.birth_time}` : ''}` : '',
                    prof.relationship_status ? `情感状态：${prof.relationship_status}` : '',
                    prof.birth_place ? `出生地：${prof.birth_place}` : '',
                    prof.current_residence ? `现居：${prof.current_residence}` : ''
                  ]
                    .filter(Boolean)
                    .join('；')
                : [
                    prof.name ? `name: ${prof.name}` : '',
                    prof.gender ? `gender: ${prof.gender}` : '',
                    prof.birth_date ? `birth: ${prof.birth_date}${prof.birth_time ? ` ${prof.birth_time}` : ''}` : '',
                    prof.relationship_status ? `relationship: ${prof.relationship_status}` : '',
                    prof.birth_place ? `birthplace: ${prof.birth_place}` : '',
                    prof.current_residence ? `current: ${prof.current_residence}` : ''
                  ]
                    .filter(Boolean)
                    .join('; ');
              if (intro) await upsertSingletonMemory(userId, 'profile_summary', intro, 5);
            }

            const existing = await loadUserMemories(userId, 20);
            const prompt = langIsZh
              ? [
                  '你是“记忆提炼器”。从下面对话中提炼可复用的用户信息/偏好/约束，用于后续更准确的对话。',
                  '只提炼稳定信息（偏好、长期事实、明确约束、提问习惯）。不要提炼临时情绪或一次性细节。',
                  '不要包含敏感信息（身份证/银行卡/住址门牌/账号密码）。生日如已在资料里则不重复。',
                  '优先提炼这些槽位（有就写，没有就不写）：slot_career（工作类型/行业/风险）、slot_wealth（财运关注点+投资类型）、slot_love（关系状态+关注点）、slot_health（旧疾/新症状+持续时间）。',
                  '另外可提炼 asking_style（提问风格/喜欢的回答方式），以及 preference/fact/constraint。',
                  '输出 JSON：{"memories":[{"kind":"preference|fact|constraint|asking_style|slot_career|slot_wealth|slot_love|slot_health","importance":1-5,"content":"..."}]}。',
                  '最多 3 条，每条 content 不超过 120 字；避免重复已有内容。',
                  `主题=${dim || 'unknown'} 时间范围=${tf || 'unknown'}`,
                  `资料=${prof ? JSON.stringify(prof) : '无'}`,
                  `已有记忆=${existing.map((m) => `${m.kind}:${m.content}`).slice(0, 12).join(' | ')}`,
                  `用户：${u}`,
                  `助手：${a}`
                ].join('\n')
              : [
                  'You are a memory extractor. Extract reusable user info/preferences/constraints to improve future chats.',
                  'Only extract stable information (preferences, long-term facts, explicit constraints, asking style). Avoid one-off details.',
                  'Do not include sensitive data (IDs, bank cards, exact addresses, passwords). If DOB is in profile, do not repeat it.',
                  'Prefer these slots when available: slot_career (role/industry/risk), slot_wealth (focus + investment type), slot_love (relationship status + focus), slot_health (ongoing vs new + duration).',
                  'You may also extract asking_style, and preference/fact/constraint.',
                  'Output JSON only: {"memories":[{"kind":"preference|fact|constraint|asking_style|slot_career|slot_wealth|slot_love|slot_health","importance":1-5,"content":"..."}]}.',
                  'Max 3 items. Each content <= 200 chars. Avoid duplicates with existing memories.',
                  `topic=${dim || 'unknown'} timeframe=${tf || 'unknown'}`,
                  `profile=${prof ? JSON.stringify(prof) : 'none'}`,
                  `existing=${existing.map((m) => `${m.kind}:${m.content}`).slice(0, 12).join(' | ')}`,
                  `user: ${u}`,
                  `assistant: ${a}`
                ].join('\n');

            const data = await callChatJSON(prompt);
            const arr = Array.isArray(data?.memories) ? data.memories : [];
            for (const it of arr.slice(0, 3)) {
              const kind = String(it?.kind ?? '').trim();
              const content = String(it?.content ?? '').trim();
              const importance = Number(it?.importance ?? 1);
              if (!allowedMemoryKinds.has(kind)) continue;
              if (!content) continue;
              if (langIsZh && content.length > 120) continue;
              if (!langIsZh && content.length > 200) continue;
              if (isSingletonKind(kind)) {
                await upsertSingletonMemory(userId, kind, content, importance);
              } else {
                await upsertUserMemory(userId, kind, content, importance);
              }
            }

            const total = await countUserMemories(userId);
            if (total > 40) {
              const all = await loadUserMemories(userId, 80);
              const keepKinds = ['profile_summary', 'asking_style', 'slot_career', 'slot_wealth', 'slot_love', 'slot_health'];
              const raw = all
                .filter((m) => !keepKinds.includes(String(m.kind ?? '')))
                .map((m) => `[${m.kind}] ${m.content}`)
                .join('\n');
              const compressPrompt = langIsZh
                ? [
                    '你是“记忆压缩器”。把下面记忆合并去重，输出更精炼但保留关键信息。',
                    '只保留对后续对话有帮助的：偏好/长期事实/明确约束/提问习惯。',
                    '输出 JSON：{"memories":[{"kind":"preference|fact|constraint|asking_style|slot_career|slot_wealth|slot_love|slot_health","importance":1-5,"content":"..."}]}。',
                    '最多 12 条；每条不超过 120 字；不要包含敏感信息。',
                    raw
                  ].join('\n')
                : [
                    'You are a memory compressor. Merge and deduplicate the memories below into a smaller, useful set.',
                    'Keep only what helps future chats: preferences, long-term facts, explicit constraints, asking style.',
                    'Output JSON only: {"memories":[{"kind":"preference|fact|constraint|asking_style|slot_career|slot_wealth|slot_love|slot_health","importance":1-5,"content":"..."}]}.',
                    'Max 12 items; each <= 200 chars; no sensitive data.',
                    raw
                  ].join('\n');
              const compressed = await callChatJSON(compressPrompt).catch(() => null);
              const items = Array.isArray(compressed?.memories) ? compressed.memories : [];
              const cleaned = [];
              for (const it of items.slice(0, 12)) {
                const kind = String(it?.kind ?? '').trim();
                const content = String(it?.content ?? '').trim();
                const importance = Number(it?.importance ?? 1);
                if (!allowedMemoryKinds.has(kind)) continue;
                if (!content) continue;
                if (langIsZh && content.length > 120) continue;
                if (!langIsZh && content.length > 200) continue;
                cleaned.push({ kind, content, importance });
              }
              if (cleaned.length) await replaceUserMemories(userId, cleaned, keepKinds);
            }
          } catch {}
        });
      }
      return res.json({
        reply,
        meta: metaOk ? metaIn : null,
        ...(Array.isArray(actionsOut) && actionsOut.length ? { actions: actionsOut } : {})
      });
    } catch (e) {
      const msg = String(e?.message ?? e);
      const buildOfflineReply = async () => {
        const cut = (s, n) => {
          const t = String(s ?? '').replace(/\s+/g, ' ').trim();
          if (!t) return '';
          if (t.length <= n) return t;
          return t.slice(0, n).trim() + (isZhUI ? '…' : '...');
        };
        const serverNow = new Date();
        const y = serverNow.getFullYear();
        const mo = String(serverNow.getMonth() + 1).padStart(2, '0');
        const d = String(serverNow.getDate()).padStart(2, '0');
        const hh = String(serverNow.getHours()).padStart(2, '0');
        const mm = String(serverNow.getMinutes()).padStart(2, '0');
        const ss = String(serverNow.getSeconds()).padStart(2, '0');
        const nowStr = `${y}-${mo}-${d} ${hh}:${mm}:${ss}`;

        if (mode === 'offtopic') {
          if (askTime) {
            return isZhUI
              ? `现在时间是 ${nowStr}（以服务器时间为准）。你想用易经问今日事业、财运还是感情？`
              : `Current time is ${nowStr} (server time). Do you want to ask about career, wealth, or love today?`;
          }
          if (askMath && mathExpr && mathResult) {
            return isZhUI
              ? `${mathExpr} = ${mathResult}。要不要用易经看你今天最该把劲儿用在哪一件事上？`
              : `${mathExpr} = ${mathResult}. Want to use I Ching to check what to prioritize today?`;
          }
          if (askWeather) {
            return isZhUI
              ? '我无法获取实时天气。你想用易经问今日事业、财运还是健康？'
              : "I can't access real-time weather. Do you want to ask about career, wealth, or health today?";
          }
          if (askNews) {
            return isZhUI
              ? '我无法获取实时新闻。你更想问今日运势，还是某件具体事情？'
              : "I can't access real-time news. Do you want today's fortune, or one specific matter?";
          }
        }

        if (!metaOk) {
          return isZhUI
            ? '我这边暂时没接上解读。你把问题说成一句明确的话（今天/本周/近期 + 事业/感情/财运/健康），我再带你起一卦。'
            : "I can't reach the reading service right now. State one clear question (today/this week + career/love/wealth/health), and we'll cast.";
        }

        let rules;
        try {
          rules = await loadIchingRules();
        } catch {
          return isZhUI
            ? '我这边暂时没接上解读，也没读到规则库。你稍后再试，或换个更具体的问题。'
            : "I can't reach the reading service and can't load the rule library. Please try again later.";
        }

        const b1 = String(metaIn?.primary?.binary ?? '').trim();
        const b2 = String(metaIn?.relating?.binary ?? '').trim();
        const primary = (isZhUI ? rules.byBinaryZh : rules.byBinaryEn).get(b1);
        const relating = (isZhUI ? rules.byBinaryZh : rules.byBinaryEn).get(b2);
        if (!primary || !relating) {
          return isZhUI
            ? '我这边规则库不完整，暂时没法把卦象对上。你稍后再试。'
            : 'The rule library is incomplete; I cannot match the hexagram right now.';
        }

        const upper = b1.slice(0, 3);
        const lower3 = b1.slice(3, 6);
        const triMap = isZhUI ? rules.trigramsZh : rules.trigramsEn;
        const upTri = triMap?.get(upper) ?? null;
        const lowTri = triMap?.get(lower3) ?? null;

        const cl = Array.isArray(metaIn?.changingLines) ? metaIn.changingLines : [];
        const clStr = cl.length ? cl.join(',') : isZhUI ? '无' : 'none';
        const basis = buildBasis(primary, cl);
        const tuanShort = wantsDetail ? basis.tuan : cut(basis.tuan, isZhUI ? 80 : 140);
        const xiangShort = wantsDetail ? basis.xiang : cut(basis.xiang, isZhUI ? 80 : 140);
        const lineQuotes = (Array.isArray(basis.lines) ? basis.lines : []).slice(0, 2).join(isZhUI ? '；' : ' / ');

        const cautionKey = isZhUI ? '谨慎' : 'caution';
        const actionKey = isZhUI ? '进取' : 'initiative';
        const kwUp = Array.isArray(upTri?.keywords) ? upTri.keywords : [];
        const kwLow = Array.isArray(lowTri?.keywords) ? lowTri.keywords : [];
        const tone = [...kwUp, ...kwLow].includes(cautionKey) ? (isZhUI ? '先稳后动' : 'stabilize first') : [...kwUp, ...kwLow].includes(actionKey) ? (isZhUI ? '可进可为' : 'push forward') : isZhUI ? '审时度势' : 'read the timing';

        if (isZhUI) {
          const t1 = typeof upTri?.nature === 'string' ? upTri.nature : '';
          const t2 = typeof lowTri?.nature === 'string' ? lowTri.nature : '';
          const triLine = t1 && t2 ? `上${t1}下${t2}` : '';
          const main = [
            `当前无法连接模型，我先按规则库给你一份解读。`,
            `得卦：${metaIn.primary.name}（动爻：${clStr}）→ ${metaIn.relating.name}${triLine ? `，${triLine}` : ''}`,
            basis.judgment ? `卦辞：${basis.judgment}` : '',
            tuanShort ? `彖曰：${tuanShort}` : '',
            xiangShort ? `象曰：${xiangShort}` : '',
            lineQuotes ? `动爻：${lineQuotes}` : '',
            `要点：${tone}。你想我先从“现状/转折/建议”哪一块展开？`
          ]
            .filter(Boolean)
            .slice(0, wantsDetail ? 10 : 6)
            .join('\n');
          return main;
        }

        const triLineEn =
          typeof upTri?.nature === 'string' && typeof lowTri?.nature === 'string' ? `Upper ${upTri.nature}, Lower ${lowTri.nature}` : '';
        const mainEn = [
          `I can't reach the model, so here's a rule-based reading.`,
          `Hexagram: ${metaIn.primary.name} (changing: ${clStr}) → ${metaIn.relating.name}${triLineEn ? `, ${triLineEn}` : ''}`,
          basis.judgment ? `Judgment: ${basis.judgment}` : '',
          xiangShort ? `Image: ${xiangShort}` : '',
          tuanShort ? `Commentary: ${tuanShort}` : '',
          lineQuotes ? `Changing lines: ${lineQuotes}` : '',
          `Key: ${tone}. Want me to expand on present / turning point / advice?`
        ]
          .filter(Boolean)
          .slice(0, wantsDetail ? 10 : 6)
          .join('\n');
        return mainEn;
      };

      const fallback = await buildOfflineReply();

      return res.json({
        reply: fallback,
        meta: metaOk ? { ...metaIn, aiError: msg } : { aiError: msg },
        ...(Array.isArray(actionsOut) && actionsOut.length ? { actions: actionsOut } : {})
      });
    }
  });

  r.get('/chat', async (req, res) => {
    return res.json({ ok: true, hint: 'POST /api/chat with { message, locale, history }' });
  });

  r.post('/chat/conversations', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const locale = String(req.body?.locale ?? 'en');
    const agentIdIn = String(req.body?.agentId ?? '').trim();
    const title = String(req.body?.title ?? '').trim();

    const a = agentIdIn ? (await query('select * from agents where id=? and status=? limit 1', [agentIdIn, 'active']).catch(() => []))?.[0] : await getDefaultAgentForUser(userId);
    if (!a) return res.status(404).json({ error: 'agent_not_found' });

    const id = crypto.randomUUID();
    const now = new Date();
    await exec('insert into chat_conversations (id,user_id,agent_id,title,created_at,updated_at) values (?,?,?,?,?,?)', [
      id,
      userId,
      a.id,
      title,
      now,
      now
    ]);
    return res.json({ conversation: { id, title, agent: presentAgent(a, locale), updated_at: now.toISOString() } });
  });

  r.get('/chat/conversations', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
    const rows = await query('select id,agent_id,title,updated_at from chat_conversations where user_id=? order by updated_at desc limit ?', [userId, limit]).catch(() => []);
    return res.json({ rows: Array.isArray(rows) ? rows : [] });
  });

  r.get('/chat/conversations/:id/messages', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const id = String(req.params.id ?? '');
    const conv = await query('select id from chat_conversations where id=? and user_id=? limit 1', [id, userId]).catch(() => []);
    if (!Array.isArray(conv) || !conv.length) return res.status(404).json({ error: 'not_found' });
    const rows = await query('select id,role,content,created_at from chat_messages where conversation_id=? order by created_at asc limit 200', [id]).catch(() => []);
    return res.json({ rows: Array.isArray(rows) ? rows : [] });
  });

  r.post('/chat/conversations/:id/messages', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const convId = String(req.params.id ?? '');
    const content = String(req.body?.content ?? '').trim();
    const locale = String(req.body?.locale ?? 'en');
    if (!content) return res.status(400).json({ error: 'invalid_content' });

    const convRows = await query('select id,agent_id from chat_conversations where id=? and user_id=? limit 1', [convId, userId]).catch(() => []);
    const conv = Array.isArray(convRows) ? convRows[0] : null;
    if (!conv) return res.status(404).json({ error: 'not_found' });

    const agentRows = await query('select * from agents where id=? limit 1', [conv.agent_id]).catch(() => []);
    const agent = Array.isArray(agentRows) ? agentRows[0] : null;
    if (!agent || agent.status !== 'active') return res.status(409).json({ error: 'agent_unavailable' });

    const now = new Date();
    const userMsgId = crypto.randomUUID();
    await exec('insert into chat_messages (id,conversation_id,role,content,created_at) values (?,?,?,?,?)', [
      userMsgId,
      convId,
      'user',
      content,
      now
    ]);

    const hist = await query('select role,content from chat_messages where conversation_id=? order by created_at desc limit 20', [convId]).catch(() => []);
    const history = (Array.isArray(hist) ? hist : []).reverse().map((m) => ({ role: m.role, content: String(m.content ?? '') }));

    const sys = isZh(locale) ? String(agent.system_prompt_zh ?? '') : String(agent.system_prompt_en ?? '');
    const messages = [{ role: 'system', content: sys }, ...history];

    let reply = '';
    try {
      reply = await callChatText(messages, { temperature: 0.7 });
    } catch (e) {
      return res.status(502).json({ error: 'ai_failed', detail: String(e?.message ?? e) });
    }
    reply = reply.trim();
    if (!reply) return res.status(502).json({ error: 'ai_empty' });

    const assistantId = crypto.randomUUID();
    const now2 = new Date();
    await exec('insert into chat_messages (id,conversation_id,role,content,created_at) values (?,?,?,?,?)', [
      assistantId,
      convId,
      'assistant',
      reply,
      now2
    ]);
    await exec('update chat_conversations set updated_at=? where id=?', [now2, convId]);

    return res.json({
      message: { id: assistantId, role: 'assistant', content: reply, created_at: now2.toISOString() },
      agent: presentAgent(agent, locale)
    });
  });

  r.get('/memories', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const rows = await loadUserMemories(userId, 50);
    return res.json({ rows });
  });

  r.post('/memories/bulk', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    await ensureMemoryTable();
    const out = [];
    for (const it of items.slice(0, 20)) {
      const kind = String(it?.kind ?? '').trim();
      const content = String(it?.content ?? '').trim();
      const importance = Number(it?.importance ?? 3);
      if (!allowedMemoryKinds.has(kind)) continue;
      if (!content) {
        await exec('delete from user_memories where user_id=? and kind=?', [userId, kind]);
        continue;
      }
      if (isSingletonKind(kind)) {
        await upsertSingletonMemory(userId, kind, content, importance);
      } else {
        await upsertUserMemory(userId, kind, content, importance);
      }
      out.push({ kind, ok: true });
    }
    return res.json({ ok: true, rows: out });
  });

  r.delete('/memories/:id', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const id = String(req.params.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    await ensureMemoryTable();
    await exec('delete from user_memories where id=? and user_id=?', [id, userId]);
    return res.json({ ok: true });
  });

  r.post('/memories/clear', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    await ensureMemoryTable();
    await exec('delete from user_memories where user_id=?', [userId]);
    return res.json({ ok: true });
  });

  r.get('/records', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)));
    const rows = await query(
      'select id,created_at,dimension,question,primary_name,primary_binary,relating_name,changing_lines,ai_analysis from divination_records where user_id=? order by created_at desc limit ?',
      [userId, limit]
    );
    return res.json({ rows: Array.isArray(rows) ? rows : [] });
  });

  r.post('/divination', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const body = req.body ?? {};
    const dimension = String(body.dimension ?? '');
    const question = String(body.question ?? '').trim();
    const locale = String(body.locale ?? 'en');

    if (!['love', 'wealth', 'health', 'career'].includes(dimension)) return res.status(400).json({ error: 'invalid_dimension' });
    if (!question) return res.status(400).json({ error: 'invalid_question' });

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const month = `${today.slice(0, 7)}-01`;

    const pRows = await query('select * from profiles where user_id=? limit 1', [userId]);
    const pRaw = Array.isArray(pRows) ? pRows[0] : null;
    if (!pRaw) return res.status(404).json({ error: 'profile_not_found' });
    const prof = normalizeProfileRow(pRaw);
    if (prof.status === 'banned') return res.status(403).json({ error: 'banned' });

    let dailyRemaining = prof.daily_remaining;
    let dailyDate = prof.daily_date;
    let monthlyRemaining = prof.monthly_remaining;
    let monthlyMonth = prof.monthly_month;

    if (dailyDate !== today) {
      dailyRemaining = 3;
      dailyDate = today;
    }
    if (monthlyMonth !== month) {
      monthlyRemaining = 0;
      monthlyMonth = month;
    }

    let used = false;
    if (dailyRemaining > 0) {
      dailyRemaining -= 1;
      used = true;
    } else if (monthlyRemaining > 0) {
      monthlyRemaining -= 1;
      used = true;
    }
    if (!used) return res.status(402).json({ error: 'no_attempts' });

    await exec(
      'update profiles set daily_remaining=?,daily_date=?,monthly_remaining=?,monthly_month=?,updated_at=? where user_id=?',
      [dailyRemaining, dailyDate, monthlyRemaining, monthlyMonth, now, userId]
    );

    const rules = await loadIchingRules();
    const coins = castCoins();
    const computed = computeHexagramsFromCoins(coins);

    const primaryZh = rules.byBinaryZh.get(computed.primaryBinary);
    const primaryEn = rules.byBinaryEn.get(computed.primaryBinary);
    const relateZh = rules.byBinaryZh.get(computed.relateBinary);
    const relateEn = rules.byBinaryEn.get(computed.relateBinary);
    if (!primaryZh || !primaryEn || !relateZh || !relateEn) return res.status(500).json({ error: 'hexagram_not_found' });

    const basisZh = buildBasis(primaryZh, computed.changingLines);
    const basisEn = buildBasis(primaryEn, computed.changingLines);
    const basis = isZh(locale) ? basisZh : basisEn;
    const primary = isZh(locale) ? primaryZh : primaryEn;
    const relating = isZh(locale) ? relateZh : relateEn;

    const prompt = isZh(locale)
      ? `你是专业的易经测算解读助手。请严格基于“卦辞/爻辞原文”推演，不要凭空编造。必须输出JSON对象：{ "analysis": string }。\n输出要求：用“人话版”，结构清晰，必须包含且按以下标题顺序输出（每条建议/避忌以“- ”开头）：\n1) 一句话结论：≤30字\n2) 具体解读：150-320字（结合维度与变爻，讲清时机/取舍/风险点）\n3) 今日建议：3条，每条≤18字\n4) 今日避忌：2条，每条≤18字\n\n维度：${dimension}\n用户问题：${question}\n用户资料：姓名=${prof.name || '未知'}，现居=${prof.current_residence || '未知'}。\n本卦：${primary.name}（${primary.binary}）\n之卦：${relateZh.name}（${relateZh.binary}）\n变爻：${computed.changingLines.length ? computed.changingLines.join(',') : '无'}\n卦辞：${basisZh.judgment}\n爻辞：${basisZh.lines.length ? basisZh.lines.join(' ') : '无'}`
      : `You are a professional I Ching divination interpreter. Base your explanation strictly on the provided Judgment and (if any) line texts. Do not fabricate. Return JSON only: { "analysis": string }.\nOutput requirements (plain English, use \"- \" for bullets):\n1) Takeaway: <= 120 chars\n2) Reading: 500-900 chars (explain timing, trade-offs, risks; reflect changing lines)\n3) Today's actions: 3 bullets, each <= 80 chars\n4) Avoid: 2 bullets, each <= 80 chars\n\nDimension: ${dimension}\nQuestion: ${question}\nUser: name=${prof.name || 'unknown'}, age=${prof.age ?? 'unknown'}, location=${prof.current_residence || 'unknown'}.\nPrimary: ${primaryEn.name} (${primaryEn.binary})\nRelating: ${relateEn.name} (${relateEn.binary})\nChanging lines: ${computed.changingLines.length ? computed.changingLines.join(',') : 'none'}\nJudgment: ${basisEn.judgment}\nLines: ${basisEn.lines.length ? basisEn.lines.join(' ') : 'none'}`;

    let analysis = '';
    try {
      const out = await callChatJSON(prompt);
      analysis = String(out?.analysis ?? '').trim();
    } catch (e) {
      console.error('ai_call_failed', String(e?.message ?? e));
      const basisText = isZh(locale)
        ? `卦辞：${basisZh.judgment}\n${basisZh.lines.length ? `爻辞：${basisZh.lines.join(' ')}` : ''}`.trim()
        : `Judgment: ${basisEn.judgment}\n${basisEn.lines.length ? `Lines: ${basisEn.lines.join(' ')}` : ''}`.trim();
      analysis = (isZh(locale)
        ? `（本地测试：模型调用失败，已用规则文本生成临时解读）\n\n一句话结论：先稳后动，宜守不宜躁。\n\n具体解读：${basisText}\n\n今日建议：\n- 先做要事\n- 把话说清\n- 小步推进\n\n今日避忌：\n- 冲动决定\n- 口舌争执`
        : `(Local test: model call failed; temporary reading generated from rule texts.)\n\nTakeaway: Stay steady first; act after timing is clear.\n\nReading: ${basisText}\n\nToday's actions:\n- Do the most important task first\n- Communicate plainly\n- Move in small steps\n\nAvoid:\n- Impulsive decisions\n- Pointless conflict`).trim();
    }
    if (!analysis) return res.status(502).json({ error: 'ai_empty' });

    const recordId = crypto.randomUUID();
    await exec(
      'insert into divination_records (id,user_id,created_at,dimension,question,primary_name,primary_binary,relating_name,relating_binary,changing_lines,coins,primary_lines_bottom_to_top,relating_lines_bottom_to_top,basis_json,ai_analysis) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        recordId,
        userId,
        now,
        dimension,
        question,
        primaryZh.name,
        primaryZh.binary,
        relateZh.name,
        relateZh.binary,
        JSON.stringify(computed.changingLines),
        JSON.stringify(coins),
        JSON.stringify(computed.primaryLinesBottomToTop),
        JSON.stringify(computed.relatingLinesBottomToTop),
        JSON.stringify({ judgment: basisZh.judgment, lines: basisZh.lines }),
        analysis
      ]
    );

    const freshProfile = await loadProfile(userId);
    return res.json({
      recordId,
      primary,
      relating,
      coins,
      primaryLinesBottomToTop: computed.primaryLinesBottomToTop,
      relatingLinesBottomToTop: computed.relatingLinesBottomToTop,
      changingLines: computed.changingLines,
      basis,
      analysis,
      profile: freshProfile
    });
  });

  r.get('/nfc-bindings', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const rows = await query('select id,tag_uid,label,created_at from nfc_bindings where user_id=? order by created_at desc limit 100', [userId]);
    return res.json({ rows: Array.isArray(rows) ? rows : [] });
  });

  r.post('/nfc-bindings', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const tagUid = String(req.body?.tag_uid ?? '').trim();
    const label = String(req.body?.label ?? '').trim();
    if (!tagUid) return res.status(400).json({ error: 'invalid_nfc' });
    const id = crypto.randomUUID();
    const now = new Date();
    try {
      await exec('insert into nfc_bindings (id,user_id,tag_uid,label,created_at) values (?,?,?,?,?)', [id, userId, tagUid, label, now]);
    } catch (e) {
      return res.status(409).json({ error: 'already_bound' });
    }
    return res.json({ ok: true });
  });

  r.delete('/nfc-bindings/:id', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const id = String(req.params.id ?? '');
    await exec('delete from nfc_bindings where id=? and user_id=?', [id, userId]);
    return res.json({ ok: true });
  });

  r.post('/redeem', requireAuth, async (req, res) => {
    const userId = req.auth.userId;
    const code = String(req.body?.code ?? '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'invalid_code' });

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [pRows] = await conn.query('select * from profiles where user_id=? for update', [userId]);
      const profRaw = Array.isArray(pRows) ? pRows[0] : null;
      if (!profRaw) throw new Error('profile_not_found');
      if (profRaw.status === 'banned') throw new Error('banned');

      const [cRows] = await conn.query('select * from redeem_codes where code=? for update', [code]);
      const c = Array.isArray(cRows) ? cRows[0] : null;
      if (!c) throw new Error('invalid_code');
      if (c.status === 'used') throw new Error('code_used');
      if (c.status === 'revoked') throw new Error('code_revoked');

      let addMonths = 0;
      let addCount = 0;
      if (c.type === 'monthly') {
        addMonths = 1;
        addCount = 100;
      } else if (c.type === 'quarterly') {
        addMonths = 3;
        addCount = 300;
      } else if (c.type === 'yearly') {
        addMonths = 12;
        addCount = 1200;
      } else if (c.type === 'permanent') {
        addMonths = 0;
        addCount = 9999;
      }

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const month = `${today.slice(0, 7)}-01`;

      let vipExpiry = profRaw.vip_expiry ? new Date(profRaw.vip_expiry) : null;
      if (c.type === 'permanent') {
        vipExpiry = new Date('9999-12-31T00:00:00.000Z');
      } else {
        const base = vipExpiry && vipExpiry > now ? vipExpiry : now;
        const d = new Date(base);
        d.setMonth(d.getMonth() + addMonths);
        vipExpiry = d;
      }

      const newMonthly = Math.max(0, Number(profRaw.monthly_remaining ?? 0)) + addCount;

      await conn.execute('update redeem_codes set status=?, used_by=?, used_at=? where id=?', ['used', userId, now, c.id]);
      await conn.execute(
        'update users set role=?, updated_at=? where id=?',
        ['paid', now, userId]
      );
      await conn.execute(
        'update profiles set role=?, vip_expiry=?, monthly_remaining=?, monthly_month=?, updated_at=? where user_id=?',
        ['paid', vipExpiry.toISOString().slice(0, 10), newMonthly, month, now, userId]
      );

      await conn.commit();

      const fresh = await loadProfile(userId);
      return res.json({ vipExpiry: fresh?.vip_expiry ?? null, monthlyRemaining: fresh?.monthly_remaining ?? 0, profile: fresh });
    } catch (e) {
      await conn.rollback().catch(() => null);
      const msg = String(e?.message ?? e);
      const status =
        msg.includes('invalid_code') ? 400 : msg.includes('code_used') || msg.includes('code_revoked') ? 409 : msg.includes('banned') ? 403 : 400;
      return res.status(status).json({ error: msg });
    } finally {
      conn.release();
    }
  });

  r.get('/admin/users', requireAuth, requireAdmin, async (_req, res) => {
    const rows = await query('select * from profiles order by created_at desc limit 500');
    const out = (Array.isArray(rows) ? rows : []).map(normalizeProfileRow);
    return res.json({ rows: out });
  });

  r.patch('/admin/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
    const userId = String(req.params.id ?? '');
    const status = String(req.body?.status ?? '');
    if (!['active', 'banned'].includes(status)) return res.status(400).json({ error: 'invalid_status' });
    await exec('update users set status=?,updated_at=? where id=?', [status, new Date(), userId]);
    await exec('update profiles set status=?,updated_at=? where user_id=?', [status, new Date(), userId]);
    return res.json({ ok: true });
  });

  r.get('/admin/records', requireAuth, requireAdmin, async (req, res) => {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 200)));
    const rows = await query(
      'select r.*, p.email as user_email from divination_records r left join profiles p on p.user_id=r.user_id order by r.created_at desc limit ?',
      [limit]
    );
    return res.json({ rows: Array.isArray(rows) ? rows : [] });
  });

  r.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
    const days = Math.max(1, Math.min(365, Number(req.query.days ?? 7)));
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    const startStr = start.toISOString().slice(0, 10);

    const [totalUsersRows, activeUsersRows, paidUsersRows, totalDivRows] = await Promise.all([
      query('select count(*) as c from users'),
      query("select count(*) as c from users where status='active'"),
      query("select count(*) as c from users where role='paid'"),
      query('select count(*) as c from divination_records')
    ]);

    const totalUsers = Number((Array.isArray(totalUsersRows) ? totalUsersRows[0]?.c : 0) ?? 0);
    const activeUsers = Number((Array.isArray(activeUsersRows) ? activeUsersRows[0]?.c : 0) ?? 0);
    const paidUsers = Number((Array.isArray(paidUsersRows) ? paidUsersRows[0]?.c : 0) ?? 0);
    const totalDivinations = Number((Array.isArray(totalDivRows) ? totalDivRows[0]?.c : 0) ?? 0);

    const usersByDayRows = await query(
      "select date(created_at) as d, count(*) as c from users where date(created_at) >= ? group by date(created_at) order by d asc",
      [startStr]
    );
    const divByDayRows = await query(
      "select date(created_at) as d, count(*) as c from divination_records where date(created_at) >= ? group by date(created_at) order by d asc",
      [startStr]
    );

    const usersByDay = new Map((Array.isArray(usersByDayRows) ? usersByDayRows : []).map((r) => [String(r.d), Number(r.c)]));
    const divByDay = new Map((Array.isArray(divByDayRows) ? divByDayRows : []).map((r) => [String(r.d), Number(r.c)]));

    const growth = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      growth.push({ date: ds, users: usersByDay.get(ds) ?? 0, divinations: divByDay.get(ds) ?? 0 });
    }

    const dimRows = await query(
      "select dimension as name, count(*) as value from divination_records where date(created_at) >= ? group by dimension order by value desc",
      [startStr]
    );

    return res.json({
      totalUsers,
      activeUsers,
      paidUsers,
      totalDivinations,
      growth,
      dimensions: Array.isArray(dimRows) ? dimRows : []
    });
  });

  r.get('/admin/models', requireAuth, requireAdmin, async (_req, res) => {
    const rows = await query(
      'select id,provider,name,base_url,model,api_key_last4,is_default,updated_at from ai_provider_configs order by is_default desc, updated_at desc limit 50'
    );
    return res.json({ rows: Array.isArray(rows) ? rows : [] });
  });

  r.post('/admin/models', requireAuth, requireAdmin, async (req, res) => {
    const id = String(req.body?.id ?? '').trim();
    const provider = String(req.body?.provider ?? '').trim();
    const name = String(req.body?.name ?? '').trim();
    const baseUrl = String(req.body?.baseUrl ?? '').trim();
    const model = String(req.body?.model ?? '').trim();
    const apiKey = String(req.body?.apiKey ?? '').trim();
    const isDefault = !!req.body?.isDefault;
    if (!provider || !baseUrl || !model) return res.status(400).json({ error: 'invalid_model_config' });
    const now = new Date();

    if (isDefault) await exec('update ai_provider_configs set is_default=0', []);

    if (!id) {
      if (!apiKey) return res.status(400).json({ error: 'invalid_model_config' });
      const newId = crypto.randomUUID();
      const last4 = apiKey ? apiKey.slice(-4) : null;
      await exec(
        'insert into ai_provider_configs (id,provider,name,base_url,model,api_key,api_key_last4,is_default,updated_at) values (?,?,?,?,?,?,?,?,?)',
        [newId, provider, name, baseUrl, model, apiKey, last4, isDefault ? 1 : 0, now]
      );
      return res.json({ id: newId });
    }

    const existingRows = await query('select api_key from ai_provider_configs where id=? limit 1', [id]);
    const existing = Array.isArray(existingRows) ? existingRows[0] : null;
    if (!existing) return res.status(404).json({ error: 'not_found' });

    const nextKey = apiKey || existing.api_key;
    const last4 = nextKey ? String(nextKey).slice(-4) : null;
    await exec(
      'update ai_provider_configs set provider=?, name=?, base_url=?, model=?, api_key=?, api_key_last4=?, is_default=?, updated_at=? where id=?',
      [provider, name, baseUrl, model, nextKey, last4, isDefault ? 1 : 0, now, id]
    );
    return res.json({ id });
  });

  r.post('/admin/models/set-default', requireAuth, requireAdmin, async (req, res) => {
    const id = String(req.body?.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    await exec('update ai_provider_configs set is_default=0', []);
    const affected = await exec('update ai_provider_configs set is_default=1, updated_at=? where id=?', [new Date(), id]);
    if (!affected?.affectedRows) return res.status(404).json({ error: 'not_found' });
    return res.json({ ok: true });
  });

  r.post('/admin/models/test', requireAuth, requireAdmin, async (req, res) => {
    const id = String(req.body?.id ?? '').trim();
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    const rows = await query('select provider,base_url,model,api_key from ai_provider_configs where id=? limit 1', [id]);
    const c = Array.isArray(rows) ? rows[0] : null;
    if (!c) return res.status(404).json({ error: 'not_found' });
    const started = Date.now();
    try {
      const url = String(c.base_url ?? '').trim();
      const model = String(c.model ?? '').trim();
      const apiKey = String(c.api_key ?? '').trim();
      const endpoint = url.replace(/\/$/, '').endsWith('/v1') ? `${url.replace(/\/$/, '')}/chat/completions` : `${url.replace(/\/$/, '')}/v1/chat/completions`;
      const body = {
        model,
        messages: [{ role: 'user', content: 'ping' }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      };
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const text = await resp.text();
      if (!resp.ok) return res.json({ ok: false, latencyMs: Date.now() - started, error: text.slice(0, 200) });
      return res.json({ ok: true, latencyMs: Date.now() - started });
    } catch (e) {
      return res.json({ ok: false, latencyMs: Date.now() - started, error: String(e?.message ?? e) });
    }
  });

  function generateCode(type) {
    const prefix = type === 'monthly' ? 'M' : type === 'quarterly' ? 'Q' : type === 'yearly' ? 'Y' : 'P';
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const randomStr = Array.from(bytes)
      .map((b) => (b % 36).toString(36))
      .join('')
      .toUpperCase();
    return `YJ-${prefix}-${randomStr}`;
  }

  r.get('/admin/codes', requireAuth, requireAdmin, async (_req, res) => {
    const rows = await query('select * from redeem_codes order by created_at desc limit 500');
    return res.json({ rows: Array.isArray(rows) ? rows : [] });
  });

  r.post('/admin/codes/generate', requireAuth, requireAdmin, async (req, res) => {
    const type = String(req.body?.type ?? '');
    const count = Math.max(1, Math.min(200, Number(req.body?.count ?? 1)));
    if (!['monthly', 'quarterly', 'yearly', 'permanent'].includes(type)) return res.status(400).json({ error: 'invalid_type' });
    const now = new Date();
    const codes = [];
    for (let i = 0; i < count; i++) {
      const id = crypto.randomUUID();
      const code = generateCode(type);
      await exec('insert into redeem_codes (id,code,type,status,created_at) values (?,?,?,?,?)', [id, code, type, 'unused', now]);
      codes.push({ id, code, type, status: 'unused', created_at: now.toISOString() });
    }
    return res.json({ codes });
  });

  r.patch('/admin/codes/:id/revoke', requireAuth, requireAdmin, async (req, res) => {
    const id = String(req.params.id ?? '');
    await exec('update redeem_codes set status=? where id=? and status=?', ['revoked', id, 'unused']);
    return res.json({ ok: true });
  });

  return r;
}
