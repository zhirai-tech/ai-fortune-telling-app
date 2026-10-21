import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cache = null;

async function readFirst(paths) {
  let lastErr = null;
  for (const p of paths) {
    try {
      return await fs.readFile(p, 'utf8');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('read_failed');
}

export async function loadIchingRules() {
  if (cache) return cache;

  const zhPaths = [
    path.resolve(process.cwd(), 'iching64.zh.json'),
    path.resolve(__dirname, 'iching64.zh.json')
  ];

  const enPaths = [
    path.resolve(process.cwd(), 'iching64.en.json'),
    path.resolve(__dirname, 'iching64.en.json')
  ];

  const zhExtraPaths = [
    path.resolve(process.cwd(), 'iching64.zh.extras.json'),
    path.resolve(__dirname, 'iching64.zh.extras.json')
  ];

  const enExtraPaths = [
    path.resolve(process.cwd(), 'iching64.en.extras.json'),
    path.resolve(__dirname, 'iching64.en.extras.json')
  ];

  const triZhPaths = [
    path.resolve(process.cwd(), 'iching_trigrams.zh.json'),
    path.resolve(__dirname, 'iching_trigrams.zh.json')
  ];

  const triEnPaths = [
    path.resolve(process.cwd(), 'iching_trigrams.en.json'),
    path.resolve(__dirname, 'iching_trigrams.en.json')
  ];

  const [zhText, enText, zhExtraText, enExtraText, triZhText, triEnText] = await Promise.all([
    readFirst(zhPaths),
    readFirst(enPaths),
    readFirst(zhExtraPaths).catch(() => '[]'),
    readFirst(enExtraPaths).catch(() => '[]'),
    readFirst(triZhPaths).catch(() => '{}'),
    readFirst(triEnPaths).catch(() => '{}')
  ]);
  const zhArr = JSON.parse(zhText);
  const enArr = JSON.parse(enText);
  const zhExtraArr = JSON.parse(zhExtraText);
  const enExtraArr = JSON.parse(enExtraText);
  const triZhObj = JSON.parse(triZhText);
  const triEnObj = JSON.parse(triEnText);

  const byBinaryZh = new Map();
  const byBinaryEn = new Map();
  const extraZh = new Map();
  const extraEn = new Map();
  for (const x of Array.isArray(zhExtraArr) ? zhExtraArr : []) extraZh.set(x.binary, x);
  for (const x of Array.isArray(enExtraArr) ? enExtraArr : []) extraEn.set(x.binary, x);

  for (const h of Array.isArray(zhArr) ? zhArr : []) {
    const ex = extraZh.get(h.binary);
    if (ex && typeof ex === 'object') Object.assign(h, ex);
    byBinaryZh.set(h.binary, h);
  }
  for (const h of Array.isArray(enArr) ? enArr : []) {
    const ex = extraEn.get(h.binary);
    if (ex && typeof ex === 'object') Object.assign(h, ex);
    byBinaryEn.set(h.binary, h);
  }

  const trigramsZh = new Map(Object.entries(triZhObj || {}));
  const trigramsEn = new Map(Object.entries(triEnObj || {}));

  cache = { byBinaryZh, byBinaryEn, trigramsZh, trigramsEn };
  return cache;
}

export function isZh(locale) {
  return String(locale ?? '').toLowerCase().startsWith('zh');
}

export function castCoinLine() {
  const b = crypto.getRandomValues(new Uint8Array(1))[0] & 7;
  if (b === 0) return 6;
  if (b <= 3) return 7;
  if (b <= 6) return 8;
  return 9;
}

export function castCoins() {
  const out = [];
  for (let i = 0; i < 6; i++) out.push(castCoinLine());
  return out;
}

export function computeHexagramsFromCoins(values) {
  const changingLines = [];
  const primaryLinesBottomToTop = values.map((v, idx) => {
    if (v === 6 || v === 9) changingLines.push(idx + 1);
    return v === 6 || v === 8 ? 0 : 1;
  });

  const primaryBinary = primaryLinesBottomToTop.slice().reverse().join('');

  const relatingLinesBottomToTop = primaryLinesBottomToTop.slice();
  for (const line of changingLines) {
    const i = line - 1;
    relatingLinesBottomToTop[i] = relatingLinesBottomToTop[i] === 1 ? 0 : 1;
  }
  const relateBinary = relatingLinesBottomToTop.slice().reverse().join('');

  return { primaryBinary, relateBinary, changingLines, primaryLinesBottomToTop, relatingLinesBottomToTop };
}

export function buildBasis(hex, changingLines) {
  const selected = changingLines.length ? changingLines.map((n) => hex.lines[n - 1]) : [];
  return {
    judgment: hex.judgment,
    lines: selected,
    allLines: Array.isArray(hex.lines) ? hex.lines : [],
    tuan: typeof hex.tuan === 'string' ? hex.tuan : '',
    xiang: typeof hex.xiang === 'string' ? hex.xiang : '',
    wenyan: typeof hex.wenyan === 'string' ? hex.wenyan : ''
  };
}
