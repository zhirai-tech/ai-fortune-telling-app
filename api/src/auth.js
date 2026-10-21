import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, exec } from './db.js';

function jwtSecret() {
  const s = (process.env.JWT_SECRET ?? '').trim();
  if (!s) throw new Error('jwt_secret_missing');
  return s;
}

export function signAccessToken(payload) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: '14d' });
}

export function requireAuth(req, res, next) {
  const h = String(req.headers.authorization ?? '');
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'unauthorized' });
  try {
    const decoded = jwt.verify(m[1], jwtSecret());
    req.auth = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

export function optionalAuth(req, _res, next) {
  const h = String(req.headers.authorization ?? '');
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return next();
  try {
    const decoded = jwt.verify(m[1], jwtSecret());
    req.auth = decoded;
  } catch {}
  return next();
}

export function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  return next();
}

export async function registerUser(email, password, locale = 'en') {
  const e = String(email ?? '').trim().toLowerCase();
  const p = String(password ?? '');
  if (!e || !p || p.length < 6) throw new Error('invalid_credentials');

  const exists = await query('select id from users where email = ? limit 1', [e]);
  if (Array.isArray(exists) && exists.length) throw new Error('email_taken');

  const now = new Date();
  const hash = await bcrypt.hash(p, 10);
  const userId = crypto.randomUUID();

  await exec(
    'insert into users (id,email,password_hash,role,status,locale,created_at,updated_at) values (?,?,?,?,?,?,?,?)',
    [userId, e, hash, 'free', 'active', locale, now, now]
  );

  const today = now.toISOString().slice(0, 10);
  const month = `${today.slice(0, 7)}-01`;

  await exec(
    'insert into profiles (user_id,email,role,status,locale,name,gender,birth_date,birth_time,relationship_status,birth_place,current_residence,daily_remaining,daily_date,monthly_remaining,monthly_month,vip_expiry,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      userId,
      e,
      'free',
      'active',
      locale,
      '',
      '',
      null,
      null,
      null,
      '',
      '',
      3,
      today,
      0,
      month,
      null,
      now,
      now
    ]
  );

  return { userId };
}

export async function verifyLogin(email, password) {
  const e = String(email ?? '').trim().toLowerCase();
  const p = String(password ?? '');
  if (!e || !p) throw new Error('invalid_credentials');

  const rows = await query('select id,password_hash,role,status from users where email = ? limit 1', [e]);
  const u = Array.isArray(rows) ? rows[0] : null;
  if (!u) throw new Error('invalid_credentials');
  if (u.status === 'banned') throw new Error('banned');
  if (!u.password_hash) throw new Error('invalid_credentials');

  const ok = await bcrypt.compare(p, u.password_hash);
  if (!ok) throw new Error('invalid_credentials');

  return { userId: u.id, role: u.role, status: u.status };
}

export async function upsertGoogleUser({ sub, email, locale = 'zh' }) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = `${today.slice(0, 7)}-01`;
  const provider = 'google';

  const bySub = await query('select id,role,status from users where oauth_provider=? and oauth_sub=? limit 1', [provider, sub]);
  const u1 = Array.isArray(bySub) ? bySub[0] : null;
  if (u1) return { userId: u1.id, role: u1.role, status: u1.status };

  const e = String(email ?? '').trim().toLowerCase();
  if (e) {
    const byEmail = await query('select id,role,status,oauth_provider,oauth_sub from users where email=? limit 1', [e]);
    const u2 = Array.isArray(byEmail) ? byEmail[0] : null;
    if (u2) {
      if (u2.status === 'banned') return { userId: u2.id, role: u2.role, status: u2.status };
      if (!u2.oauth_provider && !u2.oauth_sub) {
        await exec('update users set oauth_provider=?, oauth_sub=?, updated_at=? where id=?', [provider, sub, now, u2.id]);
      }
      const prof = await loadProfile(u2.id);
      if (!prof) {
        await exec(
          'insert into profiles (user_id,email,role,status,locale,name,gender,birth_date,birth_time,relationship_status,birth_place,current_residence,daily_remaining,daily_date,monthly_remaining,monthly_month,vip_expiry,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [u2.id, e, u2.role, u2.status, locale, '', '', null, null, null, '', '', 3, today, 0, month, null, now, now]
        );
      }
      return { userId: u2.id, role: u2.role, status: u2.status };
    }
  }

  const userId = crypto.randomUUID();
  await exec(
    'insert into users (id,email,password_hash,oauth_provider,oauth_sub,role,status,locale,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?)',
    [userId, e || null, null, provider, sub, 'free', 'active', locale, now, now]
  );
  await exec(
    'insert into profiles (user_id,email,role,status,locale,name,gender,birth_date,birth_time,relationship_status,birth_place,current_residence,daily_remaining,daily_date,monthly_remaining,monthly_month,vip_expiry,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [userId, e || null, 'free', 'active', locale, '', '', null, null, null, '', '', 3, today, 0, month, null, now, now]
  );
  return { userId, role: 'free', status: 'active' };
}

export async function loadProfile(userId) {
  const rows = await query('select * from profiles where user_id = ? limit 1', [userId]);
  const p = Array.isArray(rows) ? rows[0] : null;
  if (!p) return null;
  return normalizeProfileRow(p);
}

export function normalizeProfileRow(r) {
  return {
    id: r.user_id,
    email: r.email,
    role: r.role,
    status: r.status,
    locale: r.locale,
    name: r.name,
    gender: r.gender,
    birth_date: r.birth_date ? String(r.birth_date).slice(0, 10) : null,
    birth_time: r.birth_time,
    relationship_status: r.relationship_status,
    birth_place: r.birth_place,
    current_residence: r.current_residence,
    daily_remaining: Number(r.daily_remaining ?? 0),
    daily_date: r.daily_date ? String(r.daily_date).slice(0, 10) : '',
    monthly_remaining: Number(r.monthly_remaining ?? 0),
    monthly_month: r.monthly_month ? String(r.monthly_month).slice(0, 10) : '',
    vip_expiry: r.vip_expiry ? String(r.vip_expiry).slice(0, 10) : null,
    created_at: new Date(r.created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString()
  };
}
