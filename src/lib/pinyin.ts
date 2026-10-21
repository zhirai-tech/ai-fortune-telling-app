const PINYIN_BY_CHAR: Record<string, string> = {
  之: 'zhi',
  乾: 'qian',
  为: 'wei',
  天: 'tian',
  坤: 'kun',
  地: 'di',
  水: 'shui',
  雷: 'lei',
  屯: 'tun',
  山: 'shan',
  蒙: 'meng',
  需: 'xu',
  讼: 'song',
  师: 'shi',
  比: 'bi',
  风: 'feng',
  小: 'xiao',
  畜: 'chu',
  泽: 'ze',
  履: 'lv',
  泰: 'tai',
  否: 'pi',
  火: 'huo',
  同: 'tong',
  人: 'ren',
  仁: 'ren',
  大: 'da',
  有: 'you',
  谦: 'qian',
  豫: 'yu',
  随: 'sui',
  蛊: 'gu',
  临: 'lin',
  观: 'guan',
  噬: 'shi',
  嗑: 'ke',
  贲: 'bi',
  剥: 'bo',
  复: 'fu',
  无: 'wu',
  妄: 'wang',
  颐: 'yi',
  过: 'guo',
  坎: 'kan',
  离: 'li',
  咸: 'xian',
  恒: 'heng',
  遯: 'dun',
  壮: 'zhuang',
  晋: 'jin',
  明: 'ming',
  夷: 'yi',
  家: 'jia',
  睽: 'kui',
  蹇: 'jian',
  解: 'jie',
  损: 'sun',
  益: 'yi',
  夬: 'guai',
  姤: 'gou',
  萃: 'cui',
  升: 'sheng',
  困: 'kun',
  井: 'jing',
  革: 'ge',
  鼎: 'ding',
  震: 'zhen',
  艮: 'gen',
  渐: 'jian',
  归: 'gui',
  妹: 'mei',
  丰: 'feng',
  旅: 'lv',
  巽: 'xun',
  兑: 'dui',
  涣: 'huan',
  节: 'jie',
  中: 'zhong',
  孚: 'fu',
  既: 'ji',
  济: 'ji',
  未: 'wei',
  卦: 'gua',
  爻: 'yao',
};

export function toPinyinOrNull(input: string) {
  const s = String(input ?? '').trim();
  if (!s) return null;
  const parts: string[] = [];
  for (const ch of s) {
    const p = PINYIN_BY_CHAR[ch];
    if (!p) return null;
    parts.push(p);
  }
  return parts.join(' ');
}

export function toTitleCaseWords(input: string) {
  return String(input ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(' ');
}

export function replaceChinesePhrasesWithPinyin(input: string) {
  const s = String(input ?? '');
  return s.replace(/[\u4e00-\u9fff]{2,12}/g, (m) => {
    const py = toPinyinOrNull(m);
    return py ? toTitleCaseWords(py) : m;
  });
}
