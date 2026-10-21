export type CoinLineValue = 6 | 7 | 8 | 9;

function assertCoinLineValues(values: number[]): asserts values is CoinLineValue[] {
  if (values.length !== 6) throw new Error('coins must have 6 lines');
  for (const v of values) {
    if (v !== 6 && v !== 7 && v !== 8 && v !== 9) throw new Error('invalid coin line value');
  }
}

function yinYangFromCoin(v: CoinLineValue) {
  return v === 6 || v === 8 ? 0 : 1;
}

export function computeHexagramsFromCoins(values: number[]) {
  assertCoinLineValues(values);

  const changingLines: number[] = [];
  const primaryLinesBottomToTop = values.map((v, idx) => {
    if (v === 6 || v === 9) changingLines.push(idx + 1);
    return yinYangFromCoin(v);
  });

  const primaryBinary = primaryLinesBottomToTop.slice().reverse().join('');

  const relatingLinesBottomToTop = primaryLinesBottomToTop.slice();
  for (const line of changingLines) {
    const i = line - 1;
    relatingLinesBottomToTop[i] = relatingLinesBottomToTop[i] === 1 ? 0 : 1;
  }
  const relateBinary = relatingLinesBottomToTop.slice().reverse().join('');

  return { primaryBinary, relateBinary, changingLines };
}
