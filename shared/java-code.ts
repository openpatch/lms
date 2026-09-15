// How Java prints a value, and the two integer operators that surprise everyone.
//
// The EF starts with `7 / 3` and the answer `2`, so a generator that builds a
// question has to compute exactly what the machine would — and print it the way
// the machine would, because `9` and `9.0` are different outputs and the game
// asks about the difference.

/** Integer division: the quotient truncated towards zero, as Java's `/` does. */
export function intDiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** Remainder of the integer division, as Java's `%` does. Keeps the sign of `a`. */
export function intMod(a: number, b: number): number {
  return a - intDiv(a, b) * b;
}

/** How Java prints an `int`. */
export function javaInt(value: number): string {
  return String(Math.trunc(value));
}

/**
 * How Java prints a `double`: always with a decimal point, so a whole value
 * comes out as `9.0`. Generators stay away from quotients that do not
 * terminate — nobody is meant to type `2.3333333333333335` — so rounding to
 * ten places only removes the binary noise of a value like `0.1 + 0.2`.
 */
export function javaDouble(value: number): string {
  const rounded = Math.round(value * 1e10) / 1e10;
  return Number.isInteger(rounded) ? `${rounded}.0` : String(rounded);
}

/** How Java prints a `boolean`. */
export function javaBoolean(value: boolean): string {
  return value ? "true" : "false";
}

/** Divisors that turn an `int` into a `double` a student can write down. */
export const EXACT_DIVISORS = [2, 4, 5, 8, 10, 20, 25] as const;
