import fs from 'node:fs/promises';
import path from 'node:path';
import * as OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });

const kingWenNames = [
  '乾为天',
  '坤为地',
  '水雷屯',
  '山水蒙',
  '水天需',
  '天水讼',
  '地水师',
  '水地比',
  '风天小畜',
  '天泽履',
  '地天泰',
  '天地否',
  '天火同人',
  '火天大有',
  '地山谦',
  '雷地豫',
  '泽雷随',
  '山风蛊',
  '地泽临',
  '风地观',
  '火雷噬嗑',
  '山火贲',
  '山地剥',
  '地雷复',
  '天雷无妄',
  '山天大畜',
  '山雷颐',
  '泽风大过',
  '坎为水',
  '离为火',
  '泽山咸',
  '雷风恒',
  '天山遯',
  '雷天大壮',
  '火地晋',
  '地火明夷',
  '风火家人',
  '火泽睽',
  '水山蹇',
  '雷水解',
  '山泽损',
  '风雷益',
  '泽天夬',
  '天风姤',
  '泽地萃',
  '地风升',
  '泽水困',
  '水风井',
  '泽火革',
  '火风鼎',
  '震为雷',
  '艮为山',
  '风山渐',
  '雷泽归妹',
  '雷火丰',
  '火山旅',
  '巽为风',
  '兑为泽',
  '风水涣',
  '水泽节',
  '风泽中孚',
  '雷山小过',
  '水火既济',
  '火水未济',
];

const pageTitles = [
  '乾',
  '坤',
  '屯',
  '蒙',
  '需',
  '讼',
  '师',
  '比',
  '小畜',
  '履',
  '泰',
  '否',
  '同人',
  '大有',
  '谦',
  '豫',
  '随',
  '蛊',
  '临',
  '观',
  '噬嗑',
  '贲',
  '剥',
  '复',
  '无妄',
  '大畜',
  '颐',
  '大过',
  '坎',
  '离',
  '咸',
  '恒',
  '遯',
  '大壮',
  '晋',
  '明夷',
  '家人',
  '睽',
  '蹇',
  '解',
  '损',
  '益',
  '夬',
  '姤',
  '萃',
  '升',
  '困',
  '井',
  '革',
  '鼎',
  '震',
  '艮',
  '渐',
  '归妹',
  '丰',
  '旅',
  '巽',
  '兑',
  '涣',
  '节',
  '中孚',
  '小过',
  '既济',
  '未济',
];

function stripWikiTemplates(s) {
  return s
    .replace(/-\{([^}]+)\}-/g, '$1')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function fetchText(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`fetch_failed_${resp.status}:${url}`);
  return await resp.text();
}

function parseWikisourceRaw(raw) {
  const cleaned = stripWikiTemplates(raw);
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  const startIdx = lines.findIndex((l) => l.includes('易經：'));
  if (startIdx === -1) throw new Error('missing_yijing_section');

  const norm = (l) =>
    String(l ?? '')
      .replace(/^[*#]+/, '')
      .replace(/^'+/, '')
      .replace(/^;+/, '')
      .trim();

  const yijingLines = [];
  let stopAt = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = norm(lines[i]);
    if (line.startsWith('彖曰') || line.startsWith('象曰') || line.startsWith('文言曰')) {
      stopAt = i;
      break;
    }
    if (!line || line.includes('易經：')) continue;
    yijingLines.push(line);
  }

  const judgmentLine = yijingLines.find(
    (l) => !/^(初|六|九|上|用)/.test(l) && !l.includes('易經：')
  );
  let judgment = '';
  if (judgmentLine) {
    if (judgmentLine.includes('：')) {
      judgment = judgmentLine.split('：').slice(1).join('：').trim();
    } else {
      const m = judgmentLine.match(/^([\u4e00-\u9fff]{1,4})/);
      judgment = m ? judgmentLine.slice(m[0].length).trim() : judgmentLine.trim();
    }
  }

  const yao = yijingLines
    .filter((l) => /^(初|六|九|上)/.test(l))
    .filter((l) => !/^用(六|九)/.test(l))
    .slice(0, 6)
    .map((l) => l.trim());

  if (!judgment || yao.length !== 6) throw new Error('invalid_yijing_parse');

  const takeBlock = (idx, until) => {
    if (idx < 0) return '';
    const out = [];
    for (let i = idx; i < lines.length; i++) {
      const line = norm(lines[i]);
      if (!line) continue;
      const stop = typeof until === 'function' ? until(line) : until?.test?.(line);
      if (i !== idx && stop) break;
      out.push(line);
    }
    const first = out[0] ?? '';
    const head = first.replace(/^(彖曰|象曰|文言曰)\s*[:：]?\s*/, '').trim();
    const rest = out.slice(1).join(' ').trim();
    const joined = [head, rest].filter(Boolean).join(' ').trim();
    return converter(joined);
  };

  const isYaoHead = /^(初|六|九|上|用)/;
  const tuanIdx = lines.findIndex((l) => norm(l).startsWith('彖曰'));
  const xiangIdx = lines.findIndex((l) => norm(l).startsWith('象曰'));
  const wenyanIdx = lines.findIndex((l) => norm(l).startsWith('文言曰'));

  const tuan = takeBlock(tuanIdx, (l) => l.startsWith('象曰') || l.startsWith('文言曰') || isYaoHead.test(l));
  const xiang = takeBlock(xiangIdx, (l) => l.startsWith('文言曰') || l.startsWith('彖曰') || isYaoHead.test(l));
  const wenyan = takeBlock(wenyanIdx, (l) => false);

  return {
    judgment: converter(judgment),
    lines: yao.map((l) => converter(l)),
    tuan,
    xiang,
    wenyan,
  };
}

async function loadWilhelm() {
  const src = await fetchText('https://raw.githubusercontent.com/theblacksquid/iching-wilhelm-dataset/master/data/iching_wilhelm_translation.js');
  const jsonText = src.replace(/^export default\s+/, '').trim().replace(/;$/, '');
  const data = JSON.parse(jsonText);
  return data;
}

function binaryToString(v) {
  if (typeof v === 'string') return v.padStart(6, '0');
  if (typeof v === 'number') return String(v).padStart(6, '0');
  return '';
}

async function main() {
  const wilhelm = await loadWilhelm();

  const zh = [];
  const en = [];
  const extrasZh = [];
  const extrasEn = [];

  for (let i = 0; i < 64; i++) {
    const id = i + 1;
    const title = pageTitles[i];
    const displayName = kingWenNames[i];
    const w = wilhelm[String(id)];
    const binary = binaryToString(w?.binary);
    if (!binary || binary.length !== 6) throw new Error(`missing_binary_${id}`);

    const raw = await fetchText(`https://zh.wikisource.org/w/index.php?title=${encodeURIComponent(`周易/${title}`)}&action=raw`);
    let parsed;
    try {
      parsed = parseWikisourceRaw(raw);
    } catch (e) {
      console.error('parse_failed', id, title, e?.message ?? String(e));
      throw new Error(`parse_failed_${id}_${title}:${e?.message ?? String(e)}`);
    }

    zh.push({
      id,
      name: displayName,
      binary,
      judgment: parsed.judgment,
      lines: parsed.lines,
    });
    extrasZh.push({
      id,
      name: displayName,
      binary,
      tuan: parsed.tuan,
      xiang: parsed.xiang,
      wenyan: parsed.wenyan,
    });

    const linesEn = [];
    for (let n = 1; n <= 6; n++) {
      const text = w?.wilhelm_lines?.[String(n)]?.text ?? '';
      linesEn.push(String(text));
    }

    en.push({
      id,
      name: displayName,
      binary,
      judgment: String(w?.wilhelm_judgment?.text ?? ''),
      lines: linesEn,
    });
    extrasEn.push({
      id,
      name: displayName,
      binary,
      tuan: String(w?.wilhelm_commentary?.text ?? ''),
      xiang: String(w?.wilhelm_image?.text ?? ''),
      wenyan: ''
    });
  }

  const outDir = path.resolve(process.cwd(), 'api/src');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'iching64.zh.json'), JSON.stringify(zh, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(outDir, 'iching64.en.json'), JSON.stringify(en, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(outDir, 'iching64.zh.extras.json'), JSON.stringify(extrasZh, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(outDir, 'iching64.en.extras.json'), JSON.stringify(extrasEn, null, 2) + '\n', 'utf8');

  console.log('generated:', path.join(outDir, 'iching64.zh.json'), path.join(outDir, 'iching64.en.json'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
