// Python — UV-INF-SEK1-10-01, "Computerprogramme mit System entwickeln".
//
// Every stage asks the player to be the interpreter: read a listing and say what
// it does. The programs are generated, not drawn from a pool, so a class can
// play a station twice without meeting the same question, and they stay inside
// the Python subset the hyperbook's Turtle-Lernpfad teaches — no f-strings, no
// dictionaries, no slicing.

import { pythonSpec } from "../../shared/games/python";
import type {
  BugQuestion,
  CodeAnswerQuestion,
  CodeChoiceQuestion,
  LogicQuestion,
  ParsonsAnswer,
  ParsonsQuestion,
  TurtleQuestion,
} from "../../shared/games/python";
import { answerMatches, sequenceMatches, sequenceScore } from "../../shared/code-answer";
import {
  drawingFingerprint,
  fingerprintDistance,
  runTurtle,
  toPython,
  type TurtleCommand,
  type TurtleDrawing,
} from "../../shared/python-turtle";
import { speedPoints } from "../../shared/framework";
import type { AnswerTiming, StageHandler } from "../framework";
import { createStageGame } from "../framework";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** `count` items from `items`, repeating the pool when more are asked for. */
function pickN<T>(items: readonly T[], count: number): T[] {
  const out: T[] = [];
  while (out.length < count) out.push(...shuffle(items));
  return out.slice(0, count);
}

/** Builds `count` questions from a generator and numbers them. */
function build<Q extends object>(count: number, make: (index: number) => Q): (Q & { id: number })[] {
  return Array.from({ length: count }, (_, id) => ({ ...make(id), id }));
}

/** How Python prints a number: an integer division keeps no ".0", a `/` does. */
function py(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1e6) / 1e6);
}

const NUMBER_NAMES = ["zahl", "wert", "punkte", "anzahl", "laenge", "breite", "preis", "hoehe"];
const LIST_NAMES = ["zahlen", "preise", "hoehen", "punkte", "werte"];

// ---------------------------------------------------------------------------
// Grading shared by the five "read it and type the answer" stages
// ---------------------------------------------------------------------------

function gradeTyped(question: CodeAnswerQuestion, answer: string, timing: AnswerTiming) {
  if (question.expected.length === 1) {
    const correct = answerMatches(question.expected[0], answer);
    return { correct, points: correct ? speedPoints(timing.questionMs / 1000, 2, 40) : 0 };
  }
  if (sequenceMatches(question.expected, answer)) {
    return { correct: true, points: speedPoints(timing.questionMs / 1000, 2, 50) };
  }
  // Half the lines right is worth something — reading a loop is the exercise.
  return { correct: false, points: Math.round(40 * sequenceScore(question.expected, answer)) };
}

function gradeChoice(answerIndex: number, answer: string, timing: AnswerTiming) {
  const correct = Number(answer) === answerIndex;
  return { correct, points: correct ? speedPoints(timing.questionMs / 1000, 2, 40) : 0 };
}

type Task = Omit<CodeAnswerQuestion, "id">;
/** A logic question is a union, so its generators number themselves. */
type LogicTask = (id: number) => LogicQuestion;

// ---------------------------------------------------------------------------
// output — Kapitel 1: print, the four operations, //, % and **
// ---------------------------------------------------------------------------

function arithmeticTask(): Task {
  switch (pick(["sum", "product", "precedence", "brackets", "power", "two"] as const)) {
    case "sum": {
      const a = randomInt(11, 99);
      const b = randomInt(11, 99);
      const op = pick(["+", "-"] as const);
      return { code: [`print(${a} ${op} ${b})`], ask: "output", expected: [py(op === "+" ? a + b : a - b)] };
    }
    case "product": {
      const a = randomInt(3, 19);
      const b = randomInt(3, 12);
      return { code: [`print(${a} * ${b})`], ask: "output", expected: [py(a * b)] };
    }
    case "precedence": {
      const a = randomInt(2, 30);
      const b = randomInt(2, 9);
      const c = randomInt(2, 9);
      return { code: [`print(${a} + ${b} * ${c})`], ask: "output", expected: [py(a + b * c)] };
    }
    case "brackets": {
      const a = randomInt(2, 20);
      const b = randomInt(2, 12);
      const c = randomInt(2, 6);
      return { code: [`print((${a} + ${b}) * ${c})`], ask: "output", expected: [py((a + b) * c)] };
    }
    case "power": {
      const base = pick([2, 3, 5, 10]);
      const exponent = base === 2 ? randomInt(3, 8) : randomInt(2, 4);
      return { code: [`print(${base} ** ${exponent})`], ask: "output", expected: [py(base ** exponent)] };
    }
    default: {
      // Two prints, so the answer is a sequence and the order matters.
      const a = randomInt(4, 20);
      const b = randomInt(2, 9);
      return {
        code: [`print(${a} * ${b})`, `print(${a} + ${b} * 2)`],
        ask: "output",
        expected: [py(a * b), py(a + b * 2)],
      };
    }
  }
}

function divisionTask(): Task {
  switch (pick(["trio", "floor", "mod", "clock", "board"] as const)) {
    case "trio": {
      // A divisor whose "/" result is a short decimal, so the answer is writable.
      const b = pick([2, 4, 5]);
      const a = randomInt(11, 99);
      return {
        code: [`print(${a} / ${b})`, `print(${a} // ${b})`, `print(${a} % ${b})`],
        ask: "output",
        expected: [py(a / b), py(Math.floor(a / b)), py(a % b)],
      };
    }
    case "floor": {
      const b = randomInt(3, 12);
      const a = randomInt(2 * b + 1, 200);
      return { code: [`print(${a} // ${b})`], ask: "output", expected: [py(Math.floor(a / b))] };
    }
    case "mod": {
      const b = randomInt(3, 12);
      const a = randomInt(2 * b + 1, 200);
      return { code: [`print(${a} % ${b})`], ask: "output", expected: [py(a % b)] };
    }
    case "clock": {
      // "Wie spät ist es in n Stunden?" — the modulo task of the hyperbook.
      const start = randomInt(0, 23);
      const hours = randomInt(30, 300);
      return {
        code: [`print((${start} + ${hours}) % 24)`],
        ask: "output",
        expected: [py((start + hours) % 24)],
      };
    }
    default: {
      // Andrea's board: how many pieces, how much waste.
      const piece = randomInt(7, 23);
      const board = randomInt(10 * piece, 60 * piece);
      return {
        code: [`print(${board} // ${piece})`, `print(${board} % ${piece})`],
        ask: "output",
        expected: [py(Math.floor(board / piece)), py(board % piece)],
      };
    }
  }
}

const outputStage: StageHandler<CodeAnswerQuestion> = {
  id: "output",

  createQuestions({ settings }) {
    const mode = String(settings.outputTasks);
    return build(Number(settings.questionsPerRound), () => {
      if (mode === "arithmetic") return arithmeticTask();
      if (mode === "division") return divisionTask();
      return Math.random() < 0.5 ? arithmeticTask() : divisionTask();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// variables — Kapitel 2.1/2.2: storing, overwriting, and what input() returns
// ---------------------------------------------------------------------------

function numberVariableTask(): Task {
  const [first, second] = shuffle(NUMBER_NAMES).slice(0, 2);
  const values: Record<string, number> = {};
  const code: string[] = [];

  values[first] = randomInt(2, 20);
  code.push(`${first} = ${values[first]}`);
  values[second] = randomInt(2, 20);
  code.push(`${second} = ${values[second]}`);

  // Two or three steps, at least one of them overwriting a variable with itself.
  const steps = randomInt(2, 3);
  for (let i = 0; i < steps; i++) {
    const target = pick([first, second]);
    const other = target === first ? second : first;
    switch (pick(["self", "other", "double"] as const)) {
      case "self": {
        const delta = randomInt(2, 15);
        const op = pick(["+", "-"] as const);
        values[target] = op === "+" ? values[target] + delta : values[target] - delta;
        code.push(`${target} = ${target} ${op} ${delta}`);
        break;
      }
      case "other": {
        const delta = randomInt(2, 12);
        values[target] = values[other] + delta;
        code.push(`${target} = ${other} + ${delta}`);
        break;
      }
      default: {
        const factor = randomInt(2, 4);
        values[target] = values[target] * factor;
        code.push(`${target} = ${target} * ${factor}`);
        break;
      }
    }
  }

  const asked = pick([first, second]);
  if (Math.random() < 0.5) {
    return { code: [...code, `print(${asked})`], ask: "output", expected: [py(values[asked])] };
  }
  return { code, ask: "value", askArg: asked, expected: [py(values[asked])] };
}

function swapTask(): Task {
  const [a, b] = shuffle(["a", "b", "links", "rechts"]).slice(0, 2);
  const first = randomInt(2, 30);
  const second = randomInt(2, 30);
  return {
    code: [
      `${a} = ${first}`,
      `${b} = ${second}`,
      `hilf = ${a}`,
      `${a} = ${b}`,
      `${b} = hilf`,
      `print(${a})`,
      `print(${b})`,
    ],
    ask: "output",
    expected: [py(second), py(first)],
  };
}

function stringTask(): Task {
  const names = ["Ada", "Alan", "Grace", "Linus", "Mina"];
  switch (pick(["greet", "age", "input", "intInput"] as const)) {
    case "greet": {
      const name = pick(names);
      return {
        code: [`name = "${name}"`, `gruss = "Hallo " + name`, `print(gruss)`],
        ask: "output",
        expected: [`Hallo ${name}`],
      };
    }
    case "age": {
      const age = randomInt(14, 17);
      return {
        code: [`alter = ${age}`, `print("Ich bin " + str(alter) + " Jahre alt")`],
        ask: "output",
        expected: [`Ich bin ${age} Jahre alt`],
      };
    }
    case "input": {
      // input() hands back a text, so "+" glues instead of adding.
      const typed = randomInt(2, 9);
      return {
        code: [`zahl = input("Zahl: ")`, `print(zahl + zahl)`],
        ask: "output",
        expected: [`${typed}${typed}`],
        noteKey: "games.python.note.input",
        noteArg: String(typed),
      };
    }
    default: {
      const typed = randomInt(11, 49);
      return {
        code: [`zahl = int(input("Zahl: "))`, `print(zahl + zahl)`],
        ask: "output",
        expected: [py(typed * 2)],
        noteKey: "games.python.note.input",
        noteArg: String(typed),
      };
    }
  }
}

const variablesStage: StageHandler<CodeAnswerQuestion> = {
  id: "variables",

  createQuestions({ settings }) {
    const withStrings = settings.withStrings === true;
    return build(Number(settings.questionsPerRound), () => {
      const roll = Math.random();
      if (withStrings && roll < 0.35) return stringTask();
      if (roll < 0.5) return swapTask();
      return numberVariableTask();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// loops — Kapitel 2.3, 2.5, 2.6: for, while and nesting
// ---------------------------------------------------------------------------

function forOutputTask(): Task {
  const from = Math.random() < 0.5 ? 0 : randomInt(1, 5);
  const to = from + randomInt(3, 5);
  const header = from === 0 ? `for i in range(${to}):` : `for i in range(${from}, ${to}):`;
  const values: number[] = [];
  for (let i = from; i < to; i++) values.push(i);

  switch (pick(["plain", "scaled", "shifted"] as const)) {
    case "plain":
      return { code: [header, `    print(i)`], ask: "output", expected: values.map(py) };
    case "scaled": {
      const factor = randomInt(2, 9);
      return {
        code: [header, `    print(i * ${factor})`],
        ask: "output",
        expected: values.map((i) => py(i * factor)),
      };
    }
    default: {
      const offset = randomInt(2, 20);
      return {
        code: [header, `    print(i + ${offset})`],
        ask: "output",
        expected: values.map((i) => py(i + offset)),
      };
    }
  }
}

function accumulateTask(): Task {
  const to = randomInt(4, 7);
  const name = pick(["summe", "gesamt"]);
  let total = 0;
  for (let i = 0; i < to; i++) total += i;
  return {
    code: [`${name} = 0`, `for i in range(${to}):`, `    ${name} = ${name} + i`, `print(${name})`],
    ask: "output",
    expected: [py(total)],
  };
}

function nestedCountTask(): Task {
  const outer = randomInt(2, 5);
  const inner = randomInt(2, 6);
  return {
    code: [
      `for i in range(${outer}):`,
      `    for j in range(${inner}):`,
      `        dot(10)`,
      `        forward(20)`,
    ],
    ask: "count",
    expected: [py(outer * inner)],
  };
}

function forCountTask(): Task {
  const from = randomInt(1, 8);
  const to = from + randomInt(3, 9);
  return {
    code: [`for i in range(${from}, ${to}):`, `    forward(30)`, `    right(90)`],
    ask: "count",
    expected: [py(to - from)],
  };
}

function whileTask(): Task {
  switch (pick(["double", "countdown", "count"] as const)) {
    case "double": {
      const limit = pick([20, 50, 100, 200]);
      let value = 1;
      while (value < limit) value = value * 2;
      return {
        code: [`zahl = 1`, `while zahl < ${limit}:`, `    zahl = zahl * 2`, `print(zahl)`],
        ask: "output",
        expected: [py(value)],
      };
    }
    case "countdown": {
      const step = pick([7, 15, 20, 30]);
      const start = step * randomInt(3, 6) + randomInt(0, step - 1);
      const floor = randomInt(5, 15);
      let value = start;
      while (value > floor) value = value - step;
      return {
        code: [`rest = ${start}`, `while rest > ${floor}:`, `    rest = rest - ${step}`, `print(rest)`],
        ask: "output",
        expected: [py(value)],
      };
    }
    default: {
      const step = pick([3, 4, 5, 6]);
      const limit = step * randomInt(3, 7);
      let value = 0;
      let runs = 0;
      while (value < limit) {
        value += step;
        runs++;
      }
      return {
        code: [`wert = 0`, `while wert < ${limit}:`, `    wert = wert + ${step}`],
        ask: "count",
        expected: [py(runs)],
      };
    }
  }
}

const loopsStage: StageHandler<CodeAnswerQuestion> = {
  id: "loops",

  createQuestions({ settings }) {
    const mode = String(settings.loopTasks);
    const nested = settings.withNested === true;
    const forTasks = [forOutputTask, accumulateTask, forCountTask];
    if (nested) forTasks.push(nestedCountTask);

    return build(Number(settings.questionsPerRound), () => {
      if (mode === "while") return whileTask();
      if (mode === "for") return pick(forTasks)();
      return Math.random() < 0.3 ? whileTask() : pick(forTasks)();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// branch — Kapitel 2.7: if / elif / else, and why the order decides
// ---------------------------------------------------------------------------

interface BranchTopic {
  variable: string;
  /** Thresholds in descending order, with the text each one prints. */
  levels: { at: number; text: string }[];
  elseText: string;
  /** The range the tested value is drawn from. */
  min: number;
  max: number;
}

const BRANCH_TOPICS: BranchTopic[] = [
  {
    variable: "punkte",
    levels: [
      { at: 90, text: "sehr gut" },
      { at: 75, text: "gut" },
      { at: 60, text: "befriedigend" },
      { at: 45, text: "ausreichend" },
    ],
    elseText: "nicht bestanden",
    min: 0,
    max: 100,
  },
  {
    variable: "temperatur",
    levels: [
      { at: 28, text: "Badehose" },
      { at: 20, text: "T-Shirt" },
      { at: 10, text: "Jacke" },
      { at: 0, text: "Mantel" },
    ],
    elseText: "Winterjacke",
    min: -10,
    max: 35,
  },
  {
    variable: "alter",
    levels: [
      { at: 18, text: "volljaehrig" },
      { at: 16, text: "fast so weit" },
      { at: 12, text: "Jugendlicher" },
      { at: 6, text: "Schulkind" },
    ],
    elseText: "Kindergarten",
    min: 2,
    max: 25,
  },
  {
    variable: "laenge",
    levels: [
      { at: 200, text: "rot" },
      { at: 120, text: "gruen" },
      { at: 60, text: "blau" },
      { at: 20, text: "grau" },
    ],
    elseText: "schwarz",
    min: 0,
    max: 250,
  },
];

function branchTask(branchCount: number): Omit<CodeChoiceQuestion, "id"> {
  const topic = pick(BRANCH_TOPICS);
  const levels = topic.levels.slice(0, branchCount);
  // Every fourth question puts the widest condition first: it swallows all the
  // others, which is exactly the trap "prüfe immer erst die engste Bedingung".
  const trap = Math.random() < 0.25;
  const ordered = trap ? [...levels].reverse() : levels;
  const withElse = Math.random() < 0.75;
  const value = randomInt(topic.min, topic.max);

  const code = [`${topic.variable} = ${value}`];
  ordered.forEach((level, index) => {
    code.push(`${index === 0 ? "if" : "elif"} ${topic.variable} >= ${level.at}:`);
    code.push(`    print("${level.text}")`);
  });
  if (withElse) {
    code.push(`else:`);
    code.push(`    print("${topic.elseText}")`);
  }

  const hit = ordered.find((level) => value >= level.at);
  const answer = hit ? hit.text : withElse ? topic.elseText : "";
  const texts = [...ordered.map((level) => level.text)];
  if (withElse) texts.push(topic.elseText);
  // "keine Ausgabe" is an option whenever the chain can fall through.
  const options = withElse ? shuffle(texts) : shuffle([...texts, ""]);

  return {
    code,
    ask: "output",
    options,
    answerIndex: options.indexOf(answer),
  };
}

function logicBranchTask(): Omit<CodeChoiceQuestion, "id"> {
  const age = randomInt(12, 22);
  const hasTicket = Math.random() < 0.5;
  const code = [
    `alter = ${age}`,
    `hat_ticket = ${hasTicket ? "True" : "False"}`,
    `if alter >= 18 and hat_ticket:`,
    `    print("Einlass")`,
    `elif alter >= 16 or hat_ticket:`,
    `    print("nur bis 22 Uhr")`,
    `else:`,
    `    print("kein Einlass")`,
  ];
  const answer =
    age >= 18 && hasTicket ? "Einlass" : age >= 16 || hasTicket ? "nur bis 22 Uhr" : "kein Einlass";
  const options = shuffle(["Einlass", "nur bis 22 Uhr", "kein Einlass", ""]);
  return { code, ask: "output", options, answerIndex: options.indexOf(answer) };
}

const branchStage: StageHandler<CodeChoiceQuestion> = {
  id: "branch",

  createQuestions({ settings }) {
    const branchCount = Number(settings.branchCount);
    const withLogic = settings.withLogicConditions === true;
    return build(Number(settings.questionsPerRound), () =>
      withLogic && Math.random() < 0.4 ? logicBranchTask() : branchTask(branchCount),
    );
  },

  evaluate: (question, answer, timing) => gradeChoice(question.answerIndex, answer, timing),
};

// ---------------------------------------------------------------------------
// logic — Kapitel 3: and, or, not, and the order they bind in
// ---------------------------------------------------------------------------

const literalLogicTask: LogicTask = (id) => {
  const value = () => Math.random() < 0.5;
  const show = (b: boolean) => (b ? "True" : "False");

  switch (pick(["pair", "notPair", "triple", "compare"] as const)) {
    case "pair": {
      const a = value();
      const b = value();
      const op = pick(["and", "or"] as const);
      return {
        id,
        kind: "value",
        code: [],
        expression: `${show(a)} ${op} ${show(b)}`,
        answer: op === "and" ? a && b : a || b,
      };
    }
    case "notPair": {
      const a = value();
      const b = value();
      const op = pick(["and", "or"] as const);
      return {
        id,
        kind: "value",
        code: [],
        expression: `not ${show(a)} ${op} ${show(b)}`,
        answer: op === "and" ? !a && b : !a || b,
      };
    }
    case "triple": {
      const a = value();
      const b = value();
      const c = value();
      // "and" binds tighter than "or" — the whole point of the Vorfahrtsregeln.
      return {
        id,
        kind: "value",
        code: [],
        expression: `${show(a)} or ${show(b)} and ${show(c)}`,
        answer: a || (b && c),
      };
    }
    default: {
      const a = randomInt(1, 30);
      const b = randomInt(1, 30);
      const op = pick(["==", "!=", "<", ">", "<=", ">="] as const);
      const answer =
        op === "==" ? a === b : op === "!=" ? a !== b : op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : a >= b;
      return { id, kind: "value", code: [], expression: `${a} ${op} ${b}`, answer };
    }
  }
};

const variableLogicTask: LogicTask = (id) => {
  const number = pick(NUMBER_NAMES);
  const flag = pick(["ist_fertig", "hat_gewonnen", "die_sonne_scheint", "ist_offen"]);
  const numberValue = randomInt(1, 30);
  const flagValue = Math.random() < 0.5;
  const bound = randomInt(1, 30);
  const op = pick(["<", ">", ">=", "<=", "=="] as const);
  const comparison =
    op === "<"
      ? numberValue < bound
      : op === ">"
        ? numberValue > bound
        : op === ">="
          ? numberValue >= bound
          : op === "<="
            ? numberValue <= bound
            : numberValue === bound;

  const code = [`${number} = ${numberValue}`, `${flag} = ${flagValue ? "True" : "False"}`];

  switch (pick(["and", "or", "not", "notFlag"] as const)) {
    case "and":
      return {
        id,
        kind: "value",
        code,
        expression: `${number} ${op} ${bound} and ${flag}`,
        answer: comparison && flagValue,
      };
    case "or":
      return {
        id,
        kind: "value",
        code,
        expression: `${number} ${op} ${bound} or ${flag}`,
        answer: comparison || flagValue,
      };
    case "not":
      return {
        id,
        kind: "value",
        code,
        expression: `not ${number} ${op} ${bound}`,
        answer: !comparison,
      };
    default:
      return {
        id,
        kind: "value",
        code,
        expression: `${number} ${op} ${bound} and not ${flag}`,
        answer: comparison && !flagValue,
      };
  }
};

/** "Wie setzt Python die Klammern?" — one right reading, three plausible ones. */
const BRACKET_PATTERNS: { expression: string; correct: string; wrong: string[] }[] = [
  {
    expression: "not a and b or c",
    correct: "((not a) and b) or c",
    wrong: ["not (a and (b or c))", "(not (a and b)) or c", "not ((a and b) or c)"],
  },
  {
    expression: "not a or b and c",
    correct: "(not a) or (b and c)",
    wrong: ["not (a or (b and c))", "((not a) or b) and c", "not ((a or b) and c)"],
  },
  {
    expression: "a and not b or c",
    correct: "(a and (not b)) or c",
    wrong: ["a and ((not b) or c)", "a and not (b or c)", "(a and not (b or c))"],
  },
  {
    expression: "a or b and not c",
    correct: "a or (b and (not c))",
    wrong: ["(a or b) and (not c)", "a or not (b and c)", "((a or b) and b) and not c"],
  },
];

const bracketTask: LogicTask = (id) => {
  const pattern = pick(BRACKET_PATTERNS);
  const options = shuffle([pattern.correct, ...pattern.wrong]);
  return {
    id,
    kind: "reading",
    expression: pattern.expression,
    options,
    answerIndex: options.indexOf(pattern.correct),
  };
};

const logicStage: StageHandler<LogicQuestion> = {
  id: "logic",

  createQuestions({ settings }) {
    const mode = String(settings.logicTasks);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      if (mode === "values") return literalLogicTask(id);
      if (mode === "variables") return variableLogicTask(id);
      const roll = Math.random();
      if (roll < 0.2) return bracketTask(id);
      return roll < 0.6 ? literalLogicTask(id) : variableLogicTask(id);
    });
  },

  evaluate(question, answer, timing) {
    if (question.kind === "reading") {
      const correct = Number(answer) === question.answerIndex;
      return { correct, points: correct ? 100 : 0 };
    }
    const correct = answer === String(question.answer);
    // Two buttons, so speed is what separates knowing it from guessing it.
    return { correct, points: correct ? speedPoints(timing.questionMs / 1000, 8, 20) : 0 };
  },
};

// ---------------------------------------------------------------------------
// functions — Kapitel 4: def, parameters, arguments, return
// ---------------------------------------------------------------------------

function returnValueTask(): Task {
  switch (pick(["double", "square", "nested", "twoParams"] as const)) {
    case "double": {
      const argument = randomInt(3, 40);
      return {
        code: [`def verdoppeln(zahl):`, `    return zahl * 2`, ``, `print(verdoppeln(${argument}))`],
        ask: "call",
        expected: [py(argument * 2)],
      };
    }
    case "square": {
      const argument = randomInt(3, 12);
      const offset = randomInt(1, 9);
      return {
        code: [
          `def rechne(zahl):`,
          `    return zahl * zahl + ${offset}`,
          ``,
          `print(rechne(${argument}))`,
        ],
        ask: "call",
        expected: [py(argument * argument + offset)],
      };
    }
    case "nested": {
      const argument = randomInt(2, 9);
      return {
        code: [
          `def verdoppeln(zahl):`,
          `    return zahl * 2`,
          ``,
          `print(verdoppeln(verdoppeln(${argument})))`,
        ],
        ask: "call",
        expected: [py(argument * 4)],
      };
    }
    default: {
      const a = randomInt(2, 12);
      const b = randomInt(2, 12);
      const c = randomInt(2, 6);
      return {
        code: [
          `def flaeche(breite, hoehe):`,
          `    return breite * hoehe`,
          ``,
          `def volumen(breite, hoehe, tiefe):`,
          `    return flaeche(breite, hoehe) * tiefe`,
          ``,
          `print(volumen(${a}, ${b}, ${c}))`,
        ],
        ask: "call",
        expected: [py(a * b * c)],
      };
    }
  }
}

function argumentOrderTask(): Task {
  switch (pick(["difference", "power", "divide"] as const)) {
    case "difference": {
      const a = randomInt(2, 20);
      const b = randomInt(2, 20);
      return {
        code: [`def differenz(a, b):`, `    return a - b`, ``, `print(differenz(${a}, ${b}))`],
        ask: "call",
        expected: [py(a - b)],
      };
    }
    case "power": {
      const a = pick([2, 3, 4]);
      const b = randomInt(2, 4);
      return {
        code: [`def potenz(basis, hochzahl):`, `    return basis ** hochzahl`, ``, `print(potenz(${b}, ${a}))`],
        ask: "call",
        expected: [py(b ** a)],
      };
    }
    default: {
      const b = pick([2, 3, 4, 5]);
      const a = b * randomInt(2, 20);
      return {
        code: [`def teile(zaehler, nenner):`, `    return zaehler // nenner`, ``, `print(teile(${a}, ${b}))`],
        ask: "call",
        expected: [py(Math.floor(a / b))],
      };
    }
  }
}

/** A function that prints instead of returning hands back None. */
function printVersusReturnTask(): Task {
  const argument = randomInt(3, 12);
  return {
    code: [
      `def quadrat(zahl):`,
      `    print(zahl * zahl)`,
      ``,
      `ergebnis = quadrat(${argument})`,
      `print(ergebnis)`,
    ],
    ask: "output",
    expected: [py(argument * argument), "None"],
  };
}

const functionsStage: StageHandler<CodeAnswerQuestion> = {
  id: "functions",

  createQuestions({ settings }) {
    const mode = String(settings.functionTasks);
    return build(Number(settings.questionsPerRound), () => {
      if (mode === "order") return argumentOrderTask();
      if (mode === "value") return returnValueTask();
      const roll = Math.random();
      if (roll < 0.2) return printVersusReturnTask();
      return roll < 0.6 ? returnValueTask() : argumentOrderTask();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// lists — Kapitel 5: counting from zero, len(), and the for-each loop
// ---------------------------------------------------------------------------

function listValues(count: number): number[] {
  return Array.from({ length: count }, () => randomInt(1, 20));
}

function indexTask(): Task {
  const name = pick(LIST_NAMES);
  const values = listValues(randomInt(4, 6));
  const literal = `[${values.join(", ")}]`;

  switch (pick(["index", "len", "last", "sumTwo"] as const)) {
    case "index": {
      const index = randomInt(0, values.length - 1);
      return {
        code: [`${name} = ${literal}`, `print(${name}[${index}])`],
        ask: "output",
        expected: [py(values[index])],
      };
    }
    case "len":
      return {
        code: [`${name} = ${literal}`, `print(len(${name}))`],
        ask: "output",
        expected: [py(values.length)],
      };
    case "last":
      return {
        code: [`${name} = ${literal}`, `print(${name}[len(${name}) - 1])`],
        ask: "output",
        expected: [py(values[values.length - 1])],
      };
    default: {
      const i = randomInt(0, values.length - 2);
      const j = randomInt(i + 1, values.length - 1);
      return {
        code: [`${name} = ${literal}`, `print(${name}[${i}] + ${name}[${j}])`],
        ask: "output",
        expected: [py(values[i] + values[j])],
      };
    }
  }
}

function listLoopTask(): Task {
  const name = pick(LIST_NAMES);
  const values = listValues(randomInt(4, 6));
  const literal = `[${values.join(", ")}]`;

  switch (pick(["sum", "max", "count", "each"] as const)) {
    case "sum":
      return {
        code: [
          `${name} = ${literal}`,
          `summe = 0`,
          `for wert in ${name}:`,
          `    summe = summe + wert`,
          `print(summe)`,
        ],
        ask: "output",
        expected: [py(values.reduce((a, b) => a + b, 0))],
      };
    case "max":
      return {
        code: [
          `${name} = ${literal}`,
          `groesster = ${name}[0]`,
          `for wert in ${name}:`,
          `    if wert > groesster:`,
          `        groesster = wert`,
          `print(groesster)`,
        ],
        ask: "output",
        expected: [py(Math.max(...values))],
      };
    case "count": {
      const bound = randomInt(5, 15);
      return {
        code: [
          `${name} = ${literal}`,
          `anzahl = 0`,
          `for wert in ${name}:`,
          `    if wert > ${bound}:`,
          `        anzahl = anzahl + 1`,
          `print(anzahl)`,
        ],
        ask: "output",
        expected: [py(values.filter((value) => value > bound).length)],
      };
    }
    default: {
      const factor = randomInt(2, 5);
      return {
        code: [`${name} = ${literal}`, `for wert in ${name}:`, `    print(wert * ${factor})`],
        ask: "output",
        expected: values.map((value) => py(value * factor)),
      };
    }
  }
}

const listsStage: StageHandler<CodeAnswerQuestion> = {
  id: "lists",

  createQuestions({ settings }) {
    const mode = String(settings.listTasks);
    return build(Number(settings.questionsPerRound), () => {
      if (mode === "index") return indexTask();
      if (mode === "loop") return listLoopTask();
      return Math.random() < 0.5 ? indexTask() : listLoopTask();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// turtle — which picture does this program draw?
// ---------------------------------------------------------------------------

/** Angles that close a regular polygon, so every figure is a finished shape. */
const POLYGON_STEPS: Record<number, number> = { 3: 120, 4: 90, 5: 72, 6: 60, 8: 45, 10: 36, 12: 30 };

function polygonProgram(): TurtleCommand[] {
  const sides = pick([3, 4, 5, 6, 8]);
  const length = pick([60, 80, 100, 120]);
  const turn = pick(["right", "left"] as const);
  return [
    {
      op: "repeat",
      times: sides,
      variable: "i",
      body: [
        { op: "forward", value: length },
        { op: turn, value: POLYGON_STEPS[sides] },
      ],
    },
  ];
}

function starProgram(): TurtleCommand[] {
  const length = pick([100, 120, 150]);
  return [
    {
      op: "repeat",
      times: 5,
      variable: "i",
      body: [
        { op: "forward", value: length },
        { op: "right", value: 144 },
      ],
    },
  ];
}

function stairProgram(): TurtleCommand[] {
  const steps = randomInt(3, 6);
  const size = pick([40, 50, 60]);
  return [
    {
      op: "repeat",
      times: steps,
      variable: "i",
      body: [
        { op: "forward", value: size },
        { op: "left", value: 90 },
        { op: "forward", value: size },
        { op: "right", value: 90 },
      ],
    },
  ];
}

function zigzagProgram(): TurtleCommand[] {
  const steps = randomInt(3, 6);
  const size = pick([50, 60, 70]);
  const angle = pick([45, 60]);
  return [
    {
      op: "repeat",
      times: steps,
      variable: "i",
      body: [
        { op: "left", value: angle },
        { op: "forward", value: size },
        { op: "right", value: 2 * angle },
        { op: "forward", value: size },
        { op: "left", value: angle },
      ],
    },
  ];
}

function spiralProgram(): TurtleCommand[] {
  const steps = randomInt(8, 14);
  const growth = pick([8, 10, 12]);
  const angle = pick([90, 120, 60]);
  return [
    {
      op: "repeat",
      times: steps,
      variable: "i",
      body: [
        { op: "forward", value: { factor: growth, offset: growth, variable: "i" } },
        { op: "right", value: angle },
      ],
    },
  ];
}

/** A ring of dots — a straight chain would look the same however it is scaled. */
function dotRingProgram(): TurtleCommand[] {
  const steps = randomInt(5, 9);
  const gap = pick([40, 50, 60]);
  const size = pick([12, 16, 20]);
  return [
    { op: "penup" },
    {
      op: "repeat",
      times: steps,
      variable: "i",
      body: [
        { op: "dot", value: size },
        { op: "forward", value: gap },
        { op: "right", value: Math.round(360 / steps) },
      ],
    },
  ];
}

/** Dots that grow as the loop runs — the hyperbook's "Punkte werden größer". */
function growingDotsProgram(): TurtleCommand[] {
  const steps = randomInt(5, 8);
  const gap = pick([45, 55, 65]);
  return [
    { op: "penup" },
    {
      op: "repeat",
      times: steps,
      variable: "i",
      body: [
        { op: "dot", value: { factor: 5, offset: 8, variable: "i" } },
        { op: "forward", value: gap },
        { op: "right", value: pick([15, 20, 25]) },
      ],
    },
  ];
}

function rosetteProgram(): TurtleCommand[] {
  const around = pick([4, 5, 6, 8]);
  const length = pick([50, 60, 70]);
  return [
    {
      op: "repeat",
      times: around,
      variable: "i",
      body: [
        {
          op: "repeat",
          times: 4,
          variable: "j",
          body: [
            { op: "forward", value: length },
            { op: "right", value: 90 },
          ],
        },
        { op: "right", value: POLYGON_STEPS[around] },
      ],
    },
  ];
}

const TURTLE_PROGRAMS = [
  polygonProgram,
  starProgram,
  stairProgram,
  zigzagProgram,
  spiralProgram,
  dotRingProgram,
  growingDotsProgram,
  rosetteProgram,
];

function cloneProgram(program: TurtleCommand[]): TurtleCommand[] {
  return JSON.parse(JSON.stringify(program)) as TurtleCommand[];
}

/** Every command of a program, nested bodies included. */
function allCommands(program: TurtleCommand[]): TurtleCommand[] {
  const out: TurtleCommand[] = [];
  const walk = (commands: TurtleCommand[]) => {
    for (const command of commands) {
      out.push(command);
      if (command.op === "repeat") walk(command.body);
    }
  };
  walk(program);
  return out;
}

/** One plausible slip: a different count, a different angle, a turn the other way. */
function mutateProgram(program: TurtleCommand[]): TurtleCommand[] {
  const copy = cloneProgram(program);
  const commands = allCommands(copy);
  const candidates = commands.filter(
    (command) =>
      command.op === "repeat" ||
      command.op === "right" ||
      command.op === "left" ||
      command.op === "forward" ||
      command.op === "dot",
  );
  const target = pick(candidates.length > 0 ? candidates : commands);

  if (target.op === "repeat") {
    // A long loop needs a bigger change to be a different picture: one segment
    // more on a twelve-turn spiral is not something anyone can see.
    const by = target.times > 6 ? pick([-4, -3, 3, 4]) : pick([-2, -1, 1, 2]);
    target.times = Math.max(2, target.times + by);
  } else if (target.op === "right" || target.op === "left") {
    if (Math.random() < 0.5) {
      // A turn in the other direction — the classic left/right mix-up.
      (target as { op: string }).op = target.op === "right" ? "left" : "right";
    } else if (typeof target.value === "number") {
      target.value = Math.max(15, target.value + pick([-60, -45, -30, 30, 45, 60]));
    }
  } else if (target.op === "forward") {
    target.value =
      typeof target.value === "number"
        ? Math.max(20, target.value + pick([-40, -30, 30, 40]))
        : { ...target.value, factor: target.value.factor + pick([-6, -4, 4, 8]) };
  } else if (target.op === "dot") {
    target.value =
      typeof target.value === "number"
        ? Math.max(6, target.value + pick([-8, -6, 8, 12]))
        : { ...target.value, factor: Math.max(0, target.value.factor + pick([-5, -3, 4, 6])) };
  }
  return copy;
}

/**
 * How many of the 24x24 cells two pictures have to disagree on before they
 * count as different pictures. Below this they are the same drawing with a
 * segment moved, and picking between them would be an eye test.
 */
const MIN_DIFFERENT_CELLS = 40;

function turtleQuestion(): Omit<TurtleQuestion, "id"> {
  const program = pick(TURTLE_PROGRAMS)();
  const correct = runTurtle(program);
  const fingerprints = [drawingFingerprint(correct)];
  const wrong: TurtleDrawing[] = [];

  // Keep mutating until three pictures turn up that are different from the
  // right one *and* from each other — a scaled-up square draws the same picture.
  for (let attempt = 0; attempt < 200 && wrong.length < 3; attempt++) {
    const drawing = runTurtle(mutateProgram(program));
    const fingerprint = drawingFingerprint(drawing);
    const distinct = fingerprints.every(
      (other) => fingerprintDistance(fingerprint, other) >= MIN_DIFFERENT_CELLS,
    );
    if (!distinct) continue;
    fingerprints.push(fingerprint);
    wrong.push(drawing);
  }

  const options = shuffle([correct, ...wrong]);
  return { code: toPython(program), options, answerIndex: options.indexOf(correct) };
}

const turtleStage: StageHandler<TurtleQuestion> = {
  id: "turtle",

  createQuestions({ settings }) {
    return build(Number(settings.questionsPerRound), () => turtleQuestion());
  },

  evaluate(question, answer, timing) {
    const correct = Number(answer) === question.answerIndex;
    return { correct, points: correct ? speedPoints(timing.questionMs / 1000, 2, 40) : 0 };
  },
};

// ---------------------------------------------------------------------------
// parsons — put the lines of a program back in order
// ---------------------------------------------------------------------------

interface ParsonsTemplate {
  captionKey: string;
  /** The finished program: text and indent depth per line. */
  lines: { text: string; indent: number }[];
}

function parsonsTemplates(): ParsonsTemplate[] {
  const limit = randomInt(3, 9);
  const values = listValues(4);
  const side = pick([60, 80, 100]);
  const dots = randomInt(4, 7);
  const bound = randomInt(12, 18);

  return [
    {
      captionKey: "games.python.parsons.guess",
      lines: [
        { text: `from random import randint`, indent: 0 },
        { text: `geheim = randint(1, 100)`, indent: 0 },
        { text: `tipp = int(input("Dein Tipp: "))`, indent: 0 },
        { text: `if tipp == geheim:`, indent: 0 },
        { text: `print("Treffer!")`, indent: 1 },
        { text: `else:`, indent: 0 },
        { text: `print("Daneben")`, indent: 1 },
      ],
    },
    {
      captionKey: "games.python.parsons.sum",
      lines: [
        { text: `zahlen = [${values.join(", ")}]`, indent: 0 },
        { text: `summe = 0`, indent: 0 },
        { text: `for zahl in zahlen:`, indent: 0 },
        { text: `summe = summe + zahl`, indent: 1 },
        { text: `print(summe)`, indent: 0 },
      ],
    },
    {
      captionKey: "games.python.parsons.square",
      lines: [
        { text: `from turtle import *`, indent: 0 },
        { text: `def quadrat(laenge):`, indent: 0 },
        { text: `for i in range(4):`, indent: 1 },
        { text: `forward(laenge)`, indent: 2 },
        { text: `right(90)`, indent: 2 },
        { text: `quadrat(${side})`, indent: 0 },
      ],
    },
    {
      captionKey: "games.python.parsons.countdown",
      lines: [
        { text: `i = 1`, indent: 0 },
        { text: `while i <= ${limit}:`, indent: 0 },
        { text: `print(i)`, indent: 1 },
        { text: `i = i + 1`, indent: 1 },
        { text: `print("fertig")`, indent: 0 },
      ],
    },
    {
      captionKey: "games.python.parsons.age",
      lines: [
        { text: `alter = int(input("Alter: "))`, indent: 0 },
        { text: `if alter >= 18:`, indent: 0 },
        { text: `print("volljaehrig")`, indent: 1 },
        { text: `else:`, indent: 0 },
        { text: `print("minderjaehrig")`, indent: 1 },
      ],
    },
    {
      captionKey: "games.python.parsons.dots",
      lines: [
        { text: `from turtle import *`, indent: 0 },
        { text: `penup()`, indent: 0 },
        { text: `for i in range(${dots}):`, indent: 0 },
        { text: `dot(15)`, indent: 1 },
        { text: `forward(40)`, indent: 1 },
      ],
    },
    {
      captionKey: "games.python.parsons.max",
      lines: [
        { text: `zahlen = [${listValues(4).join(", ")}]`, indent: 0 },
        { text: `groesster = zahlen[0]`, indent: 0 },
        { text: `for zahl in zahlen:`, indent: 0 },
        { text: `if zahl > groesster:`, indent: 1 },
        { text: `groesster = zahl`, indent: 2 },
        { text: `print(groesster)`, indent: 0 },
      ],
    },
    {
      captionKey: "games.python.parsons.count",
      lines: [
        { text: `zahlen = [${listValues(5).join(", ")}]`, indent: 0 },
        { text: `anzahl = 0`, indent: 0 },
        { text: `for zahl in zahlen:`, indent: 0 },
        { text: `if zahl > ${bound}:`, indent: 1 },
        { text: `anzahl = anzahl + 1`, indent: 2 },
        { text: `print(anzahl)`, indent: 0 },
      ],
    },
  ];
}

function parsonsQuestion(template: ParsonsTemplate, withIndent: boolean): Omit<ParsonsQuestion, "id"> {
  const order = shuffle(template.lines.map((_, index) => index));
  const lines = order.map((index) => template.lines[index].text);
  const indents = order.map((index) => template.lines[index].indent);
  // solution[position] is the offered card that belongs there.
  const solution = template.lines.map((_, index) => order.indexOf(index));

  return {
    lines,
    indents: withIndent ? null : indents,
    solution,
    solutionIndents: template.lines.map((line) => line.indent),
    captionKey: template.captionKey,
  };
}

function parsonsResult(question: ParsonsQuestion, answer: string): number {
  let parsed: ParsonsAnswer;
  try {
    parsed = JSON.parse(answer) as ParsonsAnswer;
  } catch {
    return 0;
  }
  if (!Array.isArray(parsed?.order)) return 0;

  const wanted = question.solution.map((line) => question.lines[line]);
  const wantedIndents = question.solutionIndents;
  const placed = parsed.order;
  const chosenIndents = Array.isArray(parsed.indents) ? parsed.indents : [];

  let hits = 0;
  for (let position = 0; position < wanted.length; position++) {
    const card = placed[position];
    if (card == null || question.lines[card] == null) continue;
    // Compare the line, not the card: two identical lines are interchangeable.
    if (question.lines[card] !== wanted[position]) continue;
    if (question.indents == null) {
      if (chosenIndents[position] !== wantedIndents[position]) continue;
    }
    hits++;
  }
  return hits / wanted.length;
}

const parsonsStage: StageHandler<ParsonsQuestion> = {
  id: "parsons",

  createQuestions({ settings }) {
    const withIndent = settings.withIndent === true;
    const templates = pickN(parsonsTemplates(), Number(settings.questionsPerRound));
    return build(Number(settings.questionsPerRound), (index) =>
      parsonsQuestion(templates[index], withIndent),
    );
  },

  evaluate(question, answer, timing) {
    const share = parsonsResult(question, answer);
    if (share >= 1) {
      return { correct: true, points: speedPoints(timing.questionMs / 1000, 1, 60) };
    }
    // Most of the lines in the right place is most of the thinking done.
    return { correct: false, points: Math.round(50 * share) };
  },
};

// ---------------------------------------------------------------------------
// bugs — one line is broken; which one?
// ---------------------------------------------------------------------------

interface BugTemplate {
  kind: "syntax" | "semantic";
  build: () => { code: string[]; errorLine: number; reasonKey: string };
}

const BUG_TEMPLATES: BugTemplate[] = [
  {
    kind: "syntax",
    build: () => {
      const bound = randomInt(3, 20);
      return {
        code: [`zahl = ${randomInt(1, 30)}`, `if zahl > ${bound}`, `    print("groesser")`],
        errorLine: 1,
        reasonKey: "games.python.bugs.colon",
      };
    },
  },
  {
    kind: "syntax",
    build: () => ({
      code: [`for i in range(${randomInt(3, 8)}):`, `print(i)`],
      errorLine: 1,
      reasonKey: "games.python.bugs.indent",
    }),
  },
  {
    kind: "syntax",
    build: () => {
      const value = randomInt(2, 40);
      return {
        code: [`zahl = ${value}`, `print(zahl * 2`, `print("fertig")`],
        errorLine: 1,
        reasonKey: "games.python.bugs.bracket",
      };
    },
  },
  {
    kind: "syntax",
    build: () => ({
      code: [`name = "Ada"`, `Print(name)`],
      errorLine: 1,
      reasonKey: "games.python.bugs.case",
    }),
  },
  {
    kind: "syntax",
    build: () => ({
      code: [`ist_fertig = true`, `if ist_fertig:`, `    print("fertig")`],
      errorLine: 0,
      reasonKey: "games.python.bugs.boolean",
    }),
  },
  {
    kind: "syntax",
    build: () => ({
      code: [`from turtle import *`, `farbe = red`, `pencolor(farbe)`],
      errorLine: 1,
      reasonKey: "games.python.bugs.quotes",
    }),
  },
  {
    kind: "syntax",
    build: () => {
      const value = randomInt(1, 9);
      return {
        code: [`zahl = ${randomInt(1, 9)}`, `if zahl = ${value}:`, `    print("Treffer")`],
        errorLine: 1,
        reasonKey: "games.python.bugs.compare",
      };
    },
  },
  {
    kind: "syntax",
    build: () => ({
      code: [`meine zahl = ${randomInt(2, 30)}`, `print(meine zahl)`],
      errorLine: 0,
      reasonKey: "games.python.bugs.name",
    }),
  },
  {
    kind: "syntax",
    build: () => ({
      code: [
        `def gruessen(name):`,
        `    print("Hallo " + name)`,
        ``,
        `gruessen"Ada"`,
      ],
      errorLine: 3,
      reasonKey: "games.python.bugs.call",
    }),
  },
  {
    kind: "semantic",
    build: () => ({
      code: [`zahl = int(input("Zahl: "))`, `print("Das Doppelte ist: " + zahl * 2)`],
      errorLine: 1,
      reasonKey: "games.python.bugs.concat",
    }),
  },
  {
    kind: "semantic",
    build: () => ({
      code: [`print(summe)`, `summe = ${randomInt(5, 40)}`],
      errorLine: 0,
      reasonKey: "games.python.bugs.undefined",
    }),
  },
  {
    kind: "semantic",
    build: () => {
      const limit = randomInt(5, 12);
      return {
        code: [`i = 1`, `while i < ${limit}:`, `    print(i)`, `    i = i - 1`],
        errorLine: 3,
        reasonKey: "games.python.bugs.endless",
      };
    },
  },
  {
    kind: "semantic",
    build: () => {
      const values = listValues(3);
      return {
        code: [`zahlen = [${values.join(", ")}]`, `print(zahlen[3])`],
        errorLine: 1,
        reasonKey: "games.python.bugs.index",
      };
    },
  },
  {
    kind: "semantic",
    build: () => {
      const values = listValues(4);
      return {
        code: [
          `zahlen = [${values.join(", ")}]`,
          `for i in range(len(zahlen) + 1):`,
          `    print(zahlen[i])`,
        ],
        errorLine: 1,
        reasonKey: "games.python.bugs.range",
      };
    },
  },
  {
    kind: "semantic",
    build: () => {
      const side = pick([50, 60, 80]);
      return {
        code: [
          `from turtle import *`,
          `quadrat(${side})`,
          ``,
          `def quadrat(laenge):`,
          `    for i in range(4):`,
          `        forward(laenge)`,
          `        right(90)`,
        ],
        errorLine: 1,
        reasonKey: "games.python.bugs.order",
      };
    },
  },
];

const bugsStage: StageHandler<BugQuestion> = {
  id: "bugs",

  createQuestions({ settings }) {
    const mode = String(settings.bugTasks);
    const pool =
      mode === "mixed" ? BUG_TEMPLATES : BUG_TEMPLATES.filter((template) => template.kind === mode);
    const templates = pickN(pool.length > 0 ? pool : BUG_TEMPLATES, Number(settings.questionsPerRound));
    return build(Number(settings.questionsPerRound), (index) => templates[index].build());
  },

  evaluate(question, answer, timing) {
    const correct = Number(answer) === question.errorLine;
    return { correct, points: correct ? speedPoints(timing.questionMs / 1000, 2, 40) : 0 };
  },
};

export default createStageGame(pythonSpec, [
  outputStage,
  variablesStage,
  loopsStage,
  branchStage,
  logicStage,
  functionsStage,
  listsStage,
  turtleStage,
  parsonsStage,
  bugsStage,
] as StageHandler[]);
