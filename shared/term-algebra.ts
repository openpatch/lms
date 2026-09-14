// Terms with several variables — the shared core of the "Terme" game
// (EdM 8, Kapitel 2: zusammenfassen, ausmultiplizieren, ausklammern, binomische
// Formeln, Satz vom Nullprodukt).
//
// Two representations, and both are needed:
//
//   Term  — the canonical value of an expression: a sorted list of monomials.
//           Two terms are equivalent exactly when their canonical forms match.
//   Node  — the syntax tree of what a player typed. The *shape* is part of the
//           answer: "3(2x+5)" and "6x+15" are the same value but only one of
//           them is ausmultipliziert, and only the other one is ausgeklammert.

import type { Fraction } from "./rational-math";
import { add, divide, gcd, multiply, reduce } from "./rational-math";

// ---------------------------------------------------------------------------
// Monomials and terms
// ---------------------------------------------------------------------------

/** A coefficient times a product of variable powers, e.g. -2a²b. */
export interface Monomial {
  c: Fraction;
  /** Variable name -> exponent; only exponents > 0 are stored. */
  v: Record<string, number>;
}

/** A sum of monomials in canonical order. An empty list is the term 0. */
export type Term = Monomial[];

const ONE: Fraction = { n: 1, d: 1 };

function fraction(value: number | Fraction): Fraction {
  return typeof value === "number" ? reduce({ n: value, d: 1 }) : reduce(value);
}

/** Identifies the variable part, so that 2ab and 3ba are recognised as alike. */
function signature(vars: Record<string, number>): string {
  return Object.keys(vars)
    .sort()
    .map((name) => `${name}^${vars[name]}`)
    .join("");
}

export function totalDegree(m: Monomial): number {
  return Object.values(m.v).reduce((sum, power) => sum + power, 0);
}

/**
 * Merges like monomials, drops zeros and sorts the way a textbook writes a term:
 * highest degree first, and within one degree by the exponent of the first
 * variable — a^2 + 2ab + b^2, not 2ab + a^2 + b^2 (graded lexicographic order).
 */
export function normalizeTerm(term: Term): Term {
  const byKey = new Map<string, Monomial>();
  for (const m of term) {
    const key = signature(m.v);
    const found = byKey.get(key);
    if (found) found.c = add(found.c, m.c);
    else byKey.set(key, { c: reduce(m.c), v: { ...m.v } });
  }

  const monomials = [...byKey.values()].filter((m) => m.c.n !== 0);
  const names = [...new Set(monomials.flatMap((m) => Object.keys(m.v)))].sort();

  return monomials.sort((a, b) => {
    const byDegree = totalDegree(b) - totalDegree(a);
    if (byDegree !== 0) return byDegree;
    for (const name of names) {
      const difference = (b.v[name] ?? 0) - (a.v[name] ?? 0);
      if (difference !== 0) return difference;
    }
    return 0;
  });
}

export function constantTerm(value: number | Fraction): Term {
  const c = fraction(value);
  return c.n === 0 ? [] : [{ c, v: {} }];
}

export function variableTerm(name: string, power = 1, coefficient: number | Fraction = 1): Term {
  const c = fraction(coefficient);
  if (c.n === 0) return [];
  return [{ c, v: power > 0 ? { [name]: power } : {} }];
}

export function addTerms(a: Term, b: Term): Term {
  return normalizeTerm([...a, ...b]);
}

export function subtractTerms(a: Term, b: Term): Term {
  return normalizeTerm([...a, ...scaleTerm(b, -1)]);
}

export function scaleTerm(term: Term, factor: number | Fraction): Term {
  const f = fraction(factor);
  return normalizeTerm(term.map((m) => ({ c: multiply(m.c, f), v: m.v })));
}

function multiplyMonomials(a: Monomial, b: Monomial): Monomial {
  const v: Record<string, number> = { ...a.v };
  for (const [name, power] of Object.entries(b.v)) v[name] = (v[name] ?? 0) + power;
  return { c: multiply(a.c, b.c), v };
}

export function multiplyTerms(a: Term, b: Term): Term {
  const product: Term = [];
  for (const left of a) for (const right of b) product.push(multiplyMonomials(left, right));
  return normalizeTerm(product);
}

export function powerTerm(term: Term, exponent: number): Term {
  let result = constantTerm(1);
  for (let i = 0; i < exponent; i++) result = multiplyTerms(result, term);
  return result;
}

export function productOfTerms(terms: Term[]): Term {
  return terms.reduce((acc, term) => multiplyTerms(acc, term), constantTerm(1));
}

export function isZeroTerm(term: Term): boolean {
  return normalizeTerm(term).length === 0;
}

export function termsEqual(a: Term, b: Term): boolean {
  const left = normalizeTerm(a);
  const right = normalizeTerm(b);
  if (left.length !== right.length) return false;
  return left.every((m, i) => {
    const other = right[i];
    return (
      signature(m.v) === signature(other.v) && m.c.n * other.c.d === other.c.n * m.c.d
    );
  });
}

/** True for a term that is a single monomial — a number, 3x, -2a²b. */
export function isMonomialTerm(term: Term): boolean {
  return normalizeTerm(term).length === 1;
}

export function isConstantTerm(term: Term): boolean {
  const normalized = normalizeTerm(term);
  return normalized.length === 0 || (normalized.length === 1 && totalDegree(normalized[0]) === 0);
}

/** The largest monomial that divides every summand, with a positive coefficient.
 *  That is what "vollständig ausklammern" means. */
export function monomialGcd(term: Term): Monomial {
  const normalized = normalizeTerm(term);
  if (normalized.length === 0) return { c: ONE, v: {} };

  let n = Math.abs(normalized[0].c.n);
  let d = normalized[0].c.d;
  let vars: Record<string, number> = { ...normalized[0].v };

  for (const m of normalized.slice(1)) {
    n = gcd(n, Math.abs(m.c.n));
    // gcd of fractions: gcd of numerators over lcm of denominators
    d = (d * m.c.d) / gcd(d, m.c.d);
    const next: Record<string, number> = {};
    for (const [name, power] of Object.entries(vars)) {
      const other = m.v[name] ?? 0;
      if (other > 0) next[name] = Math.min(power, other);
    }
    vars = next;
  }

  return { c: reduce({ n, d }), v: vars };
}

/** Same coefficient up to sign and the same variable powers — so that
 *  -2a(3-4b) counts as the same extraction as 2a(-3+4b). */
export function sameMonomialUpToSign(a: Monomial, b: Monomial): boolean {
  const left = reduce(a.c);
  const right = reduce(b.c);
  return (
    Math.abs(left.n) * right.d === Math.abs(right.n) * left.d && signature(a.v) === signature(b.v)
  );
}

// ---------------------------------------------------------------------------
// LaTeX
// ---------------------------------------------------------------------------

function coefficientLatex(c: Fraction, hasVariables: boolean): string {
  const abs = reduce({ n: Math.abs(c.n), d: c.d });
  if (abs.d === 1) {
    if (hasVariables && abs.n === 1) return "";
    return String(abs.n);
  }
  return `\\tfrac{${abs.n}}{${abs.d}}`;
}

export function monomialLatex(m: Monomial): string {
  const names = Object.keys(m.v).sort();
  const body = names.map((name) => (m.v[name] === 1 ? name : `${name}^{${m.v[name]}}`)).join("");
  const sign = m.c.n < 0 ? "-" : "";
  return `${sign}${coefficientLatex(m.c, body !== "")}${body}`;
}

/** The term as a textbook writes it: "2a^{2} - 3ab + 5". */
export function termLatex(term: Term): string {
  const normalized = normalizeTerm(term);
  if (normalized.length === 0) return "0";
  return normalized
    .map((m, index) => {
      const body = monomialLatex(m);
      if (index === 0) return body;
      return m.c.n < 0 ? ` - ${body.slice(1)}` : ` + ${body}`;
    })
    .join("");
}

/** The monomials in the order they are given — the unsimplified term a task
 *  shows, where "3a + 4b - a" must not collapse to "2a + 4b". */
export function writtenTermLatex(monomials: Monomial[]): string {
  // A generated coefficient can come out as 0; "3x + 0" and "0x + 5" are not
  // terms anybody writes, so those summands are left out rather than shown.
  const written = monomials.filter((m) => m.c.n !== 0);
  if (written.length === 0) return "0";
  return written
    .map((m, index) => {
      const body = monomialLatex(m);
      if (index === 0) return body;
      return m.c.n < 0 ? ` - ${body.slice(1)}` : ` + ${body}`;
    })
    .join("");
}

/** The term in brackets when it is a sum, bare when it is a single monomial. */
export function bracketedLatex(term: Term): string {
  const normalized = normalizeTerm(term);
  const inner = termLatex(normalized);
  return normalized.length > 1 ? `\\left(${inner}\\right)` : inner;
}

// ---------------------------------------------------------------------------
// Parsing what a player types
// ---------------------------------------------------------------------------

export type Node =
  | { kind: "num"; value: Fraction; paren?: boolean }
  | { kind: "var"; name: string; paren?: boolean }
  | { kind: "neg"; arg: Node; paren?: boolean }
  | { kind: "add" | "sub" | "mul" | "div"; left: Node; right: Node; paren?: boolean }
  | { kind: "pow"; base: Node; exponent: number; paren?: boolean };

const MAX_EXPONENT = 8;

type Token = { type: "num"; value: string } | { type: "name"; value: string } | { type: "op"; value: string };

// --- LaTeX -----------------------------------------------------------------
// Answers arrive as LaTeX, because the players type them in a MathLive field.
// Only the handful of commands a term can contain is accepted; anything else
// makes the answer unreadable rather than silently dropping a piece of it.

const LATEX_OPERATORS: [RegExp, string][] = [
  [/\\(?:cdot|times|ast)(?![a-zA-Z])/g, "*"],
  [/\\div(?![a-zA-Z])/g, "/"],
  [/\\(?:left|right|displaystyle|textstyle|mathrm|mathit|operatorname|limits|quad|qquad)(?![a-zA-Z])/g, ""],
  [/\\[,;:!>\s]/g, ""],
  [/[~\s]/g, ""],
];

/** The contents of the group starting at `at`: "{2x+1}" or a single character. */
function readGroup(input: string, at: number): { body: string; end: number } | null {
  if (at >= input.length) return null;
  if (input[at] !== "{") return { body: input[at], end: at + 1 };

  let depth = 0;
  for (let i = at; i < input.length; i++) {
    if (input[i] === "{") depth++;
    else if (input[i] === "}" && --depth === 0) {
      return { body: input.slice(at + 1, i), end: i + 1 };
    }
  }
  return null;
}

/** Rewrites \frac{a}{b} as (a)/(b), innermost fractions included. */
function expandFractions(input: string): string | null {
  let out = input;
  for (let guard = 0; guard < 40; guard++) {
    const match = /\\[dt]?frac/.exec(out);
    if (!match) return out;
    const start = match.index;
    const numerator = readGroup(out, start + match[0].length);
    if (!numerator) return null;
    const denominator = readGroup(out, numerator.end);
    if (!denominator) return null;
    out = `${out.slice(0, start)}((${numerator.body})/(${denominator.body}))${out.slice(denominator.end)}`;
  }
  return null;
}

/** Turns the LaTeX a math field produces into the plain notation below. */
function fromLatex(input: string): string | null {
  if (!input.includes("\\")) return input;
  let out = input;
  for (const [pattern, replacement] of LATEX_OPERATORS) out = out.replace(pattern, replacement);
  const expanded = expandFractions(out);
  // An unknown command is left over — better to reject than to guess
  return expanded && !expanded.includes("\\") ? expanded : null;
}

/** Accepts what a German keyboard and a maths lesson produce: ·, ×, :, ², ³, comma. */
function tokenize(raw: string): Token[] | null {
  const latex = fromLatex(raw);
  if (latex == null) return null;
  const cleaned = latex
    .replace(/\s+/g, "")
    .replace(/[·×∙]/g, "*")
    .replace(/[:÷]/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/[[{]/g, "(")
    .replace(/[\]}]/g, ")")
    .replace(/,(\d)/g, ".$1");

  const tokens: Token[] = [];
  for (let i = 0; i < cleaned.length; ) {
    const char = cleaned[i];
    if (/[0-9.]/.test(char)) {
      const match = /^\d*\.?\d+|^\d+\.?/.exec(cleaned.slice(i));
      if (!match) return null;
      tokens.push({ type: "num", value: match[0] });
      i += match[0].length;
    } else if (/[a-zA-Z]/.test(char)) {
      tokens.push({ type: "name", value: char });
      i += 1;
    } else if ("+-*/^()".includes(char)) {
      tokens.push({ type: "op", value: char });
      i += 1;
    } else {
      return null;
    }
  }
  return tokens;
}

class Parser {
  private at = 0;
  private readonly tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.at];
  }

  private eat(value: string): boolean {
    const token = this.peek();
    if (token?.type === "op" && token.value === value) {
      this.at += 1;
      return true;
    }
    return false;
  }

  done(): boolean {
    return this.at >= this.tokens.length;
  }

  /** expr := unary (('+' | '-') unary)* */
  expression(): Node | null {
    let left = this.unary();
    if (!left) return null;
    for (;;) {
      if (this.eat("+")) {
        const right = this.unary();
        if (!right) return null;
        left = { kind: "add", left, right };
      } else if (this.eat("-")) {
        const right = this.unary();
        if (!right) return null;
        left = { kind: "sub", left, right };
      } else {
        return left;
      }
    }
  }

  /** unary := ('+' | '-')* product */
  private unary(): Node | null {
    if (this.eat("-")) {
      const arg = this.unary();
      return arg && { kind: "neg", arg };
    }
    if (this.eat("+")) return this.unary();
    return this.product();
  }

  /** product := power (('*' | '/') power | power)*  — juxtaposition multiplies */
  private product(): Node | null {
    let left = this.power();
    if (!left) return null;
    for (;;) {
      if (this.eat("*")) {
        const right = this.power();
        if (!right) return null;
        left = { kind: "mul", left, right };
      } else if (this.eat("/")) {
        const right = this.power();
        if (!right) return null;
        left = { kind: "div", left, right };
      } else if (this.startsAtom()) {
        const right = this.power();
        if (!right) return null;
        left = { kind: "mul", left, right };
      } else {
        return left;
      }
    }
  }

  private startsAtom(): boolean {
    const token = this.peek();
    if (!token) return false;
    return token.type !== "op" || token.value === "(";
  }

  /** power := atom ('^' integer)? */
  private power(): Node | null {
    const base = this.atom();
    if (!base) return null;
    if (!this.eat("^")) return base;

    const wrapped = this.eat("(");
    const token = this.peek();
    if (token?.type !== "num") return null;
    this.at += 1;
    if (wrapped && !this.eat(")")) return null;

    const exponent = Number(token.value);
    if (!Number.isInteger(exponent) || exponent < 0 || exponent > MAX_EXPONENT) return null;
    return { kind: "pow", base, exponent };
  }

  /** atom := number | variable | '(' expr ')' */
  private atom(): Node | null {
    const token = this.peek();
    if (!token) return null;

    if (token.type === "num") {
      this.at += 1;
      const value = Number(token.value);
      if (!isFinite(value)) return null;
      // Decimals become exact fractions, so 0.5x and x/2 compare equal
      const decimals = (token.value.split(".")[1] ?? "").length;
      const scale = 10 ** decimals;
      return { kind: "num", value: reduce({ n: Math.round(value * scale), d: scale }) };
    }

    if (token.type === "name") {
      this.at += 1;
      return { kind: "var", name: token.value };
    }

    if (this.eat("(")) {
      const inner = this.expression();
      if (!inner || !this.eat(")")) return null;
      return { ...inner, paren: true };
    }

    return null;
  }
}

/** The syntax tree of what a player typed, or null when it is not a term. */
export function parseNode(input: string): Node | null {
  const tokens = tokenize(input);
  if (!tokens || tokens.length === 0) return null;
  const parser = new Parser(tokens);
  const node = parser.expression();
  return node && parser.done() ? node : null;
}

/**
 * The value of an expression that may divide by a variable: num/den.
 * Terms alone cannot express "A/a", and rearranging a formula is exactly that.
 */
export interface RationalTerm {
  num: Term;
  den: Term;
}

export function rationalOf(term: Term): RationalTerm {
  return { num: normalizeTerm(term), den: constantTerm(1) };
}

/** Builds num/den, folding a constant denominator in so that a polynomial
 *  stays a polynomial. Null when the denominator is 0. */
function makeRational(num: Term, den: Term): RationalTerm | null {
  const bottom = normalizeTerm(den);
  if (bottom.length === 0) return null;
  const top = normalizeTerm(num);
  if (isConstantTerm(bottom)) {
    return { num: scaleTerm(top, divide(ONE, bottom[0].c)), den: constantTerm(1) };
  }
  return { num: top, den: bottom };
}

/** True when the two quotients are the same function — a·d = c·b. */
export function rationalEquals(a: RationalTerm, b: RationalTerm): boolean {
  return termsEqual(multiplyTerms(a.num, b.den), multiplyTerms(b.num, a.den));
}

/** The value of a syntax tree as a quotient. Null when it is not a term at all,
 *  or when something is divided by zero. */
export function evaluateRational(node: Node): RationalTerm | null {
  switch (node.kind) {
    case "num":
      return rationalOf(constantTerm(node.value));
    case "var":
      return rationalOf(variableTerm(node.name));
    case "neg": {
      const arg = evaluateRational(node.arg);
      return arg && { num: scaleTerm(arg.num, -1), den: arg.den };
    }
    case "add":
    case "sub":
    case "mul":
    case "div": {
      const left = evaluateRational(node.left);
      const right = evaluateRational(node.right);
      if (!left || !right) return null;
      const denominator = multiplyTerms(left.den, right.den);
      switch (node.kind) {
        case "add":
          return makeRational(
            addTerms(multiplyTerms(left.num, right.den), multiplyTerms(right.num, left.den)),
            denominator,
          );
        case "sub":
          return makeRational(
            subtractTerms(multiplyTerms(left.num, right.den), multiplyTerms(right.num, left.den)),
            denominator,
          );
        case "mul":
          return makeRational(multiplyTerms(left.num, right.num), denominator);
        case "div":
          return makeRational(
            multiplyTerms(left.num, right.den),
            multiplyTerms(left.den, right.num),
          );
      }
      return null;
    }
    case "pow": {
      const base = evaluateRational(node.base);
      if (!base) return null;
      return makeRational(
        powerTerm(base.num, node.exponent),
        powerTerm(base.den, node.exponent),
      );
    }
  }
}

/** The value of a syntax tree as a plain term. Null when a term is divided by
 *  something other than a number — the stages that call this only ask for
 *  polynomials; `parseRational` is for the ones that allow A/a. */
export function evaluateNode(node: Node): Term | null {
  const value = evaluateRational(node);
  if (!value || !isConstantTerm(value.den)) return null;
  return value.num;
}

/** Parses an expression that may divide by a variable, e.g. "2A/(a+c)". */
export function parseRational(input: string): RationalTerm | null {
  const node = parseNode(input);
  return node && evaluateRational(node);
}

/** Parses and evaluates in one go; null when the input is not a term. */
export function parseTerm(input: string): Term | null {
  const node = parseNode(input);
  return node && evaluateNode(node);
}

// ---------------------------------------------------------------------------
// Reading the shape of an answer
// ---------------------------------------------------------------------------

/** True when no sum hides inside a product, a power or a bracket. */
function isMonomialNode(node: Node): boolean {
  switch (node.kind) {
    case "num":
    case "var":
      return true;
    case "neg":
      return isMonomialNode(node.arg);
    case "mul":
    case "div":
      return isMonomialNode(node.left) && isMonomialNode(node.right);
    case "pow":
      return isMonomialNode(node.base);
    default:
      return false;
  }
}

/** The summands as they were written. A bracketed sum counts as one summand —
 *  "a - (b + c)" has two, and that is exactly why it is not ausmultipliziert. */
export function summands(node: Node): Node[] {
  if (!node.paren && (node.kind === "add" || node.kind === "sub")) {
    return [...summands(node.left), ...summands(node.right)];
  }
  return [node];
}

/** The factors as they were written; a power becomes its repeated base. */
export function factors(node: Node): Node[] {
  switch (node.kind) {
    case "mul":
      return [...factors(node.left), ...factors(node.right)];
    case "neg":
      return [{ kind: "num", value: { n: -1, d: 1 } }, ...factors(node.arg)];
    case "pow":
      if (node.exponent >= 1 && node.exponent <= MAX_EXPONENT) {
        return Array.from({ length: node.exponent }, () => node.base).flatMap(factors);
      }
      return [node];
    default:
      return [node];
  }
}

/** True when the answer is written out as a plain sum of monomials. */
export function isExpandedNode(node: Node): boolean {
  return summands(node).every(isMonomialNode);
}

/**
 * True when the answer is ausmultipliziert *and* zusammengefasst: written as a
 * sum of monomials with nothing left to collect, so "3x + 2x" is rejected while
 * "5x" is accepted.
 */
export function isSimplifiedNode(node: Node, value: Term): boolean {
  if (!isExpandedNode(node)) return false;
  const written = summands(node).length;
  const normalized = normalizeTerm(value);
  return normalized.length === 0 ? written <= 1 : written === normalized.length;
}

export interface FactoredAnswer {
  /** Every factor's value, in the order they were written. */
  parts: Term[];
  /** The product of all factors that are a single monomial — what was pulled out. */
  extracted: Monomial;
  /** The factors that are sums; the brackets that remain. */
  sums: Term[];
}

/** Splits an answer into its factors, or null when it is not a term at all. */
export function readFactored(input: string): FactoredAnswer | null {
  const node = parseNode(input);
  if (!node) return null;

  const parts: Term[] = [];
  for (const factor of factors(node)) {
    const value = evaluateNode(factor);
    if (!value) return null;
    parts.push(value);
  }

  let extracted = normalizeTerm(productOfTerms(parts.filter(isMonomialTerm)));
  const sums = parts.filter((part) => !isMonomialTerm(part));
  if (extracted.length === 0) extracted = [{ c: ONE, v: {} }];

  return { parts, extracted: extracted[0], sums };
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

/** An answer that has to equal `expected` and be fully written out. */
export function gradeSimplified(answer: string, expected: Term): boolean {
  const node = parseNode(answer);
  if (!node) return false;
  const value = evaluateNode(node);
  if (!value || !termsEqual(value, expected)) return false;
  return isSimplifiedNode(node, value);
}

/**
 * An answer that has to equal `expected` and be a product.
 * With `common`, the monomial pulled out in front has to be that one — the
 * difference between "2(6x + 9)" and the fully factored "6(2x + 3)".
 */
export function gradeFactored(answer: string, expected: Term, common?: Monomial): boolean {
  const factored = readFactored(answer);
  if (!factored) return false;
  if (!termsEqual(productOfTerms(factored.parts), expected)) return false;

  if (common) {
    if (factored.sums.length < 1) return false;
    return sameMonomialUpToSign(factored.extracted, common);
  }
  // No common factor asked for: the answer has to be a product of two brackets
  return factored.sums.length >= 2;
}

/** Reads a solution set: "3; -5", "x=3, x=-5", "1/2 ; 4". */
export function parseSolutions(answer: string): Fraction[] | null {
  const cleaned = answer.replace(/x\s*=/gi, " ").replace(/\bund\b|\bor\b/gi, ";");
  const parts = cleaned
    .split(/[;\n]|\s+/)
    .map((part) => part.trim())
    .filter((part) => part !== "" && part !== ",");
  if (parts.length === 0) return null;

  const values: Fraction[] = [];
  for (const part of parts) {
    const term = parseTerm(part);
    if (!term) return null;
    const normalized = normalizeTerm(term);
    if (normalized.length === 0) {
      values.push({ n: 0, d: 1 });
      continue;
    }
    if (normalized.length > 1 || totalDegree(normalized[0]) !== 0) return null;
    values.push(normalized[0].c);
  }
  return values;
}

/** True when the answer names exactly the expected solutions, in any order. */
export function solutionsMatch(answer: string, expected: Fraction[]): boolean {
  const given = parseSolutions(answer);
  if (!given) return false;
  const unique = (values: Fraction[]) => {
    const keys = values.map((f) => {
      const r = reduce(f);
      return `${r.n}/${r.d}`;
    });
    return [...new Set(keys)].sort();
  };
  const left = unique(given);
  const right = unique(expected);
  return left.length === right.length && left.every((key, i) => key === right[i]);
}

// ---------------------------------------------------------------------------
// Inequalities
// ---------------------------------------------------------------------------

export type Relation = "<" | "<=" | ">" | ">=";

/** A solved inequality: the variable alone on the left, a number on the right. */
export interface SolvedInequality {
  variable: string;
  relation: Relation;
  bound: Fraction;
}

// Longest spelling first, and never inside a longer command — "\le" must not
// bite the "\le" at the start of "\left".
const RELATION_TOKEN =
  /(\\leq(?![a-zA-Z])|\\le(?![a-zA-Z])|\\geq(?![a-zA-Z])|\\ge(?![a-zA-Z])|\\lt(?![a-zA-Z])|\\gt(?![a-zA-Z])|<=|>=|=<|=>|≤|≥|<|>)/;

function readRelation(token: string): Relation | null {
  switch (token) {
    case "<":
    case "\\lt":
      return "<";
    case ">":
    case "\\gt":
      return ">";
    case "<=":
    case "=<":
    case "≤":
    case "\\le":
    case "\\leq":
      return "<=";
    case ">=":
    case "=>":
    case "≥":
    case "\\ge":
    case "\\geq":
      return ">=";
    default:
      return null;
  }
}

/** Reading "4 > x" the other way round: the relation turns with the sides. */
export function mirrorRelation(relation: Relation): Relation {
  switch (relation) {
    case "<":
      return ">";
    case "<=":
      return ">=";
    case ">":
      return "<";
    case ">=":
      return "<=";
  }
}

export function relationLatex(relation: Relation): string {
  switch (relation) {
    case "<":
      return "<";
    case "<=":
      return "\\le";
    case ">":
      return ">";
    case ">=":
      return "\\ge";
  }
}

/** The bare variable of one side, or null when that side is anything else. */
function loneVariable(term: Term): string | null {
  const normalized = normalizeTerm(term);
  if (normalized.length !== 1) return null;
  const [monomial] = normalized;
  const names = Object.keys(monomial.v);
  if (names.length !== 1 || monomial.v[names[0]] !== 1) return null;
  if (monomial.c.n !== 1 || monomial.c.d !== 1) return null;
  return names[0];
}

/** The two sides of an inequality and the relation between them, or null when
 *  there is not exactly one relation in the input. */
export function splitRelation(
  input: string,
): { left: string; relation: Relation; right: string } | null {
  const parts = input.split(RELATION_TOKEN);
  // split with one capturing group yields [left, token, right]
  if (parts.length !== 3) return null;
  const relation = readRelation(parts[1]);
  return relation && { left: parts[0], relation, right: parts[2] };
}

/**
 * Reads a solved inequality: "x < 4", "x \le -3", and "4 > x" too, which says
 * the same thing. Anything still to be solved — "2x < 8" — is not a solution
 * and comes back null.
 */
export function parseInequality(input: string): SolvedInequality | null {
  const split = splitRelation(input);
  if (!split) return null;
  const { relation } = split;

  const left = parseTerm(split.left);
  const right = parseTerm(split.right);
  if (!left || !right) return null;

  const leftVariable = loneVariable(left);
  if (leftVariable && isConstantTerm(right)) {
    return { variable: leftVariable, relation, bound: constantValue(right) };
  }

  const rightVariable = loneVariable(right);
  if (rightVariable && isConstantTerm(left)) {
    return {
      variable: rightVariable,
      relation: mirrorRelation(relation),
      bound: constantValue(left),
    };
  }

  return null;
}

/** The value of a constant term. */
function constantValue(term: Term): Fraction {
  const normalized = normalizeTerm(term);
  return normalized.length === 0 ? { n: 0, d: 1 } : reduce(normalized[0].c);
}

/** True when the answer states exactly the expected solution set. */
export function inequalityMatches(answer: string, expected: SolvedInequality): boolean {
  const given = parseInequality(answer);
  if (!given) return false;
  return (
    given.variable === expected.variable &&
    given.relation === expected.relation &&
    given.bound.n * expected.bound.d === expected.bound.n * given.bound.d
  );
}

/**
 * Substitutes exact values for the variables: 4·(x + y²) at x = -3, y = 5 is 88,
 * and (x² + x) : 2 at x = 2/3 is exactly 5/9, not 0.5555555555555556.
 * Null when a variable of the term was not given a value.
 */
export function evaluateTermExact(
  term: Term,
  values: Record<string, Fraction>,
): Fraction | null {
  let total: Fraction = { n: 0, d: 1 };
  for (const m of normalizeTerm(term)) {
    let product = reduce(m.c);
    for (const [name, power] of Object.entries(m.v)) {
      const value = values[name];
      if (!value) return null;
      for (let i = 0; i < power; i++) product = multiply(product, value);
    }
    total = add(total, product);
  }
  return total;
}

/** Substitutes numbers for the variables — used to build wrong-answer cards that
 *  really are wrong, and to check a term's value. */
export function evaluateTermAt(term: Term, values: Record<string, number>): number {
  let total = 0;
  for (const m of normalizeTerm(term)) {
    let product = m.c.n / m.c.d;
    for (const [name, power] of Object.entries(m.v)) product *= (values[name] ?? 0) ** power;
    total += product;
  }
  return total;
}
