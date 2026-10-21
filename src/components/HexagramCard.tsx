import React from 'react';
import { motion } from 'framer-motion';

type Basis = { judgment?: string; lines?: string[] } | null;

type Props = {
  title: string;
  primaryBinary?: string;
  relatingTitle?: string;
  relatingBinary?: string;
  changingLines?: number[];
  basis?: Basis;
  showRelating?: boolean;
  showChanging?: boolean;
  showBasis?: boolean;
  layoutId?: string;
};

export function HexagramCard({
  title,
  primaryBinary,
  relatingTitle,
  relatingBinary,
  changingLines,
  basis,
  showRelating = true,
  showChanging = true,
  showBasis = true,
  layoutId,
}: Props) {
  const bin = String(primaryBinary ?? '').trim();
  const bits = bin.length === 6 ? bin.split('') : [];
  const primaryLinesBottomToTop = bits.length ? [...bits].reverse().map((c) => (c === '1' ? 1 : 0)) : [];
  const changing = new Set<number>(Array.isArray(changingLines) ? changingLines : []);

  const HexLine = ({
    isYang,
    isChanging,
    shown,
    animateIn,
  }: {
    isYang: boolean;
    isChanging: boolean;
    shown: boolean;
    animateIn: boolean;
  }) => {
    return (
      <div className={`w-full h-2 ${isChanging ? 'drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]' : ''}`}>
        {!shown ? (
          <div className="w-full h-full rounded bg-white/10" />
        ) : isYang ? (
          <motion.div
            initial={animateIn ? { scaleX: 0 } : false}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full h-full rounded bg-dark-gold origin-center"
          />
        ) : (
          <div className="w-full h-full flex justify-between">
            <motion.div
              initial={animateIn ? { x: -10, scaleX: 0 } : false}
              animate={{ x: 0, scaleX: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-[45%] h-full rounded bg-dark-gold origin-left"
            />
            <motion.div
              initial={animateIn ? { x: 10, scaleX: 0 } : false}
              animate={{ x: 0, scaleX: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-[45%] h-full rounded bg-dark-gold origin-right"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card-container flex flex-col items-center gap-4">
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-serif text-dark-gold">{title}</h3>
        {showRelating && relatingBinary && relatingBinary !== primaryBinary && (
          <div className="text-sm text-gray-400">Relating: {String(relatingTitle ?? '').trim()}</div>
        )}
        {showChanging && (
          <div className="text-xs text-gray-500">
            Changing: {(changingLines ?? []).length ? (changingLines ?? []).join(',') : 'none'}
          </div>
        )}
      </div>

      <motion.div layoutId={layoutId} className="w-[200px] flex flex-col-reverse gap-2">
        {(() => {
          const lines = (primaryLinesBottomToTop ?? []) as number[];
          return [...Array(6)].map((_, idx) => {
            const lineNo = idx + 1;
            const v = Number(lines[idx] ?? 0);
            const isYang = v === 1;
            const isChanging = changing.has(lineNo);
            return (
              <div key={lineNo} className="w-full h-3 flex items-center justify-center">
                <HexLine isYang={isYang} isChanging={isChanging} shown={true} animateIn={false} />
              </div>
            );
          });
        })()}
      </motion.div>

      {showBasis && basis && (basis.judgment || (basis.lines ?? []).length > 0) && (
        <details className="w-full border-t border-white/10 pt-4">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-dark-gold transition-colors text-center">
            Basis (Judgment / Lines)
          </summary>
          <div className="mt-3 space-y-2 text-sm text-gray-300 whitespace-pre-wrap">
            {basis.judgment && <div>Judgment: {basis.judgment}</div>}
            {(basis.lines ?? []).length > 0 && <div>Lines: {(basis.lines ?? []).join(' ')}</div>}
          </div>
        </details>
      )}
    </div>
  );
}

