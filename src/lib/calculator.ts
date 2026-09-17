/**
 * The arithmetic behind the Taschenrechner the code stations lend the class.
 *
 * Java and Python stations ask what a listing prints, and a listing may well
 * print `1273 // 17` or `12 * 12 + 7`. The station is asking whether the reader
 * can follow the program, not whether they can do long division under a clock,
 * so they get a calculator for the second half — see
 * `src/components/Calculator.tsx`.
 *
 * Parsed rather than `eval`ed: the string comes from a keypad today, but a
 * pasted one would be running in the player's tab, and there is nothing here
 * `eval` would buy.
 */

type Token =
  | { kind: "number"; value: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/" | "^" }
  | { kind: "open" }
  | { kind: "close" };

/** Signs a calculator shows against the ones this reads. */
const SYNONYMS: Record<string, string> = {
  "×": "*",
  "·": "*",
  "÷": "/",
  ":": "/",
  "−": "-",
  "–": "-",
  "**": "^",
};

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function tokenize(source: string): Token[] | null {
  const tokens: Token[] = [];
  let at = 0;

  while (at < source.length) {
    const char = source[at];
    if (char === " ") {
      at++;
      continue;
    }

    if (isDigit(char) || char === "." || char === ",") {
      let end = at;
      while (end < source.length && (isDigit(source[end]) || source[end] === "." || source[end] === ",")) {
        end++;
      }
      const value = Number(source.slice(at, end).replace(",", "."));
      // "1.2.3" and a lone separator land here rather than becoming a number.
      if (!Number.isFinite(value)) return null;
      tokens.push({ kind: "number", value });
      at = end;
      continue;
    }

    if (char === "(") {
      tokens.push({ kind: "open" });
      at++;
      continue;
    }
    if (char === ")") {
      tokens.push({ kind: "close" });
      at++;
      continue;
    }

    const pair = source.slice(at, at + 2);
    const symbol = SYNONYMS[pair] ?? SYNONYMS[char] ?? char;
    if (symbol === "+" || symbol === "-" || symbol === "*" || symbol === "/" || symbol === "^") {
      tokens.push({ kind: "op", op: symbol });
      at += SYNONYMS[pair] ? 2 : 1;
      continue;
    }

    return null;
  }

  return tokens;
}

/**
 * Drops what a half-typed expression ends on, and closes the brackets it left
 * open. A calculator that shows nothing between `12 +` and `12 + 3` is a
 * calculator you cannot watch while you use it, so `12 +` is read as `12`.
 */
function tidy(tokens: Token[]): Token[] {
  const out = [...tokens];
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (last.kind === "op" || last.kind === "open") out.pop();
    else break;
  }
  let depth = 0;
  for (const token of out) {
    if (token.kind === "open") depth++;
    else if (token.kind === "close") depth--;
  }
  // A stray ")" is an error; missing ones are just brackets not closed yet.
  if (depth < 0) return out;
  for (let i = 0; i < depth; i++) out.push({ kind: "close" });
  return out;
}

/** Where the parser is, and whether it has given up. */
interface Cursor {
  tokens: Token[];
  at: number;
  failed: boolean;
}

function peek(cursor: Cursor): Token | undefined {
  return cursor.tokens[cursor.at];
}

/** `term (("+" | "-") term)*` */
function parseSum(cursor: Cursor): number {
  let value = parseProduct(cursor);
  for (;;) {
    const token = peek(cursor);
    if (!token || token.kind !== "op" || (token.op !== "+" && token.op !== "-")) return value;
    cursor.at++;
    const right = parseProduct(cursor);
    value = token.op === "+" ? value + right : value - right;
  }
}

/**
 * `unary (("*" | "/") unary)*`, and a bracket or a number straight after a
 * value multiplies: `3(4 + 5)` is what a hand writes and what a thumb taps.
 */
function parseProduct(cursor: Cursor): number {
  let value = parseUnary(cursor);
  for (;;) {
    const token = peek(cursor);
    if (!token) return value;
    if (token.kind === "op" && (token.op === "*" || token.op === "/")) {
      cursor.at++;
      const right = parseUnary(cursor);
      if (token.op === "*") {
        value *= right;
      } else {
        if (right === 0) cursor.failed = true;
        value /= right;
      }
      continue;
    }
    if (token.kind === "open" || token.kind === "number") {
      value *= parseUnary(cursor);
      continue;
    }
    return value;
  }
}

/** `("+" | "-")* power` — the sign binds after the power, so -3^2 is -9. */
function parseUnary(cursor: Cursor): number {
  const token = peek(cursor);
  if (token?.kind === "op" && (token.op === "+" || token.op === "-")) {
    cursor.at++;
    const value = parseUnary(cursor);
    return token.op === "-" ? -value : value;
  }
  return parsePower(cursor);
}

/** `primary ("^" unary)?` — right associative, so 2^3^2 is 2^9. */
function parsePower(cursor: Cursor): number {
  const base = parsePrimary(cursor);
  const token = peek(cursor);
  if (token?.kind === "op" && token.op === "^") {
    cursor.at++;
    return base ** parseUnary(cursor);
  }
  return base;
}

/** `number | "(" sum ")"` */
function parsePrimary(cursor: Cursor): number {
  const token = peek(cursor);
  if (!token) {
    cursor.failed = true;
    return 0;
  }
  if (token.kind === "number") {
    cursor.at++;
    return token.value;
  }
  if (token.kind === "open") {
    cursor.at++;
    const value = parseSum(cursor);
    if (peek(cursor)?.kind === "close") cursor.at++;
    else cursor.failed = true;
    return value;
  }
  cursor.failed = true;
  return 0;
}

/**
 * What the expression comes to, or null while there is nothing to show — an
 * empty field, something that does not parse, a division by zero, a power
 * that ran off the end of the doubles.
 */
export function calculate(expression: string): number | null {
  const tokens = tokenize(expression);
  if (!tokens) return null;
  const tidied = tidy(tokens);
  if (tidied.length === 0) return null;

  const cursor: Cursor = { tokens: tidied, at: 0, failed: false };
  const value = parseSum(cursor);
  if (cursor.failed || cursor.at !== tidied.length) return null;
  return Number.isFinite(value) ? value : null;
}

/**
 * The result as a calculator writes it. Twelve significant digits is far more
 * than any listing asks for and is what rubs the binary dust off the end of a
 * decimal one: 0.1 + 0.2 reads as 0.3 rather than as the double it is.
 */
export function formatResult(value: number): string {
  return String(Number(value.toPrecision(12)));
}
