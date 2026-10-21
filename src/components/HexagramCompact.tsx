import React from 'react';

type Props = {
  binary: string;
  changingLines?: number[];
  size?: 'xs' | 'sm' | 'md';
  tone?: 'gold' | 'black';
};

export function HexagramCompact({ binary, changingLines, size = 'sm', tone = 'gold' }: Props) {
  const b = String(binary ?? '').trim();
  const bits = b.length === 6 ? b.split('') : [];
  const bottomToTop = bits.length ? [...bits].reverse().map((c) => c === '1') : new Array(6).fill(false);
  const changing = new Set<number>(Array.isArray(changingLines) ? changingLines : []);

  const w = size === 'md' ? 'w-20' : size === 'sm' ? 'w-16' : 'w-14';
  const h = size === 'md' ? 'h-2' : size === 'sm' ? 'h-1.5' : 'h-1.5';
  const gapY = size === 'md' ? 'gap-1' : 'gap-0.5';
  const gapX = size === 'md' ? 'gap-2' : 'gap-1.5';
  const half = size === 'md' ? 'w-[46%]' : 'w-[45%]';
  const base = tone === 'black' ? 'bg-black/70' : 'bg-dark-gold';
  const glow = tone === 'black' ? '' : 'drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]';

  return (
    <div className={`${w} flex flex-col-reverse ${gapY}`}>
      {bottomToTop.map((isYang, idx) => {
        const lineNo = idx + 1;
        const isChanging = changing.has(lineNo);
        const lineCls = isChanging ? glow : '';
        return (
          <div key={lineNo} className={`w-full ${h} ${lineCls}`}>
            {isYang ? (
              <div className={`w-full h-full rounded ${base}`} />
            ) : (
              <div className={`w-full h-full flex justify-between ${gapX}`}>
                <div className={`${half} h-full rounded ${base}`} />
                <div className={`${half} h-full rounded ${base}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

