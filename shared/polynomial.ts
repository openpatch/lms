// Polynomials for the Q1 games (extreme value problems today, Steckbriefaufgaben
// and antiderivatives later). A polynomial is its coefficients, lowest power
// first: [1, -4, 3] is 3x² - 4x + 1.

export type Polynomial = number[];

/** Drops leading zero coefficients so that equal polynomials look equal. */
export function normalize(p: Polynomial): Polynomial {
  const copy = [...p];
  while (copy.length > 1 && Math.abs(copy[copy.length - 1]) < 1e-9) copy.pop();
  return copy;
}

export function degree(p: Polynomial): number {
  return normalize(p).length - 1;
}

export function evaluate(p: Polynomial, x: number): number {
  // Horner, so that x^4 stays accurate
  let value = 0;
  for (let i = p.length - 1; i >= 0; i--) value = value * x + p[i];
  return value;
}

export function derive(p: Polynomial): Polynomial {
  if (p.length <= 1) return [0];
  return normalize(p.slice(1).map((coefficient, index) => coefficient * (index + 1)));
}

/** An antiderivative with constant term 0. */
export function integrate(p: Polynomial): Polynomial {
  return normalize([0, ...p.map((coefficient, index) => coefficient / (index + 1))]);
}

function coefficientLatex(value: number, power: number): string {
  const abs = Math.abs(value);
  const rounded = Math.round(abs * 1e6) / 1e6;
  if (power === 0) return String(rounded);
  if (Math.abs(abs - 1) < 1e-9) return "";
  return String(rounded);
}

export function toLatex(p: Polynomial, variable = "x"): string {
  const poly = normalize(p);
  const parts: string[] = [];

  for (let power = poly.length - 1; power >= 0; power--) {
    const value = poly[power];
    if (Math.abs(value) < 1e-9) continue;
    const sign = value < 0 ? "-" : parts.length === 0 ? "" : "+";
    const coefficient = coefficientLatex(value, power);
    const body = power === 0 ? "" : power === 1 ? variable : `${variable}^{${power}}`;
    parts.push(`${sign}${coefficient}${body}`);
  }

  return parts.length === 0 ? "0" : parts.join(" ").replace(/^- /, "-");
}

/** Reads what a student types: "3x^2-4x+1", "-x²+2x", "0.5x^3 + x".
 *  Returns null when the input is not a polynomial in x. */
export function parsePolynomial(input: string): Polynomial | null {
  const cleaned = input
    .toLowerCase()
    .replace(/\s|\*|·|\\cdot/g, "")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/,/g, ".");
  if (cleaned === "") return null;

  const terms = cleaned.match(/[+-]?[^+-]+/g);
  // Every character has to belong to a term, so "3x^2+" is rejected
  if (!terms || terms.join("") !== cleaned) return null;

  const result: Polynomial = [0];
  for (const term of terms) {
    const match = /^([+-]?)(\d*\.?\d*)(x(?:\^(\d+))?)?$/.exec(term);
    if (!match) return null;
    const [, sign, digits, variable, exponent] = match;

    if (!variable && digits === "") return null;
    if (variable && digits !== "" && digits === ".") return null;

    const value = digits === "" ? 1 : Number(digits);
    if (!isFinite(value)) return null;
    const power = variable ? (exponent ? Number(exponent) : 1) : 0;
    if (!Number.isInteger(power) || power > 12) return null;

    while (result.length <= power) result.push(0);
    result[power] += (sign === "-" ? -1 : 1) * value;
  }

  return normalize(result);
}

export function polynomialEquals(a: Polynomial, b: Polynomial): boolean {
  const left = normalize(a);
  const right = normalize(b);
  if (left.length !== right.length) return false;
  return left.every((value, index) => Math.abs(value - right[index]) < 1e-6);
}

/** Where the polynomial takes its largest value on [min, max].
 *  A scan plus a refinement — good to about a thousandth of the interval. */
export function argMax(p: Polynomial, min: number, max: number): number {
  let best = min;
  let bestValue = evaluate(p, min);
  const coarse = 400;
  for (let i = 0; i <= coarse; i++) {
    const x = min + ((max - min) * i) / coarse;
    const value = evaluate(p, x);
    if (value > bestValue) {
      bestValue = value;
      best = x;
    }
  }

  // Refine around the best sample
  const window = (max - min) / coarse;
  for (let i = -20; i <= 20; i++) {
    const x = Math.min(max, Math.max(min, best + (window * i) / 20));
    const value = evaluate(p, x);
    if (value > bestValue) {
      bestValue = value;
      best = x;
    }
  }
  return best;
}
