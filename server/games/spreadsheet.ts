import {
  FORMULA_VERDICTS,
  spreadsheetSpec,
  type ChartKind,
  type ChartQuestion,
  type CheckQuestion,
  type ConditionQuestion,
  type FormulaVerdict,
  type FunctionQuestion,
  type GrowthModel,
  type GrowthQuestion,
  type ReferenceQuestion,
  type SheetRow,
  type SpreadsheetChoiceQuestion,
} from "../../shared/games/spreadsheet";
import { speedPoints } from "../../shared/framework";
import type { StageHandler } from "../framework";
import { createStageGame } from "../framework";

/*
 * Every stage draws from several question types and several contexts, most of
 * them with random values, so that a class can play a stage again and meet
 * new sheets. Sheets show German formula syntax (SUMME, WENN, ";") as in a
 * German spreadsheet program, and the data is European, as SILP UV 9.2 asks.
 */

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * The answer and up to three distractors, in random order. Distractors are
 * taken in the order given, so a caller lists the ones that must appear first.
 */
function choice<T>(answer: T, distractors: T[], count = 4): { options: T[]; answerIndex: number } {
  const others = [...new Set(distractors)].filter((option) => option !== answer).slice(0, count - 1);
  const options = shuffled([answer, ...others]);
  return { options, answerIndex: options.indexOf(answer) };
}

function hidden<Q extends SpreadsheetChoiceQuestion>(question: Q): Q {
  return { ...question, answerIndex: -1 };
}

function evaluateChoice(question: SpreadsheetChoiceQuestion, answer: string, questionMs: number) {
  const correct = Number(answer) === question.answerIndex;
  return { correct, points: correct ? speedPoints(questionMs / 1000, 2, 25) : 0 };
}

/** A number as a German spreadsheet shows it: a decimal comma, at most two places. */
function sheetNumber(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

type Draft<Q> = Omit<Q, "id">;

function signature(question: Draft<SpreadsheetChoiceQuestion>): string {
  return JSON.stringify([
    question.promptKey,
    question.promptParams,
    question.formula,
    question.rows,
  ]);
}

/**
 * A round that walks through the stage's question types in shuffled order, so
 * every type comes up before one repeats, and never shows the same sheet twice.
 */
function buildRound<Q extends SpreadsheetChoiceQuestion>(
  count: number,
  variants: (() => Draft<Q>)[],
): Q[] {
  const questions: Q[] = [];
  const seen = new Set<string>();
  let queue: (() => Draft<Q>)[] = [];
  while (questions.length < count) {
    if (queue.length === 0) queue = shuffled(variants);
    const make = queue.pop()!;
    let draft = make();
    for (let attempt = 0; attempt < 20 && seen.has(signature(draft)); attempt++) draft = make();
    seen.add(signature(draft));
    questions.push({ ...draft, id: questions.length } as Q);
  }
  return questions;
}

// ─── Data ────────────────────────────────────────────────────────────────────

/** Rounded climate normals: January and July mean temperature, July rain and sunshine. */
const CITIES = [
  { city: "Athen", jan: 10, jul: 28, rain: 6, sun: 370 },
  { city: "Madrid", jan: 6, jul: 26, rain: 12, sun: 350 },
  { city: "Rom", jan: 8, jul: 25, rain: 19, sun: 330 },
  { city: "Lissabon", jan: 11, jul: 23, rain: 5, sun: 360 },
  { city: "Budapest", jan: 0, jul: 22, rain: 50, sun: 290 },
  { city: "Wien", jan: 1, jul: 21, rain: 68, sun: 270 },
  { city: "Paris", jan: 5, jul: 20, rain: 62, sun: 230 },
  { city: "Berlin", jan: 1, jul: 19, rain: 55, sun: 225 },
  { city: "Warschau", jan: -2, jul: 18, rain: 75, sun: 260 },
  { city: "Stockholm", jan: -3, jul: 17, rain: 70, sun: 280 },
  { city: "Oslo", jan: -4, jul: 16, rain: 81, sun: 240 },
  { city: "Dublin", jan: 5, jul: 15, rain: 56, sun: 170 },
] as const;

/** Inhabitants of the city proper, in millions, rounded. */
const POPULATION: [string, number][] = [
  ["Berlin", 3.8],
  ["Madrid", 3.4],
  ["Rom", 2.8],
  ["Paris", 2.1],
  ["Wien", 2.0],
  ["Warschau", 1.9],
  ["Budapest", 1.7],
  ["Barcelona", 1.6],
  ["Prag", 1.3],
  ["Kopenhagen", 0.7],
];

/** Monthly mean temperatures for Jan, Mär, Mai, Jul, Sep, Nov. */
const CLIMATE = [
  { city: "Berlin", temps: [1, 6, 14, 19, 14, 7] },
  { city: "Madrid", temps: [7, 12, 19, 26, 21, 13] },
  { city: "Helsinki", temps: [-4, 1, 9, 17, 10, 3] },
  { city: "Lissabon", temps: [12, 15, 18, 23, 22, 17] },
  { city: "Rom", temps: [8, 11, 18, 25, 22, 13] },
  { city: "Oslo", temps: [-4, 0, 11, 16, 11, 1] },
  { city: "Wien", temps: [1, 6, 15, 21, 16, 5] },
] as const;
const MONTHS = ["Jan", "Mär", "Mai", "Jul", "Sep", "Nov"];

const NAMES = ["Ali", "Ben", "Clara", "Deniz", "Emma", "Finn", "Greta", "Hana", "Ilias", "Jona", "Lea", "Mats", "Nora", "Omar"];
const KIOSK = ["Brezel", "Apfel", "Wasser", "Müsliriegel", "Käsebrötchen", "Apfelschorle", "Banane"];
const CLASSES = ["5a", "5b", "6a", "6b", "7a", "7b", "8a", "8b"];

const PRODUCTS: [string, number][] = [
  ["Fahrradlicht", 18],
  ["Powerbank", 25],
  ["Kopfhörer", 42],
  ["Tastatur", 55],
  ["Rucksack", 36],
  ["Trinkflasche", 12],
  ["Maus", 22],
];

const cityValues = (key: "jan" | "jul" | "rain" | "sun") => (): [string, number][] =>
  CITIES.map((entry) => [entry.city, entry[key]]);

const randomValues = (names: string[], min: number, max: number) => (): [string, number][] =>
  names.map((name) => [name, randomInt(min, max)]);

/** Up to `count` entries with pairwise different values, in random order. */
function distinctItems(items: [string, number][], count: number): [string, number][] {
  const result: [string, number][] = [];
  for (const item of shuffled(items)) {
    if (result.length === count) break;
    if (!result.some(([, value]) => value === item[1])) result.push(item);
  }
  return result;
}

// ─── Functions: SUMME, MAX, MIN, MITTELWERT ─────────────────────────────────

type SheetFunction = "SUMME" | "MAX" | "MIN" | "MITTELWERT";
const ALL_FUNCTIONS: SheetFunction[] = ["SUMME", "MAX", "MIN", "MITTELWERT"];

const FUNCTION_GOALS: Record<SheetFunction, string> = {
  SUMME: "sum",
  MAX: "max",
  MIN: "min",
  MITTELWERT: "average",
};

interface Series {
  id: string;
  label: string;
  header: string;
  /** Which functions answer a sensible question; a sum of temperatures does not. */
  functions: SheetFunction[];
  items: () => [string, number][];
}

const SERIES: Series[] = [
  { id: "julyTemp", label: "A: Stadt", header: "B: Juli (°C)", functions: ["MAX", "MIN", "MITTELWERT"], items: cityValues("jul") },
  { id: "janTemp", label: "A: Stadt", header: "B: Januar (°C)", functions: ["MAX", "MIN", "MITTELWERT"], items: cityValues("jan") },
  { id: "julyRain", label: "A: Stadt", header: "B: Regen Juli (mm)", functions: ALL_FUNCTIONS, items: cityValues("rain") },
  { id: "sunshine", label: "A: Stadt", header: "B: Sonne Juli (h)", functions: ["MAX", "MIN", "MITTELWERT"], items: cityValues("sun") },
  { id: "population", label: "A: Stadt", header: "B: Einwohner (Mio.)", functions: ALL_FUNCTIONS, items: () => POPULATION },
  { id: "kiosk", label: "A: Artikel", header: "B: verkauft", functions: ALL_FUNCTIONS, items: randomValues(KIOSK, 12, 95) },
  { id: "laps", label: "A: Klasse", header: "B: Runden", functions: ALL_FUNCTIONS, items: randomValues(CLASSES, 18, 64) },
];

function applyFunction(fn: SheetFunction, values: number[]): number {
  if (fn === "SUMME") return sum(values);
  if (fn === "MAX") return Math.max(...values);
  if (fn === "MIN") return Math.min(...values);
  return sum(values) / values.length;
}

interface DataSheet {
  series: Series;
  values: number[];
  /** The last data row; data sits in B2:B{last} and the result goes in B{last+1}. */
  last: number;
  headers: string[];
  rows: SheetRow[];
}

function dataSheet(series: Series, result: string | number = "?"): DataSheet {
  const items = distinctItems(series.items(), randomInt(4, 6));
  const last = items.length + 1;
  return {
    series,
    values: items.map(([, value]) => value),
    last,
    headers: ["", series.label, series.header],
    rows: [
      ...items.map(([name, value], index) => ({ cells: [index + 2, name, sheetNumber(value)] })),
      { cells: [last + 1, "", result] },
    ],
  };
}

/** The values of column B in the given rows. */
function valuesAt(sheet: DataSheet, rows: number[]): number[] {
  return rows.map((row) => sheet.values[row - 2]);
}

function rowsBetween(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/**
 * Plausible ways to miss B2:B{last}: a row short, a row late, two cells
 * instead of a range, the result cell itself included, or the names column.
 */
function rangeMistakes(fn: SheetFunction, last: number): string[] {
  return shuffled([
    `=${fn}(B2:B${last - 1})`,
    `=${fn}(B3:B${last})`,
    `=${fn}(B2;B${last})`,
    `=${fn}(B2:B${last + 1})`,
    `=${fn}(A2:A${last})`,
  ]);
}

function functionValue(): Draft<FunctionQuestion> {
  const series = pick(SERIES);
  const sheet = dataSheet(series);
  const fn = pick(series.functions);
  const all = rowsBetween(2, sheet.last);
  // Now and then a list of single cells, to tell ";" from ":".
  const list = Math.random() < 0.35;
  const rows = list ? shuffled(all).slice(0, 2).sort((a, b) => a - b) : all;
  const text = list ? `=${fn}(${rows.map((row) => `B${row}`).join(";")})` : `=${fn}(B2:B${sheet.last})`;
  const answer = sheetNumber(applyFunction(fn, valuesAt(sheet, rows)));
  const distractors = [
    ...(list ? [sheetNumber(applyFunction(fn, sheet.values))] : []),
    ...shuffled(ALL_FUNCTIONS.map((other) => sheetNumber(applyFunction(other, valuesAt(sheet, rows))))),
    ...shuffled(sheet.values.map(sheetNumber)),
  ];
  const cell = `B${sheet.last + 1}`;
  return {
    kind: "function",
    promptKey: "games.spreadsheet.prompts.functionValue",
    promptParams: { cell },
    headers: sheet.headers,
    rows: sheet.rows,
    formula: { address: cell, text },
    ...choice(answer, distractors),
  };
}

function functionGoal(): Draft<FunctionQuestion> {
  const series = pick(SERIES);
  const sheet = dataSheet(series);
  const fn = pick(series.functions);
  const correct = `=${fn}(B2:B${sheet.last})`;
  const wrongFunction = pick(series.functions.filter((other) => other !== fn));
  const cell = `B${sheet.last + 1}`;
  return {
    kind: "function",
    promptKey: "games.spreadsheet.prompts.functionGoal",
    promptParams: { cell, series: series.id, goal: FUNCTION_GOALS[fn] },
    headers: sheet.headers,
    rows: sheet.rows,
    ...choice(correct, [`=${wrongFunction}(B2:B${sheet.last})`, ...rangeMistakes(fn, sheet.last)]),
  };
}

/** The result is on the sheet; which formula produced it? */
function functionReverse(): Draft<FunctionQuestion> {
  const series = pick(SERIES.filter((candidate) => candidate.functions.length === 4));
  const probe = dataSheet(series);
  const fn = pick(series.functions);
  const value = applyFunction(fn, probe.values);
  const cell = `B${probe.last + 1}`;
  const rows = probe.rows.map((row, index) =>
    index === probe.rows.length - 1 ? { cells: [row.cells[0], "", sheetNumber(value)] } : row,
  );
  const correct = `=${fn}(B2:B${probe.last})`;
  const differs = (values: number[], other: SheetFunction) =>
    values.length > 0 && sheetNumber(applyFunction(other, values)) !== sheetNumber(value);
  const distractors = [
    ...shuffled(ALL_FUNCTIONS)
      .filter((other) => other !== fn && differs(probe.values, other))
      .map((other) => `=${other}(B2:B${probe.last})`),
    ...[rowsBetween(2, probe.last - 1), rowsBetween(3, probe.last)]
      .filter((range) => differs(valuesAt(probe, range), fn))
      .map((range) => `=${fn}(B${range[0]}:B${range.at(-1)})`),
  ];
  return {
    kind: "function",
    promptKey: "games.spreadsheet.prompts.functionReverse",
    promptParams: { cell, value: sheetNumber(value) },
    headers: probe.headers,
    rows,
    ...choice(correct, distractors),
  };
}

const COLUMNS = ["A", "B", "C", "D", "E"];

/** How many cells does a range cover? Row and column counts, and ";" against ":". */
function functionCellCount(): Draft<FunctionQuestion> {
  let [c1, c2, r1, r2] = [0, 0, 1, 1];
  // A single cell is no range worth asking about.
  while ((c2 - c1 + 1) * (r2 - r1 + 1) < 2) {
    [c1, c2] = [randomInt(0, 3), randomInt(0, 4)].sort((a, b) => a - b);
    [r1, r2] = [randomInt(1, 4), randomInt(2, 6)].sort((a, b) => a - b);
  }
  const width = c2 - c1 + 1;
  const height = r2 - r1 + 1;
  const list = Math.random() < 0.3;
  const from = `${COLUMNS[c1]}${r1}`;
  const to = `${COLUMNS[c2]}${r2}`;
  const range = list ? `${from};${to}` : `${from}:${to}`;
  const answer = list ? 2 : width * height;
  const distractors = [width * height, 2, answer + 1, answer - 1, answer + 2, width + height, (width - 1) * (height - 1), height, width]
    .filter((value) => value > 0)
    .map(String);
  return {
    kind: "function",
    promptKey: "games.spreadsheet.prompts.cellCount",
    promptParams: { range },
    headers: ["", ...COLUMNS],
    rows: rowsBetween(1, 6).map((row) => ({ cells: [row, "", "", "", "", ""] })),
    formula: { address: "G1", text: `=SUMME(${range})` },
    ...choice(String(answer), distractors),
  };
}

// ─── Conditions: WENN ────────────────────────────────────────────────────────

type Comparison = ">=" | ">" | "<=" | "<" | "=" | "<>";

function compare(op: Comparison, a: number, b: number): boolean {
  if (op === ">=") return a >= b;
  if (op === ">") return a > b;
  if (op === "<=") return a <= b;
  if (op === "<") return a < b;
  if (op === "=") return a === b;
  return a !== b;
}

const COMPARISON_NAMES: Record<Comparison, string> = {
  ">=": "atLeast",
  ">": "moreThan",
  "<=": "atMost",
  "<": "lessThan",
  "=": "equal",
  "<>": "notEqual",
};

/** The same comparison with or without the boundary: the classic slip. */
const BOUNDARY_SIBLING: Record<Comparison, Comparison> = {
  ">=": ">",
  ">": ">=",
  "<=": "<",
  "<": "<=",
  "=": "<>",
  "<>": "=",
};

interface Rule {
  id: string;
  label: string;
  header: string;
  unit: string;
  then: string;
  otherwise: string;
  /** Comparisons that fit the story, like "at least" for passing a test. */
  comparisons: Comparison[];
  items: () => [string, number][];
}

const RULES: Rule[] = [
  { id: "weather", label: "A: Stadt", header: "B: Juli (°C)", unit: "°C", then: "warm", otherwise: "kühl", comparisons: [">=", ">"], items: cityValues("jul") },
  { id: "test", label: "A: Name", header: "B: Punkte", unit: "Punkte", then: "bestanden", otherwise: "nicht bestanden", comparisons: [">=", ">"], items: randomValues(NAMES, 6, 30) },
  { id: "stock", label: "A: Artikel", header: "B: Bestand", unit: "Stück", then: "nachbestellen", otherwise: "ok", comparisons: ["<", "<="], items: randomValues(KIOSK, 0, 40) },
  { id: "rain", label: "A: Stadt", header: "B: Regen Juli (mm)", unit: "mm", then: "trocken", otherwise: "nass", comparisons: ["<", "<="], items: cityValues("rain") },
  { id: "jump", label: "A: Name", header: "B: Weitsprung (m)", unit: "m", then: "Urkunde", otherwise: "keine", comparisons: [">=", ">"], items: () => NAMES.map((name) => [name, randomInt(28, 46) / 10]) },
  { id: "frost", label: "A: Stadt", header: "B: Januar (°C)", unit: "°C", then: "Frost", otherwise: "kein Frost", comparisons: ["<", "<="], items: cityValues("jan") },
];

interface RuleSheet {
  rule: Rule;
  values: number[];
  names: string[];
  /** Taken from a middle value, so both results occur and one row sits on it. */
  threshold: number;
}

function ruleSheet(rule: Rule): RuleSheet {
  const items = distinctItems(rule.items(), 5);
  const values = items.map(([, value]) => value);
  return {
    rule,
    values,
    names: items.map(([name]) => name),
    threshold: pick([...values].sort((a, b) => a - b).slice(1, 4)),
  };
}

function ruleRows(sheet: RuleSheet, column: (index: number) => string): SheetRow[] {
  return sheet.values.map((value, index) => ({
    cells: [index + 2, sheet.names[index], sheetNumber(value), column(index)],
  }));
}

function ruleParameter(sheet: RuleSheet) {
  return { parameterAddress: "F1", parameterValue: `${sheetNumber(sheet.threshold)} ${sheet.rule.unit}` };
}

function ifFormula(row: number, op: string, address: string, then: string, otherwise: string) {
  return `=WENN(B${row}${op}${address};${then};${otherwise})`;
}

const quoted = (text: string) => `"${text}"`;

function ruleFormula(sheet: RuleSheet, row: number, op: Comparison, address = "$F$1") {
  return ifFormula(row, op, address, quoted(sheet.rule.then), quoted(sheet.rule.otherwise));
}

/** Which WENN formula filled column C? The row on the threshold decides > or >=. */
function conditionFormula(): Draft<ConditionQuestion> {
  const rule = pick(RULES);
  const sheet = ruleSheet(rule);
  const op = pick(rule.comparisons);
  const then = quoted(rule.then);
  const otherwise = quoted(rule.otherwise);
  const correct = ifFormula(2, op, "$F$1", then, otherwise);
  return {
    kind: "condition",
    promptKey: "games.spreadsheet.prompts.conditionColumn",
    promptParams: { then: rule.then, otherwise: rule.otherwise },
    headers: ["", rule.label, rule.header, "C"],
    rows: ruleRows(sheet, (index) =>
      compare(op, sheet.values[index], sheet.threshold) ? rule.then : rule.otherwise,
    ),
    ...ruleParameter(sheet),
    ...choice(correct, [
      ifFormula(2, BOUNDARY_SIBLING[op], "$F$1", then, otherwise),
      ...shuffled([
        ifFormula(2, op, "$F$1", otherwise, then),
        ifFormula(2, op, "F1", then, otherwise),
        ifFormula(2, op, "$F$1", rule.then, rule.otherwise),
      ]),
    ]),
  };
}

/** What does one copied WENN formula show? Often the row sits right on the threshold. */
function conditionValue(): Draft<ConditionQuestion> {
  const rule = pick(RULES);
  const sheet = ruleSheet(rule);
  const index = Math.random() < 0.5 ? sheet.values.indexOf(sheet.threshold) : randomInt(0, 4);
  const row = index + 2;
  const op = pick(rule.comparisons);
  const answer = compare(op, sheet.values[index], sheet.threshold) ? rule.then : rule.otherwise;
  return {
    kind: "condition",
    promptKey: "games.spreadsheet.prompts.conditionValue",
    promptParams: { address: `C${row}` },
    headers: ["", rule.label, rule.header, "C"],
    rows: ruleRows(sheet, (rowIndex) => (rowIndex === index ? "?" : "")),
    ...ruleParameter(sheet),
    formula: { address: `C${row}`, text: ruleFormula(sheet, row, op) },
    ...choice(answer, [rule.then, rule.otherwise, "WAHR", "FALSCH"]),
  };
}

/** Copied down the whole column: how often does the first result appear? */
function conditionCount(): Draft<ConditionQuestion> {
  const rule = pick(RULES);
  const sheet = ruleSheet(rule);
  const op = pick(rule.comparisons);
  const count = sheet.values.filter((value) => compare(op, value, sheet.threshold)).length;
  const sibling = sheet.values.filter((value) => compare(BOUNDARY_SIBLING[op], value, sheet.threshold)).length;
  return {
    kind: "condition",
    promptKey: "games.spreadsheet.prompts.conditionCount",
    promptParams: { then: rule.then },
    headers: ["", rule.label, rule.header, "C"],
    rows: ruleRows(sheet, () => "…"),
    ...ruleParameter(sheet),
    formula: { address: "C2", text: ruleFormula(sheet, 2, op) },
    ...choice(
      String(count),
      [sibling, 5 - count, count + 1, count - 1, count + 2]
        .filter((value) => value >= 0 && value <= 5)
        .map(String),
    ),
  };
}

/** WENN with numbers: free shipping above a minimum, or a discount. */
function conditionPrice(): Draft<ConditionQuestion> {
  const shipping = Math.random() < 0.5;
  const minimum = shipping ? pick([30, 40, 50]) : pick([50, 80, 100]);
  const amount = shipping ? pick([4, 5, 6]) : pick([5, 10, 15]);
  const orders = shuffled([minimum - 10, minimum - 1, minimum, minimum + 5, minimum + 20]).slice(0, 4);
  const index = randomInt(0, orders.length - 1);
  const row = index + 2;
  const order = orders[index];
  const reached = order >= minimum;
  const answer = shipping ? (reached ? order : order + amount) : reached ? order - amount : order;
  const text = shipping
    ? ifFormula(row, ">=", "$F$1", `B${row}`, `B${row}+${amount}`)
    : ifFormula(row, ">=", "$F$1", `B${row}-${amount}`, `B${row}`);
  return {
    kind: "condition",
    promptKey: shipping
      ? "games.spreadsheet.prompts.conditionShipping"
      : "games.spreadsheet.prompts.conditionDiscount",
    promptParams: { address: `C${row}`, fee: amount, amount },
    headers: ["", "A: Bestellung", "B: Warenwert (€)", "C: Endpreis (€)"],
    rows: orders.map((value, rowIndex) => ({
      cells: [rowIndex + 2, `#${101 + rowIndex}`, value, rowIndex === index ? "?" : ""],
    })),
    parameterAddress: "F1",
    parameterValue: `${minimum} €`,
    formula: { address: `C${row}`, text },
    ...choice(String(answer), [order, order + amount, order - amount, amount, 0].map(String)),
  };
}

/** Which comparison says "at least", "less than", "not equal"? */
function conditionComparison(): Draft<ConditionQuestion> {
  const op = pick(Object.keys(COMPARISON_NAMES) as Comparison[]);
  const condition = (other: Comparison) => `B2${other}$F$1`;
  return {
    kind: "condition",
    promptKey: "games.spreadsheet.prompts.conditionComparison",
    promptParams: { comparison: COMPARISON_NAMES[op] },
    headers: [],
    rows: [],
    formula: { address: "C2", text: '=WENN(…;"ja";"nein")' },
    ...choice(condition(op), [
      condition(BOUNDARY_SIBLING[op]),
      ...shuffled(Object.keys(COMPARISON_NAMES) as Comparison[]).map(condition),
    ]),
  };
}

// ─── References: relative, absolute and mixed ────────────────────────────────

/**
 * Copy a formula by `rows` down and `columns` right, the way a spreadsheet
 * does: every reference moves, except the parts fixed with `$`.
 * `mode` produces the usual wrong ideas of it.
 */
function shiftFormula(
  formula: string,
  rows: number,
  columns: number,
  mode: "copy" | "ignoreDollars" | "onlyDollars" = "copy",
): string {
  return formula.replace(
    /(?<![A-Z])(\$?)([A-Z])(\$?)(\d+)/g,
    (_, colFixed: string, column: string, rowFixed: string, row: string) => {
      const move = (fixed: boolean) =>
        mode === "ignoreDollars" ? true : mode === "onlyDollars" ? fixed : !fixed;
      const newColumn = move(colFixed === "$") ? String.fromCharCode(column.charCodeAt(0) + columns) : column;
      const newRow = move(rowFixed === "$") ? Number(row) + rows : Number(row);
      return `${colFixed}${newColumn}${rowFixed}${newRow}`;
    },
  );
}

type Tail = "percent" | "fee" | "currency";

/** Rounded exchange rates for one euro, so that prices can be converted. */
const RATES = [
  ["0,95", "CHF"],
  ["0,86", "GBP"],
  ["11,5", "SEK"],
  ["25,2", "CZK"],
  ["7,46", "DKK"],
] as const;

interface TailParameter {
  /** What the parameter cell shows. */
  display: string;
  params: Record<string, string | number>;
}

const TAILS: Record<Tail, { operator: string; tail: (address: string) => string; parameter: () => TailParameter }> = {
  percent: {
    operator: "*",
    tail: (address) => `(1+${address})`,
    parameter: () => {
      const value = pick([5, 10, 15, 20]);
      return { display: `${value} %`, params: { value } };
    },
  },
  fee: {
    operator: "+",
    tail: (address) => address,
    parameter: () => {
      const value = pick([2, 3, 5, 8]);
      return { display: `${value} €`, params: { value } };
    },
  },
  currency: {
    operator: "*",
    tail: (address) => address,
    parameter: () => {
      const [rate, currency] = pick(RATES);
      return { display: rate, params: { rate, currency } };
    },
  },
};

/** Which formula can be copied down? The parameter cell needs its `$`. */
function referenceCopyable(): Draft<ReferenceQuestion> {
  const tail = pick(["percent", "percent", "fee", "currency"] as const);
  const { operator, tail: withTail, parameter } = TAILS[tail];
  const startRow = randomInt(2, 4);
  const parameterRow = randomInt(1, 3);
  const fixed = `$F$${parameterRow}`;
  const correct = `=B${startRow}${operator}${withTail(fixed)}`;
  const products = shuffled(PRODUCTS).slice(0, 3);
  const { display, params } = parameter();
  return {
    kind: "reference",
    promptKey:
      tail === "percent"
        ? "games.spreadsheet.prompts.percentFormula"
        : tail === "fee"
          ? "games.spreadsheet.prompts.feeFormula"
          : "games.spreadsheet.prompts.currencyFormula",
    promptParams: { row: startRow, address: fixed, ...params },
    headers: ["", "A", "B", "C"],
    rows: products.map(([name, price], index) => ({
      cells: [startRow + index, name, price, index === 0 ? "?" : "↓ kopieren"],
    })),
    parameterAddress: `F${parameterRow}`,
    parameterValue: display,
    ...choice(
      correct,
      shuffled([
        `=$B$${startRow}${operator}${withTail(fixed)}`,
        `=B${startRow}${operator}${withTail(`F${parameterRow}`)}`,
        `=B$${startRow}${operator}${withTail(`F$${parameterRow}`)}`,
        `=B${startRow}${operator}${withTail(`$F${parameterRow}`)}`,
      ]),
    ),
  };
}

interface CopyTask {
  from: string;
  formula: string;
  to: string;
}

/** Formulas as they occur in the other stages, each with where it gets copied. */
function copyTask(): CopyTask {
  const down = randomInt(2, 4);
  const right = randomInt(1, 3);
  return pick<() => CopyTask>([
    () => ({ from: "C2", formula: pick(["=B2*$F$1", "=B2*F1", "=B2*F$1", "=B2+$F$1", "=B2*(1+$F$1)", "=$B$2*F1"]), to: `C${2 + down}` }),
    () => ({ from: "C2", formula: pick(["=B2/$B$7", "=B2/B$7", "=A2*B2"]), to: `C${2 + down}` }),
    () => ({ from: "E2", formula: pick(["=SUMME(B2:D2)", "=MAX(B2:D2)", "=MITTELWERT($B2:D2)"]), to: `E${2 + down}` }),
    () => ({ from: "B7", formula: pick(["=SUMME(B2:B6)", "=MIN(B2:B6)", "=SUMME(B$2:B$6)", "=B6*$A$9"]), to: `${COLUMNS[1 + right]}7` }),
    () => ({ from: "B2", formula: pick(["=$A2*B$1", "=A2*B1", "=$A$2*B1"]), to: `${COLUMNS[1 + right]}${2 + down}` }),
    () => ({ from: "C3", formula: pick(['=WENN(B3>=$F$1;"warm";"kühl")', '=WENN(B3>=F1;"warm";"kühl")']), to: `C${3 + down}` }),
  ])();
}

function cellOffset(from: string, to: string): { rows: number; columns: number } {
  return {
    rows: Number(to.slice(1)) - Number(from.slice(1)),
    columns: to.charCodeAt(0) - from.charCodeAt(0),
  };
}

/** A formula is copied elsewhere: what does it say there? */
function referenceAfterCopy(): Draft<ReferenceQuestion> {
  const task = copyTask();
  const { rows, columns } = cellOffset(task.from, task.to);
  const correct = shiftFormula(task.formula, rows, columns);
  const offByOne = shiftFormula(task.formula, rows > 0 ? rows - 1 : rows, columns > 0 && rows === 0 ? columns - 1 : columns);
  const tooFar = shiftFormula(task.formula, rows > 0 ? rows + 1 : rows, rows === 0 ? columns + 1 : columns);
  return {
    kind: "reference",
    promptKey: "games.spreadsheet.prompts.afterCopy",
    promptParams: { from: task.from, to: task.to },
    headers: [],
    rows: [],
    formula: { address: task.from, text: task.formula },
    ...choice(correct, [
      shiftFormula(task.formula, rows, columns, "ignoreDollars"),
      task.formula,
      shiftFormula(task.formula, rows, columns, "onlyDollars"),
      offByOne,
      tooFar,
      // Rows and columns mixed up, or moved down as well as across.
      shiftFormula(task.formula, columns, rows),
      shiftFormula(task.formula, columns, rows, "ignoreDollars"),
      shiftFormula(task.formula, rows + 1, columns),
      shiftFormula(task.formula, rows, columns + 1),
    ]),
  };
}

/** A price table: one formula for right and down needs mixed references. */
function referenceMixed(): Draft<ReferenceQuestion> {
  const prices = shuffled([2, 3, 4, 5, 6]).slice(0, 3);
  const amounts = shuffled([1, 2, 3, 5, 10]).slice(0, 3).sort((a, b) => a - b);
  const correct = "=$A2*B$1";
  return {
    kind: "reference",
    promptKey: "games.spreadsheet.prompts.mixedFormula",
    promptParams: {},
    headers: ["", "A", "B", "C", "D"],
    rows: [
      { cells: [1, "Preis € \\ Anzahl", ...amounts] },
      ...prices.map((price, index) => ({
        cells: [index + 2, price, index === 0 ? "?" : "…", "…", "…"],
      })),
    ],
    ...choice(correct, shuffled(["=A2*B1", "=$A$2*$B$1", "=A$2*$B1", "=$A2*$B1", "=A2*B$1", "=$A2*B1"])),
  };
}

/** Each city's share of the total: the total cell must stay fixed. */
function referenceShare(): Draft<ReferenceQuestion> {
  const series = pick(SERIES.filter((candidate) => candidate.functions.includes("SUMME")));
  const items = distinctItems(series.items(), 5);
  const total = sum(items.map(([, value]) => value));
  const correct = "=B2/$B$7";
  return {
    kind: "reference",
    promptKey: "games.spreadsheet.prompts.shareFormula",
    promptParams: {},
    headers: ["", series.label, series.header, "C: Anteil"],
    rows: [
      ...items.map(([name, value], index) => ({
        cells: [index + 2, name, sheetNumber(value), index === 0 ? "?" : "↓ kopieren"],
      })),
      { cells: [7, "Summe", sheetNumber(total), ""] },
    ],
    ...choice(correct, shuffled(["=B2/B7", "=$B$2/B7", "=B2/$B$2", "=B$2/B7", "=B2/SUMME(B2:B6)"])),
  };
}

// ─── Growth: linear, exponential, quadratic ─────────────────────────────────

interface GrowthContext {
  id: string;
  model: GrowthModel;
  label: string;
  header: string;
  /**
   * A start value and a step (absolute, or percent for exponential models).
   * Exponential starts are multiples that keep three steps whole numbers;
   * a quadratic model takes its first x instead.
   */
  preset: () => [number, number];
}

/** Multiples that keep start·(1±p)³ whole: 10 % needs 1000, 20 % 125, 50 % 8. */
function exponentialPreset(percents: number[], scale: number): [number, number] {
  const percent = pick(percents);
  const unit = percent === 10 ? 1000 : percent === 20 ? 125 : percent === 50 ? 8 : 1;
  return [unit * Math.max(1, Math.round((scale * randomInt(1, 6)) / unit)), percent];
}

const GROWTH: GrowthContext[] = [
  { id: "savings", model: "linearUp", label: "A: Woche", header: "B: Erspartes (€)", preset: () => [randomInt(0, 10) * 5, randomInt(1, 4) * 5] },
  { id: "sunflower", model: "linearUp", label: "A: Woche", header: "B: Höhe (cm)", preset: () => [randomInt(5, 30), randomInt(6, 15)] },
  { id: "candle", model: "linearDown", label: "A: Stunde", header: "B: Länge (cm)", preset: () => [randomInt(22, 35), randomInt(2, 5)] },
  { id: "prepaid", model: "linearDown", label: "A: Monat", header: "B: Guthaben (€)", preset: () => [randomInt(10, 20) * 5, randomInt(1, 3) * 5] },
  { id: "interest", model: "expUp", label: "A: Jahr", header: "B: Kontostand (€)", preset: () => exponentialPreset([10, 20], 1000) },
  { id: "bacteria", model: "expUp", label: "A: Stunde", header: "B: Bakterien", preset: () => exponentialPreset([50, 100], 200) },
  { id: "followers", model: "expUp", label: "A: Monat", header: "B: Follower", preset: () => exponentialPreset([10, 20, 50], 1000) },
  { id: "ebike", model: "expDown", label: "A: Jahr", header: "B: Wert (€)", preset: () => exponentialPreset([10, 20, 50], 1000) },
  { id: "medicine", model: "expDown", label: "A: Stunde", header: "B: Wirkstoff (mg)", preset: () => exponentialPreset([10, 20, 50], 500) },
  { id: "braking", model: "quadratic", label: "A: Tempo (km/h)", header: "B: Bremsweg (m)", preset: () => [randomInt(1, 4), 0] },
  { id: "squares", model: "quadratic", label: "A: Seite (cm)", header: "B: Fläche (cm²)", preset: () => [randomInt(1, 5), 0] },
];

const GROWTH_FORMULAS: Record<Exclude<GrowthModel, "quadratic">, string> = {
  linearUp: "=B2+$E$1",
  linearDown: "=B2-$E$1",
  expUp: "=B2*(1+$E$1)",
  expDown: "=B2*(1-$E$1)",
};

/** Same direction, the other kind of growth: the mix-up that matters. */
const GROWTH_TWIN: Record<GrowthModel, GrowthModel> = {
  linearUp: "expUp",
  expUp: "linearUp",
  linearDown: "expDown",
  expDown: "linearDown",
  quadratic: "expUp",
};

/** The values in B2, B3, …, and what column A counts. */
function growthSeries(context: GrowthContext, count: number) {
  const [start, step] = context.preset();
  const values: number[] = [];
  const labels: number[] = [];
  for (let index = 0; index < count; index++) {
    if (context.model === "quadratic") {
      const x = start + index;
      labels.push(context.id === "braking" ? x * 10 : x);
      values.push(x * x);
      continue;
    }
    labels.push(index);
    const previous = values[index - 1] ?? start;
    values.push(
      index === 0
        ? start
        : context.model === "linearUp"
          ? previous + step
          : context.model === "linearDown"
            ? previous - step
            : context.model === "expUp"
              ? previous * (1 + step / 100)
              : previous * (1 - step / 100),
    );
  }
  return { start, step, values: values.map((value) => Math.round(value * 100) / 100), labels };
}

function growthRows(labels: number[], values: (number | string)[]): SheetRow[] {
  return values.map((value, index) => ({
    cells: [index + 2, labels[index], typeof value === "number" ? sheetNumber(value) : value],
  }));
}

function growthParameter(model: GrowthModel, step: number): string {
  return model.startsWith("exp") ? `${step} %` : String(step);
}

/** A story about growth: which formula goes in B3? */
function growthFormula(): Draft<GrowthQuestion> {
  const context = pick(GROWTH.filter((candidate) => candidate.model !== "quadratic"));
  const model = context.model as Exclude<GrowthModel, "quadratic">;
  const { step, values, labels } = growthSeries(context, 4);
  const correct = GROWTH_FORMULAS[model];
  const twin = GROWTH_FORMULAS[GROWTH_TWIN[model] as Exclude<GrowthModel, "quadratic">];
  const fixed = correct.replace("B2", "$B$2").replace("$E$1", "E1");
  return {
    kind: "growth",
    model,
    promptKey: "games.spreadsheet.prompts.growthFormula",
    promptParams: { context: context.id },
    headers: ["", context.label, context.header],
    rows: growthRows(labels, values),
    parameterAddress: "E1",
    parameterValue: growthParameter(model, step),
    ...choice(correct, [twin, ...shuffled([fixed, "=B2*$E$1", correct.replace("$E$1", "E1"), ...Object.values(GROWTH_FORMULAS)])]),
  };
}

/** Only the numbers: which kind of growth is it? */
function growthModelQuestion(): Draft<GrowthQuestion> {
  const context = pick(GROWTH);
  const { values, labels } = growthSeries(context, 5);
  const models: GrowthModel[] = ["linearUp", "linearDown", "expUp", "expDown", "quadratic"];
  return {
    kind: "growth",
    model: context.model,
    promptKey: "games.spreadsheet.prompts.growthModel",
    promptParams: {},
    headers: ["", context.label, context.header],
    rows: growthRows(labels, values),
    optionKeyPrefix: "games.spreadsheet.models",
    ...choice<string>(context.model, [
      GROWTH_TWIN[context.model],
      ...(context.model === "expUp" ? ["quadratic"] : []),
      ...shuffled(models),
    ]),
  };
}

/** Continue the simulation by one row. */
function growthNext(): Draft<GrowthQuestion> {
  const context = pick(GROWTH.filter((candidate) => candidate.model !== "quadratic"));
  const model = context.model as Exclude<GrowthModel, "quadratic">;
  const { step, values, labels } = growthSeries(context, 4);
  const [, , third, fourth] = values;
  const answer = fourth;
  const up = model.endsWith("Up") ? 1 : -1;
  const difference = values[2] - values[1];
  const distractors = [
    third + difference,
    third + up * step,
    third,
    answer + up * step,
    third - up * step,
    values[0],
    ...(model.startsWith("exp") ? [third * (1 + (up * step) / 100)] : []),
    third + 2 * difference,
    values[0] + 3 * up * step,
  ]
    .map((value) => Math.round(value * 100) / 100)
    .filter((value) => value >= 0)
    .map(sheetNumber);
  return {
    kind: "growth",
    model,
    promptKey: "games.spreadsheet.prompts.growthNext",
    promptParams: { cell: "B5" },
    headers: ["", context.label, context.header],
    rows: growthRows(labels, [...values.slice(0, 3), "?"]),
    parameterAddress: "E1",
    parameterValue: growthParameter(model, step),
    formula: { address: "B3", text: GROWTH_FORMULAS[model] },
    ...choice(sheetNumber(answer), distractors),
  };
}

/** Read the parameter back from the numbers: what is in E1? */
function growthParameterQuestion(): Draft<GrowthQuestion> {
  const context = pick(GROWTH.filter((candidate) => candidate.model !== "quadratic"));
  const model = context.model as Exclude<GrowthModel, "quadratic">;
  const { start, step, values, labels } = growthSeries(context, 4);
  const exponential = model.startsWith("exp");
  const up = model.endsWith("Up") ? 1 : -1;
  const difference = Math.abs(values[1] - values[0]);
  const answer = growthParameter(model, step);
  const distractors = exponential
    ? [sheetNumber(difference), sheetNumber(1 + (up * step) / 100), `${100 + up * step} %`, `${step * 2} %`]
    : [`${step} %`, String(step * 2), String(start), sheetNumber(values[1]), sheetNumber(values[3]), String(step * 3)];
  return {
    kind: "growth",
    model,
    promptKey: "games.spreadsheet.prompts.growthParameter",
    promptParams: {},
    headers: ["", context.label, context.header],
    rows: growthRows(labels, values),
    parameterAddress: "E1",
    parameterValue: "?",
    formula: { address: "B3", text: GROWTH_FORMULAS[model] },
    ...choice(answer, distractors),
  };
}

// ─── Charts ──────────────────────────────────────────────────────────────────

/** Random whole percentages that add up to 100. */
function shares(count: number): number[] {
  const weights = Array.from({ length: count }, () => randomInt(2, 10));
  const total = sum(weights);
  const result = weights.map((weight) => Math.round((weight / total) * 100));
  result[0] += 100 - sum(result);
  return result;
}

interface ChartDraft {
  answer: ChartKind;
  promptKey: string;
  promptParams: Record<string, string | number>;
  headers: string[];
  rows: SheetRow[];
}

const CHARTS: (() => ChartDraft)[] = [
  // Change over time → line.
  () => {
    const climate = pick(CLIMATE);
    return {
      answer: "line",
      promptKey: "games.spreadsheet.prompts.temperatureChart",
      promptParams: { city: climate.city },
      headers: ["", "A: Monat", "B: °C"],
      rows: MONTHS.map((month, index) => ({ cells: [index + 2, month, climate.temps[index]] })),
    };
  },
  () => {
    let height = randomInt(5, 15);
    return {
      answer: "line",
      promptKey: "games.spreadsheet.prompts.plantChart",
      promptParams: {},
      headers: ["", "A: Woche", "B: Höhe (cm)"],
      rows: rowsBetween(1, 6).map((week) => ({ cells: [week + 1, week, (height += randomInt(4, 14))] })),
    };
  },
  () => {
    let charge = 100;
    const hours = ["7 Uhr", "9 Uhr", "11 Uhr", "13 Uhr", "15 Uhr", "17 Uhr"];
    return {
      answer: "line",
      promptKey: "games.spreadsheet.prompts.batteryChart",
      promptParams: {},
      headers: ["", "A: Uhrzeit", "B: Akku (%)"],
      rows: hours.map((hour, index) => {
        if (index > 0) charge = Math.max(3, charge - randomInt(8, 20));
        return { cells: [index + 2, hour, charge] };
      }),
    };
  },
  // Comparing categories → columns.
  () => ({
    answer: "bar",
    promptKey: "games.spreadsheet.prompts.julyRainChart",
    promptParams: {},
    headers: ["", "A: Stadt", "B: Regen Juli (mm)"],
    rows: shuffled(CITIES).slice(0, 5).map((entry, index) => ({ cells: [index + 2, entry.city, entry.rain] })),
  }),
  () => ({
    answer: "bar",
    promptKey: "games.spreadsheet.prompts.populationChart",
    promptParams: {},
    headers: ["", "A: Stadt", "B: Einwohner (Mio.)"],
    rows: shuffled(POPULATION).slice(0, 5).map(([city, value], index) => ({ cells: [index + 2, city, sheetNumber(value)] })),
  }),
  () => ({
    answer: "bar",
    promptKey: "games.spreadsheet.prompts.kioskChart",
    promptParams: {},
    headers: ["", "A: Artikel", "B: verkauft"],
    rows: shuffled(KIOSK).slice(0, 5).map((item, index) => ({ cells: [index + 2, item, randomInt(12, 95)] })),
  }),
  // Parts of a whole → pie.
  () => {
    const ways = ["Bus", "Fahrrad", "zu Fuß", "Auto"];
    const values = shares(ways.length);
    return {
      answer: "pie",
      promptKey: "games.spreadsheet.prompts.commuteChart",
      promptParams: {},
      headers: ["", "A: Schulweg", "B: Anteil (%)"],
      rows: ways.map((way, index) => ({ cells: [index + 2, way, values[index]] })),
    };
  },
  () => {
    const uses = ["Snacks", "Freizeit", "Kleidung", "Sparen", "Handy"];
    const values = shares(uses.length);
    return {
      answer: "pie",
      promptKey: "games.spreadsheet.prompts.pocketMoneyChart",
      promptParams: {},
      headers: ["", "A: Ausgabe", "B: Anteil (%)"],
      rows: uses.map((use, index) => ({ cells: [index + 2, use, values[index]] })),
    };
  },
  // How two quantities relate → scatter.
  () => {
    const days = ["Mo", "Di", "Mi", "Do", "Fr", "Mo", "Di"];
    return {
      answer: "scatter",
      promptKey: "games.spreadsheet.prompts.iceChart",
      promptParams: {},
      headers: ["", "A: Tag", "B: °C", "C: Eis verkauft"],
      rows: days.map((day, index) => {
        const temperature = randomInt(12, 32);
        return { cells: [index + 2, day, temperature, Math.max(0, temperature * 3 - 30 + randomInt(-8, 8))] };
      }),
    };
  },
  () => ({
    answer: "scatter",
    promptKey: "games.spreadsheet.prompts.sunshineChart",
    promptParams: {},
    headers: ["", "A: Stadt", "B: Sonne Juli (h)", "C: Juli (°C)"],
    rows: shuffled(CITIES).slice(0, 7).map((entry, index) => ({ cells: [index + 2, entry.city, entry.sun, entry.jul] })),
  }),
];

function chartQuestion(): Draft<ChartQuestion> {
  const { answer, ...draft } = pick(CHARTS)();
  return {
    kind: "chart",
    ...draft,
    ...choice<ChartKind>(answer, ["line", "bar", "pie", "scatter"]),
  };
}

// ─── Check: is this formula right, and if not, what is wrong? ───────────────

function checkFunction(verdict: FormulaVerdict): Draft<CheckQuestion> {
  const series = pick(SERIES);
  const sheet = dataSheet(series);
  const fn = pick(series.functions);
  const text =
    verdict === "range"
      ? pick(rangeMistakes(fn, sheet.last))
      : verdict === "function"
        ? `=${pick(series.functions.filter((other) => other !== fn))}(B2:B${sheet.last})`
        : `=${fn}(B2:B${sheet.last})`;
  const cell = `B${sheet.last + 1}`;
  return {
    kind: "check",
    promptKey: "games.spreadsheet.prompts.checkGoal",
    promptParams: { cell, series: series.id, goal: FUNCTION_GOALS[fn] },
    headers: sheet.headers,
    rows: sheet.rows,
    formula: { address: cell, text },
    options: FORMULA_VERDICTS,
    answerIndex: FORMULA_VERDICTS.indexOf(verdict),
  };
}

/**
 * A formula written in row 2 and copied down, looked at in a later row. When
 * the verdict is "reference", the parameter cell has drifted along.
 */
function checkCopy(verdict: "correct" | "reference"): Draft<CheckQuestion> {
  const row = randomInt(3, 5);
  const wrong = verdict === "reference";
  // Only the row has to be fixed when copying down, so F$1 is as right as $F$1.
  const fixed = wrong ? pick([`F${row - 1}`, `$F${row - 1}`]) : pick(["$F$1", "$F$1", "F$1"]);
  const base = {
    kind: "check" as const,
    options: FORMULA_VERDICTS,
    answerIndex: FORMULA_VERDICTS.indexOf(verdict),
  };
  const scenario = pick(["percent", "fee", "currency", "share", "rule"] as const);

  if (scenario === "rule") {
    const rule = pick(RULES);
    const sheet = ruleSheet(rule);
    const op = pick(rule.comparisons);
    return {
      ...base,
      promptKey: "games.spreadsheet.prompts.checkRule",
      promptParams: { row, then: rule.then, comparison: COMPARISON_NAMES[op] },
      headers: ["", rule.label, rule.header, "C"],
      rows: ruleRows(sheet, (index) => (index + 2 === row ? "?" : "…")),
      ...ruleParameter(sheet),
      formula: { address: `C${row}`, text: ruleFormula(sheet, row, op, fixed) },
    };
  }

  if (scenario === "share") {
    const series = pick(SERIES.filter((candidate) => candidate.functions.includes("SUMME")));
    const items = distinctItems(series.items(), 5);
    const total = wrong ? pick([`B${7 + row - 2}`, `$B${7 + row - 2}`]) : pick(["$B$7", "B$7"]);
    return {
      ...base,
      promptKey: "games.spreadsheet.prompts.checkShare",
      promptParams: { row },
      headers: ["", series.label, series.header, "C: Anteil"],
      rows: [
        ...items.map(([name, value], index) => ({
          cells: [index + 2, name, sheetNumber(value), index + 2 === row ? "?" : "…"],
        })),
        { cells: [7, "Summe", sheetNumber(sum(items.map(([, value]) => value))), ""] },
      ],
      formula: { address: `C${row}`, text: `=B${row}/${total}` },
    };
  }

  const { operator, tail, parameter } = TAILS[scenario];
  const { display, params } = parameter();
  return {
    ...base,
    promptKey: `games.spreadsheet.prompts.check${scenario[0].toUpperCase()}${scenario.slice(1)}`,
    promptParams: { row, ...params },
    headers: ["", "A: Produkt", "B: Preis (€)", "C: neuer Preis"],
    rows: shuffled(PRODUCTS)
      .slice(0, 4)
      .map(([name, price], index) => ({ cells: [index + 2, name, price, index + 2 === row ? "?" : "…"] })),
    parameterAddress: "F1",
    parameterValue: display,
    formula: { address: `C${row}`, text: `=B${row}${operator}${tail(fixed)}` },
  };
}

function checkQuestion(): Draft<CheckQuestion> {
  const verdict = pick(FORMULA_VERDICTS);
  if (verdict === "range" || verdict === "function") return checkFunction(verdict);
  if (verdict === "reference") return checkCopy(verdict);
  return Math.random() < 0.4 ? checkFunction(verdict) : checkCopy(verdict);
}

// ─── Stages ──────────────────────────────────────────────────────────────────

function stage<Q extends SpreadsheetChoiceQuestion>(
  id: string,
  variants: (() => Draft<Q>)[],
): StageHandler<Q> {
  return {
    id,
    forPlayer: hidden,
    createQuestions: ({ settings }) => buildRound(Number(settings.questionsPerRound), variants),
    evaluate: (question, answer, { questionMs }) => evaluateChoice(question, answer, questionMs),
  };
}

export default createStageGame(spreadsheetSpec, [
  stage<ReferenceQuestion>("references", [referenceCopyable, referenceAfterCopy, referenceMixed, referenceShare]),
  stage<GrowthQuestion>("growth", [growthFormula, growthModelQuestion, growthNext, growthParameterQuestion]),
  stage<ChartQuestion>("charts", [chartQuestion]),
  stage<FunctionQuestion>("functions", [functionValue, functionGoal, functionReverse, functionCellCount]),
  stage<ConditionQuestion>("conditions", [
    conditionFormula,
    conditionValue,
    conditionCount,
    conditionPrice,
    conditionComparison,
  ]),
  stage<CheckQuestion>("check", [checkQuestion]),
]);
