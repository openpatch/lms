// Shared rational-number helpers for the "rational numbers" game.
// Used by both the client (to render values) and the server (to generate and grade questions).

/** A rational number in the form n/d. The sign is carried by `n`, `d` is always > 0. */
export interface Fraction {
  n: number;
  d: number;
}

/** How a rational value is presented to the player. */
export type RationalDisplay = "fraction" | "decimal" | "mixed";

/** A rational value together with the LaTeX the player sees. */
export interface RationalValue extends Fraction {
  latex: string;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** Normalizes a fraction: reduced to lowest terms with a positive denominator. */
export function reduce(f: Fraction): Fraction {
  if (f.d === 0) return { n: 0, d: 1 };
  const sign = f.d < 0 ? -1 : 1;
  const g = gcd(f.n, f.d);
  return { n: (sign * f.n) / g, d: (sign * f.d) / g };
}

export function add(a: Fraction, b: Fraction): Fraction {
  return reduce({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
}

export function subtract(a: Fraction, b: Fraction): Fraction {
  return reduce({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
}

export function multiply(a: Fraction, b: Fraction): Fraction {
  return reduce({ n: a.n * b.n, d: a.d * b.d });
}

export function divide(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0) return { n: 0, d: 1 };
  return reduce({ n: a.n * b.d, d: a.d * b.n });
}

export function toValue(f: Fraction): number {
  return f.n / f.d;
}

/** True when a/b are the same rational number, even if written differently (2/4 vs 1/2). */
export function equals(a: Fraction, b: Fraction): boolean {
  return a.n * b.d === b.n * a.d;
}

/** True when the fraction has a terminating decimal expansion. */
export function isTerminating(f: Fraction): boolean {
  let d = reduce(f).d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}

/** Renders a terminating fraction as a decimal string, e.g. -1.25. */
export function toDecimalString(f: Fraction): string {
  const value = toValue(f);
  // At most 6 decimals is plenty for the denominators used in this game
  return String(Math.round(value * 1e6) / 1e6);
}

export function toLatex(f: Fraction, display: RationalDisplay = "fraction"): string {
  const r = reduce(f);
  if (r.d === 1) return String(r.n);

  if (display === "decimal" && isTerminating(r)) {
    return toDecimalString(r);
  }

  const sign = r.n < 0 ? "-" : "";
  const abs = Math.abs(r.n);

  if (display === "mixed" && abs > r.d) {
    const whole = Math.floor(abs / r.d);
    const rest = abs % r.d;
    return `${sign}${whole}\\tfrac{${rest}}{${r.d}}`;
  }

  return `${sign}\\tfrac{${abs}}{${r.d}}`;
}

/** Builds a display-ready value. Falls back to a fraction when a decimal would not terminate. */
export function makeValue(f: Fraction, display: RationalDisplay = "fraction"): RationalValue {
  const r = reduce(f);
  const style = display === "decimal" && !isTerminating(r) ? "fraction" : display;
  return { n: r.n, d: r.d, latex: toLatex(r, style) };
}

/** Parses "n/d", "n" or a decimal ("0.75", "0,75") into a fraction.
 *  Returns null for junk input. */
export function parseFraction(input: string): Fraction | null {
  const [numeratorPart, denominatorPart = "1"] = input.trim().replace(",", ".").split("/");
  const n = Number(numeratorPart);
  const d = Number(denominatorPart);
  if (numeratorPart.trim() === "" || !isFinite(n) || !isFinite(d) || d === 0) return null;
  if (!Number.isInteger(n) || !Number.isInteger(d)) {
    // Decimal input such as "0.75"
    const scale = 1e6;
    return reduce({ n: Math.round((n / d) * scale), d: scale });
  }
  return reduce({ n, d });
}

/** The four operations used by the "calculate" stage. */
export type RationalOperator = "+" | "-" | "*" | "/";

export function applyOperator(a: Fraction, op: RationalOperator, b: Fraction): Fraction {
  switch (op) {
    case "+": return add(a, b);
    case "-": return subtract(a, b);
    case "*": return multiply(a, b);
    case "/": return divide(a, b);
  }
}

export function operatorLatex(op: RationalOperator): string {
  switch (op) {
    case "+": return "+";
    case "-": return "-";
    case "*": return "\\cdot";
    case "/": return ":";
  }
}
