export const generateHexagram = () => {
  const lines = [];
  for (let i = 0; i < 6; i++) {
    // 0 for Yin (broken line), 1 for Yang (solid line)
    lines.push(Math.random() > 0.5 ? 1 : 0);
  }
  
  // Calculate hexagram number (1-64 based on binary, simplified mapping)
  const binaryString = lines.join('');
  const number = parseInt(binaryString, 2) + 1; // 1 to 64
  
  const names = [
    "乾为天", "坤为地", "水雷屯", "山水蒙", "水天需", "天水讼", "地水师", "水地比", 
    "风天小畜", "天泽履", "地天泰", "天地否", "天火同人", "火天大有", "地山谦", "雷地豫",
    // ... skipping full 64 for brevity, using generic fallback
  ];

  return {
    lines,
    number,
    name: names[number - 1] || `第 ${number} 卦`,
    binary: binaryString
  };
};

export const getMockAiAnalysis = (dimension: string, hexagram: any, lang: string, userProfile?: any) => {
  const prefix = lang === 'zh' ? '基于易经' : 'Based on the I Ching hexagram';
  const dimText = lang === 'zh' ? 
    (dimension === 'love' ? '感情' : dimension === 'wealth' ? '财运' : dimension === 'health' ? '健康' : '事业') :
    dimension;

  let userInfo = '';
  if (userProfile && userProfile.name) {
    const location = userProfile.currentResidence || userProfile.current_residence || '';
    const relationship = userProfile.relationshipStatus || userProfile.relationship_status || '';
    userInfo = lang === 'zh' ? 
      `\n\n结合您的个人信息（姓名：${userProfile.name}，情感状态：${relationship || '未知'}，所在地：${location || '未知'}）：` :
      `\n\nConsidering your profile (Name: ${userProfile.name}, Relationship: ${relationship || 'Unknown'}, Location: ${location || 'Unknown'}):`;
  }

  return `${prefix}【${hexagram.name}】，针对您的${dimText}测算如下：${userInfo}\n\n此卦象显示阴阳交替，变动之中蕴含生机。在当前阶段，建议您保持平和心态，顺势而为。切忌急躁冒进，宜静待时机。\n\n具体建议：\n1. 保持现状，稳中求进\n2. 多听取长辈或专业人士的意见\n3. 注意把握即将到来的转机`;
};
