// Score names for a finished hole.
const NAMES = { '-4': 'Condor!', '-3': 'Albatross!', '-2': 'Eagle!', '-1': 'Birdie!', '0': 'Par', '1': 'Bogey', '2': 'Double bogey', '3': 'Triple bogey' };

// strokes taken on a hole of this par → "Birdie!", "Par", "+4" …
export function resultName(strokes, par) {
  if (strokes === 1) return 'Hole in one!';
  const diff = strokes - par;
  return NAMES[diff] || (diff > 0 ? `+${diff}` : `${diff}`);
}

// "You finished in 4 strokes on a par 3 (1 over par)."
export function resultText(strokes, par) {
  const diff = strokes - par;
  return `You finished in ${strokes} stroke${strokes > 1 ? 's' : ''} on a par ${par}` +
    (diff < 0 ? ` (${-diff} under par).` : diff === 0 ? '.' : ` (${diff} over par).`);
}
