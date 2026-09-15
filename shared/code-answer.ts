// Reading what a student typed as the output of a program.
//
// The stages of the programming games ask "what does this print?", so the
// answer is a value, not a term: the grading is about the value the program
// produces, not about how it is spelled. These helpers make the obvious
// spellings equal — a comma for the decimal point, `7` for `7.0`, `wahr` for
// `true` — and leave everything else to be simply wrong. Nothing in here knows
// which language the listing was written in.

/** Whitespace collapsed, quotes and a trailing period dropped. */
export function normalizeText(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^["'](.*)["']$/, "$1")
    .trim();
}

/** The number a student wrote, with `,` accepted as the decimal point. */
export function parseNumber(raw: string): number | null {
  const text = normalizeText(raw).replace(",", ".").replace(/\s/g, "");
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

const TRUE_WORDS = ["true", "wahr", "ja"];
const FALSE_WORDS = ["false", "falsch", "nein"];

/** `true`/`false` in either language, or null when it is neither. */
export function parseBoolean(raw: string): boolean | null {
  const text = normalizeText(raw).toLowerCase();
  if (TRUE_WORDS.includes(text)) return true;
  if (FALSE_WORDS.includes(text)) return false;
  return null;
}

/**
 * Does `given` say the same thing as `expected`?
 *
 * Numbers are compared as numbers, so `7`, `7.0` and `7,0` are one answer and
 * the float/int distinction never costs a point it was not asked about.
 * Everything else is compared as text, ignoring case and spacing.
 */
export function answerMatches(expected: string, given: string): boolean {
  const wanted = parseNumber(expected);
  if (wanted != null) {
    const got = parseNumber(given);
    return got != null && Math.abs(got - wanted) < 1e-9;
  }
  const wantedBool = parseBoolean(expected);
  if (wantedBool != null) {
    const got = parseBoolean(given);
    return got != null && got === wantedBool;
  }
  return normalizeText(expected).toLowerCase() === normalizeText(given).toLowerCase();
}

/**
 * A program that prints several lines is answered as a list of values. The
 * player may separate them however they like — spaces, commas or new lines —
 * because the exercise is the sequence, not the punctuation.
 */
export function splitSequence(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function sequenceMatches(expected: string[], given: string): boolean {
  const parts = splitSequence(given);
  if (parts.length !== expected.length) return false;
  return expected.every((value, index) => answerMatches(value, parts[index]));
}

/** How many of the expected values are in the right place — for partial credit. */
export function sequenceScore(expected: string[], given: string): number {
  const parts = splitSequence(given);
  let hits = 0;
  for (let i = 0; i < expected.length; i++) {
    if (parts[i] != null && answerMatches(expected[i], parts[i])) hits++;
  }
  return expected.length === 0 ? 0 : hits / expected.length;
}
