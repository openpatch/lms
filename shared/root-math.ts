// Square-root helpers for the "Quadratwurzeln und reelle Zahlen" game (UV 9.1).
// Used by the client (to render terms) and by the server (to build and grade them).

/** A root in the form `factor · √radicand`, e.g. 6√2. `radicand` is always ≥ 1. */
export interface RootTerm {
  factor: number;
  radicand: number;
}

/** The largest square dividing n, e.g. 72 = 36 · 2. */
function largestSquareFactor(n: number): number {
  let best = 1;
  for (let root = 2; root * root <= n; root++) {
    const square = root * root;
    if (n % square === 0) best = square;
  }
  return best;
}

/** Pulls every square out of the radicand: 72 → 6√2, 25 → 5, 7 → √7. */
export function simplifyRoot(radicand: number, factor = 1): RootTerm {
  if (!Number.isInteger(radicand) || radicand < 0) return { factor: 0, radicand: 1 };
  if (radicand === 0) return { factor: 0, radicand: 1 };
  const square = largestSquareFactor(radicand);
  return { factor: factor * Math.sqrt(square), radicand: radicand / square };
}

export function rootValue(term: RootTerm): number {
  return term.factor * Math.sqrt(term.radicand);
}

/** True when both terms are the same number, however they are written
 *  (2√8 and 4√2 are equal, 4√2 and 4√3 are not). */
export function rootEquals(a: RootTerm, b: RootTerm): boolean {
  const left = simplifyRoot(a.radicand, a.factor);
  const right = simplifyRoot(b.radicand, b.factor);
  return left.factor === right.factor && left.radicand === right.radicand;
}

/** True when the term is already written as simply as possible. */
export function isSimplified(term: RootTerm): boolean {
  return largestSquareFactor(term.radicand) === 1;
}

export function rootLatex(term: RootTerm): string {
  if (term.radicand === 1) return String(term.factor);
  if (term.factor === 1) return `\\sqrt{${term.radicand}}`;
  if (term.factor === -1) return `-\\sqrt{${term.radicand}}`;
  return `${term.factor}\\sqrt{${term.radicand}}`;
}

/** Reads the two fields of the answer input ("6" and "2" → 6√2).
 *  An empty radicand means a whole number. Returns null for junk. */
export function parseRootAnswer(factor: string, radicand: string): RootTerm | null {
  const f = Number(factor.trim().replace(",", "."));
  const r = radicand.trim() === "" ? 1 : Number(radicand.trim());
  if (!isFinite(f) || !Number.isInteger(r) || r < 1) return null;
  return { factor: f, radicand: r };
}

/** The answer format the client submits: "factor;radicand". */
export function encodeRootAnswer(term: RootTerm): string {
  return `${term.factor};${term.radicand}`;
}

export function decodeRootAnswer(answer: string): RootTerm | null {
  const [factor = "", radicand = ""] = answer.split(";");
  return parseRootAnswer(factor, radicand);
}
