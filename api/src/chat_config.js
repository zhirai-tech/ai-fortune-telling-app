import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cache = null;

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function readFirst(paths) {
  let lastErr = null;
  for (const p of paths) {
    try {
      return await readJson(p);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('read_failed');
}

export async function loadChatConfig() {
  if (cache) return cache;
  const zhPaths = [path.resolve(process.cwd(), 'chat_config.zh.json'), path.resolve(__dirname, 'chat_config.zh.json')];
  const enPaths = [path.resolve(process.cwd(), 'chat_config.en.json'), path.resolve(__dirname, 'chat_config.en.json')];
  const [zh, en] = await Promise.all([readFirst(zhPaths), readFirst(enPaths)]);
  cache = { zh, en };
  return cache;
}

export function compilePatterns(patterns, flags = 'i') {
  const out = [];
  for (const p of Array.isArray(patterns) ? patterns : []) {
    try {
      out.push(new RegExp(String(p), flags));
    } catch {
      out.push(null);
    }
  }
  return out.filter(Boolean);
}

export function matchAny(res, text) {
  const s = String(text ?? '');
  for (const r of Array.isArray(res) ? res : []) {
    try {
      if (r.test(s)) return true;
    } catch {}
  }
  return false;
}

export function fillTemplate(tpl, vars) {
  let s = String(tpl ?? '');
  const v = vars && typeof vars === 'object' ? vars : {};
  for (const k of Object.keys(v)) {
    s = s.replaceAll(`{{${k}}}`, String(v[k]));
  }
  return s;
}
