// Java — UV-INF-EF-02 bis EF-VI, "Grundlagen der Programmierung mit Java".
//
// Every station asks the player to be the machine: read a listing and say what
// it does. The programs are generated rather than drawn from a pool, so a
// course can play a station twice without meeting the same question, and they
// stay inside the Java of the hyperbook's Lernpfad — `void main()` and
// `IO.println`, the four primitive types, arrays, and nothing else.
//
// Two things make Java different from the Python game and shape most of the
// generators: `7 / 3` is 2, and `"Summe: " + a + b` glues instead of adding.

import { javaSpec } from "../../shared/games/java";
import type {
  BugQuestion,
  CodeAnswerQuestion,
  CodeChoiceQuestion,
  LogicQuestion,
  StructogramQuestion,
} from "../../shared/games/java";
import { answerMatches, sequenceMatches, sequenceScore } from "../../shared/code-answer";
import {
  intDiv,
  intMod,
  javaBoolean,
  javaDouble,
  javaInt,
  EXACT_DIVISORS,
} from "../../shared/java-code";
import {
  cloneStructogram,
  structogramSignature,
  structogramSize,
  type Structogram,
  type StructogramNode,
} from "../../shared/java-structogram";
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

/** Wraps a body in the main method every listing of the Lernpfad starts with. */
function main(...body: string[]): string[] {
  return ["void main() {", ...body.map((line) => (line === "" ? "" : `    ${line}`)), "}"];
}

const INT_NAMES = ["zahl", "wert", "punkte", "anzahl", "laenge", "breite", "hoehe", "alter"];
const ARRAY_NAMES = ["punkte", "werte", "zeiten", "preise", "noten"];
const FLAG_NAMES = ["istFertig", "hatTicket", "sonneScheint", "istOffen", "bestanden"];

// ---------------------------------------------------------------------------
// Grading shared by the six "read it and type the answer" stations
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
type ChoiceTask = Omit<CodeChoiceQuestion, "id">;
/** A logic question is a union, so its generators number themselves. */
type LogicTask = (id: number) => LogicQuestion;

// ---------------------------------------------------------------------------
// output — Kapitel 1.2: die Grundrechenarten, und was / und % wirklich tun
// ---------------------------------------------------------------------------

function basicArithmeticTask(): Task {
  switch (pick(["chain", "product", "precedence", "brackets", "negative", "two"] as const)) {
    case "chain": {
      const a = randomInt(1, 40);
      const b = randomInt(2, 20);
      const c = randomInt(2, 20);
      const d = randomInt(5, 50);
      return {
        code: main(`IO.println(${a} + ${b} - ${c} + ${d});`),
        ask: "output",
        expected: [javaInt(a + b - c + d)],
      };
    }
    case "product": {
      const a = randomInt(3, 19);
      const b = randomInt(3, 12);
      return { code: main(`IO.println(${a} * ${b});`), ask: "output", expected: [javaInt(a * b)] };
    }
    case "precedence": {
      const a = randomInt(2, 30);
      const b = randomInt(2, 9);
      const c = randomInt(2, 9);
      return {
        code: main(`IO.println(${a} + ${b} * ${c});`),
        ask: "output",
        expected: [javaInt(a + b * c)],
      };
    }
    case "brackets": {
      const a = randomInt(2, 20);
      const b = randomInt(2, 12);
      const c = randomInt(2, 6);
      return {
        code: main(`IO.println((${a} + ${b}) * ${c});`),
        ask: "output",
        expected: [javaInt((a + b) * c)],
      };
    }
    case "negative": {
      const a = randomInt(2, 12);
      const b = randomInt(a + 1, 20);
      const c = randomInt(2, 12);
      const d = randomInt(2, 12);
      return {
        code: main(`IO.println((${a} - ${b}) * (${c} + ${d}));`),
        ask: "output",
        expected: [javaInt((a - b) * (c + d))],
      };
    }
    default: {
      // Two statements, so the answer is a sequence and the order matters.
      const a = randomInt(4, 20);
      const b = randomInt(2, 9);
      return {
        code: main(`IO.println(${a} * ${b});`, `IO.println(${a} + ${b} * 2);`),
        ask: "output",
        expected: [javaInt(a * b), javaInt(a + b * 2)],
      };
    }
  }
}

function divisionTask(): Task {
  switch (pick(["trio", "intDivision", "modulo", "lastDigit", "clock", "mixedTypes"] as const)) {
    case "trio": {
      // The three lines of the Lernpfad, one after the other.
      const b = randomInt(3, 9);
      const a = randomInt(2 * b + 1, 99);
      return {
        code: main(`IO.println(${a} / ${b});`, `IO.println(${a} % ${b});`),
        ask: "output",
        expected: [javaInt(intDiv(a, b)), javaInt(intMod(a, b))],
      };
    }
    case "intDivision": {
      const b = randomInt(3, 12);
      const a = randomInt(2 * b + 1, 200);
      return {
        code: main(`IO.println(${a} / ${b});`),
        ask: "output",
        expected: [javaInt(intDiv(a, b))],
      };
    }
    case "modulo": {
      const b = randomInt(3, 12);
      const a = randomInt(2 * b + 1, 200);
      return {
        code: main(`IO.println(${a} % ${b});`),
        ask: "output",
        expected: [javaInt(intMod(a, b))],
      };
    }
    case "lastDigit": {
      // "Welche Ziffer bekommst du mit % 10?" — and the digit before it.
      const value = randomInt(1000, 9999);
      return {
        code: main(`IO.println(${value} % 10);`, `IO.println(${value} / 10);`),
        ask: "output",
        expected: [javaInt(intMod(value, 10)), javaInt(intDiv(value, 10))],
      };
    }
    case "clock": {
      // Sekunden in Minuten und Sekunden — the Alltagsbeispiel the SILP asks for.
      const total = randomInt(100, 3000);
      return {
        code: main(
          `int gesamt = ${total};`,
          `IO.println(gesamt / 60);`,
          `IO.println(gesamt % 60);`,
        ),
        ask: "output",
        expected: [javaInt(intDiv(total, 60)), javaInt(intMod(total, 60))],
      };
    }
    default: {
      // One double is enough to make Java divide properly again.
      const b = pick(EXACT_DIVISORS);
      const a = randomInt(b + 1, 5 * b - 1);
      return {
        code: main(`IO.println(${a} / ${b});`, `IO.println(${a} / ${b}.0);`),
        ask: "output",
        expected: [javaInt(intDiv(a, b)), javaDouble(a / b)],
      };
    }
  }
}

const outputStage: StageHandler<CodeAnswerQuestion> = {
  id: "output",

  createQuestions({ settings }) {
    const mode = String(settings.arithmeticTasks);
    return build(Number(settings.questionsPerRound), () => {
      if (mode === "basic") return basicArithmeticTask();
      if (mode === "division") return divisionTask();
      return Math.random() < 0.5 ? basicArithmeticTask() : divisionTask();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// types — Kapitel 2.2: int gegen double, char gegen String, und das Pluszeichen
// ---------------------------------------------------------------------------

/**
 * A generator names the right answer rather than its position; `asChoice`
 * shuffles the options and looks the position up afterwards, so no generator
 * has to keep an index and a list in step.
 */
interface ChoiceDraft {
  code: string[];
  promptKey: string;
  promptArg?: string;
  answer: string;
  wrong: string[];
  reasonKey?: string;
}

function asChoice(draft: ChoiceDraft): ChoiceTask {
  // A distractor that happens to equal the answer would make two options right.
  const distractors = [...new Set(draft.wrong.filter((option) => option !== draft.answer))];
  const options = shuffle([draft.answer, ...distractors.slice(0, 3)]);
  return {
    code: draft.code,
    promptKey: draft.promptKey,
    promptArg: draft.promptArg,
    options,
    answerIndex: options.indexOf(draft.answer),
    reasonKey: draft.reasonKey,
  };
}

/** Four outputs to choose between, because `9` and `9.0` are different answers. */
function numberTypeTask(): ChoiceDraft {
  switch (pick(["mixed", "intDivision", "cast", "round"] as const)) {
    case "mixed": {
      const ganz = randomInt(3, 30);
      const komma = pick([2.0, 4.0, 5.0, 0.5, 2.5]);
      return {
        code: main(
          `int ganz = ${ganz};`,
          `double komma = ${javaDouble(komma)};`,
          `IO.println(ganz + komma);`,
        ),
        promptKey: "games.java.prompt.output",
        answer: javaDouble(ganz + komma),
        wrong: [javaInt(ganz + komma), `${ganz}${javaDouble(komma)}`, javaDouble(ganz - komma)],
        reasonKey: "games.java.why.widening",
      };
    }
    case "intDivision": {
      const b = randomInt(3, 9);
      const a = randomInt(b + 1, 5 * b - 1);
      return {
        code: main(`int punkte = ${a};`, `int maximum = ${b};`, `IO.println(punkte / maximum);`),
        promptKey: "games.java.prompt.output",
        answer: javaInt(intDiv(a, b)),
        wrong: [
          javaDouble(Math.round((a / b) * 100) / 100),
          javaDouble(intDiv(a, b)),
          javaInt(intMod(a, b)),
        ],
        reasonKey: "games.java.why.intDivision",
      };
    }
    case "cast": {
      const b = pick(EXACT_DIVISORS);
      const a = randomInt(b + 1, 4 * b - 1);
      return {
        code: main(
          `int punkte = ${a};`,
          `int maximum = ${b};`,
          `IO.println((double) punkte / maximum);`,
        ),
        promptKey: "games.java.prompt.output",
        answer: javaDouble(a / b),
        wrong: [javaInt(intDiv(a, b)), javaDouble(intDiv(a, b)), javaDouble(Math.round(a / b))],
        reasonKey: "games.java.why.cast",
      };
    }
    default: {
      const whole = randomInt(2, 30);
      const value = whole + pick([0.25, 0.4, 0.5, 0.75, 0.99]);
      const which = pick(["cut", "round"] as const);
      return {
        code: main(
          `double genau = ${javaDouble(value)};`,
          which === "cut" ? `IO.println((int) genau);` : `IO.println(Math.round(genau));`,
        ),
        promptKey: "games.java.prompt.output",
        answer: javaInt(which === "cut" ? Math.trunc(value) : Math.round(value)),
        wrong: [
          javaInt(which === "cut" ? Math.round(value) : Math.trunc(value)),
          javaDouble(value),
          javaDouble(Math.trunc(value)),
        ],
        reasonKey: which === "cut" ? "games.java.why.truncate" : "games.java.why.round",
      };
    }
  }
}

/** The `+` that glues: `"Ergebnis: " + ganz + 2`. */
function stringTypeTask(): ChoiceDraft {
  switch (pick(["concat", "bracketed", "text"] as const)) {
    case "concat": {
      const a = randomInt(2, 40);
      const b = randomInt(2, 9);
      return {
        code: main(`int ganz = ${a};`, `IO.println("Ergebnis: " + ganz + ${b});`),
        promptKey: "games.java.prompt.output",
        answer: `Ergebnis: ${a}${b}`,
        wrong: [`Ergebnis: ${a + b}`, `Ergebnis: ${a} ${b}`, `Ergebnis: ${a}+${b}`],
        reasonKey: "games.java.why.concat",
      };
    }
    case "bracketed": {
      const a = randomInt(2, 40);
      const b = randomInt(2, 9);
      return {
        code: main(`int ganz = ${a};`, `IO.println("Ergebnis: " + (ganz + ${b}));`),
        promptKey: "games.java.prompt.output",
        answer: `Ergebnis: ${a + b}`,
        wrong: [`Ergebnis: ${a}${b}`, `Ergebnis: ${a} + ${b}`, `Ergebnis: ${a}`],
        reasonKey: "games.java.why.bracketed",
      };
    }
    default: {
      // Kapitel 2.4: gezählt wird ab 0, und substring endet *vor* der Position.
      const word = pick(["Informatik", "Struktogramm", "Datentyp", "Schleife"]);
      const index = randomInt(1, 4);
      switch (pick(["charAt", "length", "substring"] as const)) {
        case "charAt":
          return {
            code: main(`String wort = "${word}";`, `IO.println(wort.charAt(${index}));`),
            promptKey: "games.java.prompt.output",
            answer: word.charAt(index),
            wrong: [word.charAt(index - 1), word.charAt(index + 1), word.charAt(0)],
            reasonKey: "games.java.why.zeroIndex",
          };
        case "length":
          return {
            code: main(`String wort = "${word}";`, `IO.println(wort.length());`),
            promptKey: "games.java.prompt.output",
            answer: String(word.length),
            wrong: [String(word.length - 1), String(word.length + 1), word.charAt(0)],
            reasonKey: "games.java.why.length",
          };
        default:
          return {
            code: main(`String wort = "${word}";`, `IO.println(wort.substring(0, ${index}));`),
            promptKey: "games.java.prompt.output",
            answer: word.substring(0, index),
            wrong: [word.substring(0, index + 1), word.substring(1, index + 1), word.charAt(index)],
            reasonKey: "games.java.why.substring",
          };
      }
    }
  }
}

/** Cases for "welcher Datentyp passt?", keyed under `games.java.typeOf`. */
const TYPE_CASES: { key: string; type: string }[] = [
  { key: "students", type: "int" },
  { key: "grade", type: "double" },
  { key: "passed", type: "boolean" },
  { key: "initial", type: "char" },
  { key: "name", type: "String" },
  { key: "price", type: "double" },
  { key: "index", type: "int" },
  { key: "open", type: "boolean" },
  { key: "city", type: "String" },
  { key: "seconds", type: "int" },
];

const ALL_TYPES = ["int", "double", "boolean", "char", "String"];

/** "Welcher Datentyp passt?" — the M-Kompetenz the KLP names for the EF. */
function namingTask(): ChoiceDraft {
  const wanted = pick(TYPE_CASES);
  return {
    code: [],
    promptKey: "games.java.prompt.type",
    promptArg: wanted.key,
    answer: wanted.type,
    wrong: shuffle(ALL_TYPES.filter((type) => type !== wanted.type)),
    reasonKey: `games.java.typeOf.${wanted.key}`,
  };
}

const typesStage: StageHandler<CodeChoiceQuestion> = {
  id: "types",

  createQuestions({ settings }) {
    const mode = String(settings.typeTasks);
    return build(Number(settings.questionsPerRound), () => {
      if (mode === "numbers") return asChoice(numberTypeTask());
      if (mode === "strings") return asChoice(stringTypeTask());
      if (mode === "naming") return asChoice(namingTask());
      const roll = Math.random();
      if (roll < 0.2) return asChoice(namingTask());
      return asChoice(roll < 0.6 ? numberTypeTask() : stringTypeTask());
    });
  },

  evaluate: (question, answer, timing) => gradeChoice(question.answerIndex, answer, timing),
};

// ---------------------------------------------------------------------------
// variables — Kapitel 2.1: das Whiteboard, und was a = a + 1 bedeutet
// ---------------------------------------------------------------------------

function assignmentTask(withShorthand: boolean): Task {
  const [first, second] = shuffle(INT_NAMES).slice(0, 2);
  const values: Record<string, number> = {};
  const code: string[] = [];

  values[first] = randomInt(2, 20);
  code.push(`int ${first} = ${values[first]};`);
  values[second] = randomInt(2, 20);
  code.push(`int ${second} = ${values[second]};`);

  // Two or three steps, at least one of them overwriting a variable with itself.
  const steps = randomInt(2, 3);
  const touched = new Set<string>();
  for (let i = 0; i < steps; i++) {
    const target = pick([first, second]);
    touched.add(target);
    const other = target === first ? second : first;
    const forms = withShorthand
      ? (["self", "other", "plusEquals", "increment", "timesEquals"] as const)
      : (["self", "other", "double"] as const);
    switch (pick(forms)) {
      case "self": {
        const delta = randomInt(2, 15);
        const op = pick(["+", "-"] as const);
        values[target] = op === "+" ? values[target] + delta : values[target] - delta;
        code.push(`${target} = ${target} ${op} ${delta};`);
        break;
      }
      case "other": {
        const delta = randomInt(2, 12);
        values[target] = values[other] + delta;
        code.push(`${target} = ${other} + ${delta};`);
        break;
      }
      case "plusEquals": {
        const delta = randomInt(2, 15);
        values[target] += delta;
        code.push(`${target} += ${delta};`);
        break;
      }
      case "increment": {
        const op = pick(["++", "--"] as const);
        values[target] += op === "++" ? 1 : -1;
        code.push(`${target}${op};`);
        break;
      }
      case "timesEquals": {
        const factor = randomInt(2, 4);
        values[target] *= factor;
        code.push(`${target} *= ${factor};`);
        break;
      }
      default: {
        const factor = randomInt(2, 4);
        values[target] *= factor;
        code.push(`${target} = ${target} * ${factor};`);
        break;
      }
    }
  }

  // Asking about the variable nobody touched would be a question about line 1.
  const asked = pick([...touched]);
  if (Math.random() < 0.5) {
    return {
      code: main(...code, `IO.println(${asked});`),
      ask: "output",
      expected: [javaInt(values[asked])],
    };
  }
  return { code: main(...code), ask: "value", askArg: asked, expected: [javaInt(values[asked])] };
}

/** Tauschen mit Hilfsvariable — the Zusatzaufgabe of Kapitel 2.1. */
function swapTask(): Task {
  const [a, b] = shuffle(["a", "b", "links", "rechts"]).slice(0, 2);
  const first = randomInt(2, 30);
  const second = randomInt(2, 30);
  const broken = Math.random() < 0.3;
  const code = broken
    ? [`int ${a} = ${first};`, `int ${b} = ${second};`, `${a} = ${b};`, `${b} = ${a};`]
    : [
        `int ${a} = ${first};`,
        `int ${b} = ${second};`,
        `int hilf = ${a};`,
        `${a} = ${b};`,
        `${b} = hilf;`,
      ];
  // The two-line version loses the first value — that is exactly the point.
  const expected = broken ? [second, second] : [second, first];
  return {
    code: main(...code, `IO.println(${a});`, `IO.println(${b});`),
    ask: "output",
    expected: expected.map(javaInt),
  };
}

/** Reading a value in and computing with it — Kapitel 2.3. */
function inputTask(): Task {
  const typed = randomInt(11, 49);
  const factor = randomInt(2, 5);
  return {
    code: main(
      `String eingabe = IO.readln("Zahl: ");`,
      `int zahl = Integer.parseInt(eingabe);`,
      `IO.println(zahl * ${factor});`,
    ),
    ask: "output",
    expected: [javaInt(typed * factor)],
    noteKey: "games.java.note.input",
    noteArg: String(typed),
  };
}

const variablesStage: StageHandler<CodeAnswerQuestion> = {
  id: "variables",

  createQuestions({ settings }) {
    const withShorthand = settings.withShorthand === true;
    return build(Number(settings.questionsPerRound), () => {
      const roll = Math.random();
      if (roll < 0.2) return swapTask();
      if (roll < 0.35) return inputTask();
      return assignmentTask(withShorthand);
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// logic — Kapitel 3.2: &&, ||, ! und ihre Rangfolge
// ---------------------------------------------------------------------------

const literalLogicTask: LogicTask = (id) => {
  const value = () => Math.random() < 0.5;

  switch (pick(["pair", "notPair", "triple", "compare"] as const)) {
    case "pair": {
      const a = value();
      const b = value();
      const op = pick(["&&", "||"] as const);
      return {
        id,
        kind: "value",
        code: [],
        expression: `${javaBoolean(a)} ${op} ${javaBoolean(b)}`,
        answer: op === "&&" ? a && b : a || b,
      };
    }
    case "notPair": {
      const a = value();
      const b = value();
      const op = pick(["&&", "||"] as const);
      return {
        id,
        kind: "value",
        code: [],
        expression: `!${javaBoolean(a)} ${op} ${javaBoolean(b)}`,
        answer: op === "&&" ? !a && b : !a || b,
      };
    }
    case "triple": {
      const a = value();
      const b = value();
      const c = value();
      // `&&` binds tighter than `||` — the whole point of the Rangfolge.
      return {
        id,
        kind: "value",
        code: [],
        expression: `${javaBoolean(a)} || ${javaBoolean(b)} && ${javaBoolean(c)}`,
        answer: a || (b && c),
      };
    }
    default: {
      const a = randomInt(1, 30);
      const b = randomInt(1, 30);
      const op = pick(["==", "!=", "<", ">", "<=", ">="] as const);
      const answer =
        op === "=="
          ? a === b
          : op === "!="
            ? a !== b
            : op === "<"
              ? a < b
              : op === ">"
                ? a > b
                : op === "<="
                  ? a <= b
                  : a >= b;
      return { id, kind: "value", code: [], expression: `${a} ${op} ${b}`, answer };
    }
  }
};

const variableLogicTask: LogicTask = (id) => {
  const number = pick(INT_NAMES);
  const flag = pick(FLAG_NAMES);
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

  const code = [`int ${number} = ${numberValue};`, `boolean ${flag} = ${javaBoolean(flagValue)};`];

  switch (pick(["and", "or", "not", "notFlag"] as const)) {
    case "and":
      return {
        id,
        kind: "value",
        code,
        expression: `${number} ${op} ${bound} && ${flag}`,
        answer: comparison && flagValue,
      };
    case "or":
      return {
        id,
        kind: "value",
        code,
        expression: `${number} ${op} ${bound} || ${flag}`,
        answer: comparison || flagValue,
      };
    case "not":
      return {
        id,
        kind: "value",
        code,
        expression: `!(${number} ${op} ${bound})`,
        answer: !comparison,
      };
    default:
      return {
        id,
        kind: "value",
        code,
        expression: `${number} ${op} ${bound} && !${flag}`,
        answer: comparison && !flagValue,
      };
  }
};

/** "Wie setzt Java die Klammern?" — one right reading, three plausible ones. */
const BRACKET_PATTERNS: { expression: string; correct: string; wrong: string[] }[] = [
  {
    expression: "!a && b || c",
    correct: "((!a) && b) || c",
    wrong: ["!(a && (b || c))", "(!(a && b)) || c", "!((a && b) || c)"],
  },
  {
    expression: "!a || b && c",
    correct: "(!a) || (b && c)",
    wrong: ["!(a || (b && c))", "((!a) || b) && c", "!((a || b) && c)"],
  },
  {
    expression: "a && !b || c",
    correct: "(a && (!b)) || c",
    wrong: ["a && ((!b) || c)", "a && !(b || c)", "!((a && b) || c)"],
  },
  {
    expression: "a || b && !c",
    correct: "a || (b && (!c))",
    wrong: ["(a || b) && (!c)", "a || !(b && c)", "((a || b) && b) && !c"],
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
    const mode = String(settings.boolTasks);
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
// branch — Kapitel 3.1: if / else if / else, und warum die Reihenfolge zählt
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
    variable: "guthaben",
    levels: [
      { at: 200, text: "Premium" },
      { at: 120, text: "Plus" },
      { at: 60, text: "Basis" },
      { at: 20, text: "Probe" },
    ],
    elseText: "gesperrt",
    min: 0,
    max: 250,
  },
];

function branchTask(branchCount: number): ChoiceDraft {
  const topic = pick(BRANCH_TOPICS);
  const levels = topic.levels.slice(0, branchCount);
  // Every fourth question puts the widest condition first: it swallows all the
  // others, which is exactly the trap "prüfe immer erst die engste Bedingung".
  const trap = Math.random() < 0.25;
  const ordered = trap ? [...levels].reverse() : levels;
  const withElse = Math.random() < 0.75;
  const value = randomInt(topic.min, topic.max);

  const code = [`int ${topic.variable} = ${value};`];
  ordered.forEach((level, index) => {
    code.push(`${index === 0 ? "if" : "} else if"} (${topic.variable} >= ${level.at}) {`);
    code.push(`    IO.println("${level.text}");`);
  });
  if (withElse) {
    code.push(`} else {`);
    code.push(`    IO.println("${topic.elseText}");`);
  }
  code.push(`}`);

  const hit = ordered.find((level) => value >= level.at);
  const answer = hit ? hit.text : withElse ? topic.elseText : "";
  const wrong = ordered.map((level) => level.text);
  if (withElse) wrong.push(topic.elseText);
  // "keine Ausgabe" is an option whenever the chain can fall through.
  if (!withElse) wrong.push("");

  return {
    code: main(...code),
    promptKey: "games.java.prompt.output",
    answer,
    wrong: shuffle(wrong),
  };
}

/** A condition built from && and ||, so the Rangfolge decides the branch. */
function compoundBranchTask(): ChoiceDraft {
  const alter = randomInt(12, 22);
  const hatTicket = Math.random() < 0.5;
  const code = [
    `int alter = ${alter};`,
    `boolean hatTicket = ${javaBoolean(hatTicket)};`,
    `if (alter >= 18 && hatTicket) {`,
    `    IO.println("Einlass");`,
    `} else if (alter >= 16 || hatTicket) {`,
    `    IO.println("nur bis 22 Uhr");`,
    `} else {`,
    `    IO.println("kein Einlass");`,
    `}`,
  ];
  const answer =
    alter >= 18 && hatTicket
      ? "Einlass"
      : alter >= 16 || hatTicket
        ? "nur bis 22 Uhr"
        : "kein Einlass";
  return {
    code: main(...code),
    promptKey: "games.java.prompt.output",
    answer,
    wrong: ["Einlass", "nur bis 22 Uhr", "kein Einlass", ""],
  };
}

/** Strings are compared with equals(), never with == — Kapitel 2.4. */
function equalsBranchTask(): ChoiceDraft {
  const typed = pick(["ja", "nein", "vielleicht"]);
  // The value is written out rather than read in: the question is what equals
  // decides, not what somebody typed into a box the player cannot see.
  const code = [
    `String eingabe = "${typed}";`,
    `if (eingabe.equals("ja")) {`,
    `    IO.println("los geht es");`,
    `} else {`,
    `    IO.println("abgebrochen");`,
    `}`,
  ];
  return {
    code: main(...code),
    promptKey: "games.java.prompt.output",
    answer: typed === "ja" ? "los geht es" : "abgebrochen",
    wrong: ["los geht es", "abgebrochen", "", typed],
    reasonKey: "games.java.why.equals",
  };
}

const branchStage: StageHandler<CodeChoiceQuestion> = {
  id: "branch",

  createQuestions({ settings }) {
    const branchCount = Number(settings.branchCount);
    const withCompound = settings.withCompoundConditions === true;
    return build(Number(settings.questionsPerRound), () => {
      if (withCompound && Math.random() < 0.4) return asChoice(compoundBranchTask());
      if (Math.random() < 0.12) return asChoice(equalsBranchTask());
      return asChoice(branchTask(branchCount));
    });
  },

  evaluate: (question, answer, timing) => gradeChoice(question.answerIndex, answer, timing),
};

// ---------------------------------------------------------------------------
// loops — Kapitel 3.3 bis 3.6: while, for, do-while und Verschachtelung
// ---------------------------------------------------------------------------

function forTask(): Task {
  const from = pick([0, 1]);
  const to = from + randomInt(3, 5);
  const header = `for (int i = ${from}; i < ${to}; i++) {`;
  const values: number[] = [];
  for (let i = from; i < to; i++) values.push(i);

  switch (pick(["plain", "scaled", "shifted", "sum", "count"] as const)) {
    case "plain":
      return {
        code: main(header, `    IO.println(i);`, `}`),
        ask: "output",
        expected: values.map(javaInt),
      };
    case "scaled": {
      const factor = randomInt(2, 9);
      return {
        code: main(header, `    IO.println(i * ${factor});`, `}`),
        ask: "output",
        expected: values.map((i) => javaInt(i * factor)),
      };
    }
    case "shifted": {
      const offset = randomInt(2, 20);
      return {
        code: main(header, `    IO.println(i + ${offset});`, `}`),
        ask: "output",
        expected: values.map((i) => javaInt(i + offset)),
      };
    }
    case "sum": {
      const name = pick(["summe", "gesamt"]);
      const total = values.reduce((a, b) => a + b, 0);
      return {
        code: main(
          `int ${name} = 0;`,
          header,
          `    ${name} = ${name} + i;`,
          `}`,
          `IO.println(${name});`,
        ),
        ask: "output",
        expected: [javaInt(total)],
      };
    }
    default: {
      // A counting head with a "<=", which runs one pass more than it looks.
      const start = randomInt(1, 8);
      const end = start + randomInt(3, 9);
      return {
        code: main(
          `for (int i = ${start}; i <= ${end}; i++) {`,
          `    IO.println("Durchlauf");`,
          `}`,
        ),
        ask: "count",
        expected: [javaInt(end - start + 1)],
      };
    }
  }
}

function whileTask(): Task {
  switch (pick(["double", "countdown", "count"] as const)) {
    case "double": {
      const limit = pick([20, 50, 100, 200, 1000]);
      let value = 1;
      while (value < limit) value = value * 2;
      return {
        code: main(
          `int zahl = 1;`,
          `while (zahl < ${limit}) {`,
          `    zahl = zahl * 2;`,
          `}`,
          `IO.println(zahl);`,
        ),
        ask: "output",
        expected: [javaInt(value)],
      };
    }
    case "countdown": {
      const step = pick([7, 15, 20, 30]);
      const start = step * randomInt(3, 6) + randomInt(0, step - 1);
      const floor = randomInt(5, 15);
      let value = start;
      while (value > floor) value = value - step;
      return {
        code: main(
          `int rest = ${start};`,
          `while (rest > ${floor}) {`,
          `    rest = rest - ${step};`,
          `}`,
          `IO.println(rest);`,
        ),
        ask: "output",
        expected: [javaInt(value)],
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
        code: main(`int wert = 0;`, `while (wert < ${limit}) {`, `    wert = wert + ${step};`, `}`),
        ask: "count",
        expected: [javaInt(runs)],
      };
    }
  }
}

/**
 * The one contrast Kapitel 3.5 is built around: the same condition and the same
 * body, once in the head and once in the foot. With a condition that is false
 * from the start, `while` runs zero times and `do-while` runs once.
 */
function doWhileTask(): Task {
  const start = randomInt(20, 200);
  const limit = randomInt(1, 10);
  const foot = Math.random() < 0.6;
  if (foot) {
    // The condition is false from the very start, so a `while` would print
    // nothing at all — the foot-controlled loop still prints once.
    return {
      code: main(
        `int i = ${start};`,
        `do {`,
        `    IO.println(i);`,
        `    i++;`,
        `} while (i < ${limit});`,
      ),
      ask: "output",
      expected: [javaInt(start)],
    };
  }
  // A do-while whose condition does hold for a while: count the passes.
  const step = pick([3, 4, 5]);
  const bound = step * randomInt(3, 6);
  let value = 0;
  let runs = 0;
  do {
    value += step;
    runs++;
  } while (value < bound);
  return {
    code: main(
      `int wert = 0;`,
      `do {`,
      `    wert = wert + ${step};`,
      `} while (wert < ${bound});`,
      `IO.println(wert);`,
    ),
    ask: "output",
    expected: [javaInt(value)],
  };
}

function nestedTask(): Task {
  const outer = randomInt(2, 5);
  const inner = randomInt(2, 6);
  if (Math.random() < 0.5) {
    return {
      code: main(
        `for (int i = 0; i < ${outer}; i++) {`,
        `    for (int j = 0; j < ${inner}; j++) {`,
        `        IO.print("*");`,
        `    }`,
        `    IO.println();`,
        `}`,
      ),
      ask: "count",
      expected: [javaInt(outer * inner)],
    };
  }
  // The multiplication in numbers, not in stars.
  const lines: string[] = [];
  for (let i = 1; i <= outer; i++) lines.push(javaInt(i * inner));
  return {
    code: main(
      `for (int i = 1; i <= ${outer}; i++) {`,
      `    int summe = 0;`,
      `    for (int j = 0; j < ${inner}; j++) {`,
      `        summe = summe + i;`,
      `    }`,
      `    IO.println(summe);`,
      `}`,
    ),
    ask: "output",
    expected: lines,
  };
}

const loopsStage: StageHandler<CodeAnswerQuestion> = {
  id: "loops",

  createQuestions({ settings }) {
    const mode = String(settings.loopKind);
    const nested = settings.withNestedLoops === true;
    return build(Number(settings.questionsPerRound), () => {
      if (mode === "for") return nested && Math.random() < 0.3 ? nestedTask() : forTask();
      if (mode === "while") return whileTask();
      if (mode === "doWhile") return doWhileTask();
      const roll = Math.random();
      if (nested && roll < 0.2) return nestedTask();
      if (roll < 0.4) return whileTask();
      if (roll < 0.55) return doWhileTask();
      return forTask();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// structogram — Kapitel 3.7: dasselbe Programm auf einer zweiten Ebene
// ---------------------------------------------------------------------------

/** A program together with the Struktogramm that belongs to it. */
interface DiagramTemplate {
  code: string[];
  diagram: Structogram;
}

function statement(text: string): StructogramNode {
  return { kind: "statement", text };
}

function diagramTemplates(): DiagramTemplate[] {
  const bound = randomInt(3, 9);
  const limit = pick([50, 100, 200]);
  const grenze = randomInt(10, 40);
  const pin = randomInt(1000, 9999);

  return [
    {
      code: main(
        `int alter = Integer.parseInt(IO.readln("Alter: "));`,
        `if (alter >= 18) {`,
        `    IO.println("volljaehrig");`,
        `} else {`,
        `    IO.println("minderjaehrig");`,
        `}`,
      ),
      diagram: [
        statement("alter einlesen"),
        {
          kind: "branch",
          condition: "alter >= 18",
          yes: [statement('"volljaehrig" ausgeben')],
          no: [statement('"minderjaehrig" ausgeben')],
        },
      ],
    },
    {
      code: main(
        `int zaehler = 1;`,
        `while (zaehler <= ${bound}) {`,
        `    IO.println(zaehler);`,
        `    zaehler = zaehler + 1;`,
        `}`,
      ),
      diagram: [
        statement("zaehler ← 1"),
        {
          kind: "while",
          condition: `solange zaehler <= ${bound}`,
          body: [statement("zaehler ausgeben"), statement("zaehler ← zaehler + 1")],
        },
      ],
    },
    {
      code: main(
        `String eingabe;`,
        `do {`,
        `    eingabe = IO.readln("PIN: ");`,
        `} while (!eingabe.equals("${pin}"));`,
        `IO.println("Willkommen");`,
      ),
      diagram: [
        {
          kind: "dowhile",
          condition: `solange eingabe ≠ "${pin}"`,
          body: [statement("PIN einlesen")],
        },
        statement('"Willkommen" ausgeben'),
      ],
    },
    {
      code: main(
        `int zahl = 1;`,
        `while (zahl < ${limit}) {`,
        `    zahl = zahl * 2;`,
        `}`,
        `IO.println(zahl);`,
      ),
      diagram: [
        statement("zahl ← 1"),
        {
          kind: "while",
          condition: `solange zahl < ${limit}`,
          body: [statement("zahl ← zahl · 2")],
        },
        statement("zahl ausgeben"),
      ],
    },
    {
      code: main(
        `int punkte = Integer.parseInt(IO.readln("Punkte: "));`,
        `if (punkte >= ${grenze}) {`,
        `    IO.println("bestanden");`,
        `}`,
        `IO.println("fertig");`,
      ),
      diagram: [
        statement("punkte einlesen"),
        {
          kind: "branch",
          condition: `punkte >= ${grenze}`,
          yes: [statement('"bestanden" ausgeben')],
          no: [],
        },
        statement('"fertig" ausgeben'),
      ],
    },
    {
      code: main(
        `int summe = 0;`,
        `for (int i = 1; i <= ${bound}; i++) {`,
        `    if (i % 2 == 0) {`,
        `        summe = summe + i;`,
        `    }`,
        `}`,
        `IO.println(summe);`,
      ),
      diagram: [
        statement("summe ← 0"),
        {
          kind: "while",
          condition: `für i von 1 bis ${bound}`,
          body: [
            {
              kind: "branch",
              condition: "i ist gerade",
              yes: [statement("summe ← summe + i")],
              no: [],
            },
          ],
        },
        statement("summe ausgeben"),
      ],
    },
    {
      code: main(
        `int rest = ${grenze * 3};`,
        `do {`,
        `    rest = rest - ${grenze};`,
        `    IO.println(rest);`,
        `} while (rest > 0);`,
      ),
      diagram: [
        statement(`rest ← ${grenze * 3}`),
        {
          kind: "dowhile",
          condition: "solange rest > 0",
          body: [statement(`rest ← rest − ${grenze}`), statement("rest ausgeben")],
        },
      ],
    },
  ];
}

/** The relation of a condition, turned into the one next to it. */
const RELATION_SLIPS: [string, string][] = [
  ["<=", "<"],
  [">=", ">"],
  ["≠", "="],
  [" < ", " > "],
  [" > ", " < "],
];

function slipCondition(condition: string): string | null {
  for (const [from, to] of shuffle(RELATION_SLIPS)) {
    if (condition.includes(from)) return condition.replace(from, to);
  }
  return null;
}

/**
 * One plausible misreading of the diagram: the branches swapped, the test moved
 * from the head to the foot, a relation off by one, or two boxes of a sequence
 * exchanged. Each of them is a diagram of a program the player did *not* get.
 */
function mutateDiagram(diagram: Structogram): Structogram {
  const copy = cloneStructogram(diagram);

  /** Every node of the diagram, so a mutation can reach a nested one. */
  const nodes: StructogramNode[] = [];
  const walk = (list: Structogram) => {
    for (const node of list) {
      nodes.push(node);
      if (node.kind === "branch") {
        walk(node.yes);
        walk(node.no);
      }
      if (node.kind === "while" || node.kind === "dowhile") walk(node.body);
    }
  };
  walk(copy);

  const branches = nodes.filter((node) => node.kind === "branch");
  const loops = nodes.filter((node) => node.kind === "while" || node.kind === "dowhile");

  const tested = nodes.filter((node) => node.kind !== "statement") as Extract<
    StructogramNode,
    { condition: string }
  >[];

  switch (pick(["branch", "loop", "relation", "order"] as const)) {
    case "branch": {
      if (branches.length > 0) {
        const target = pick(branches) as Extract<StructogramNode, { kind: "branch" }>;
        [target.yes, target.no] = [target.no, target.yes];
        return copy;
      }
      break;
    }
    case "loop": {
      if (loops.length > 0) {
        const target = pick(loops) as Extract<StructogramNode, { kind: "while" | "dowhile" }>;
        target.kind = target.kind === "while" ? "dowhile" : "while";
        return copy;
      }
      break;
    }
    case "relation": {
      const target = tested.find((node) => slipCondition(node.condition) != null);
      if (target) {
        target.condition = slipCondition(target.condition)!;
        return copy;
      }
      break;
    }
    default:
      break;
  }

  // Fall back to exchanging two boxes of the outer sequence.
  if (copy.length >= 2) {
    const i = randomInt(0, copy.length - 2);
    [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
  } else if (loops.length > 0) {
    const target = pick(loops) as Extract<StructogramNode, { kind: "while" | "dowhile" }>;
    target.kind = target.kind === "while" ? "dowhile" : "while";
  }
  return copy;
}

function structogramQuestion(template: DiagramTemplate): Omit<StructogramQuestion, "id"> {
  const correct = template.diagram;
  const seen = new Set([structogramSignature(correct)]);
  const wrong: Structogram[] = [];

  // Keep mutating until three diagrams turn up that differ from the right one
  // and from each other — swapping two identical boxes changes nothing.
  for (let attempt = 0; attempt < 120 && wrong.length < 3; attempt++) {
    const candidate = mutateDiagram(correct);
    const signature = structogramSignature(candidate);
    if (seen.has(signature)) continue;
    seen.add(signature);
    wrong.push(candidate);
  }

  const options = shuffle([correct, ...wrong]);
  return { code: template.code, options, answerIndex: options.indexOf(correct) };
}

const structogramStage: StageHandler<StructogramQuestion> = {
  id: "structogram",

  createQuestions({ settings }) {
    const count = Number(settings.questionsPerRound);
    // Four diagrams have to fit one screen, so the long templates stay out.
    const templates = pickN(
      diagramTemplates().filter((template) => structogramSize(template.diagram) <= 5),
      count,
    );
    return build(count, (index) => structogramQuestion(templates[index]));
  },

  evaluate(question, answer, timing) {
    const correct = Number(answer) === question.answerIndex;
    return { correct, points: correct ? speedPoints(timing.questionMs / 1000, 2, 40) : 0 };
  },
};

// ---------------------------------------------------------------------------
// methods — Kapitel 4: Parameter, Argumente und return
// ---------------------------------------------------------------------------

function returnTask(): Task {
  switch (pick(["double", "square", "nested", "twoParams", "max"] as const)) {
    case "double": {
      const argument = randomInt(3, 40);
      return {
        code: [
          `int verdoppeln(int pZahl) {`,
          `    return pZahl * 2;`,
          `}`,
          ``,
          ...main(`IO.println(verdoppeln(${argument}));`),
        ],
        ask: "call",
        expected: [javaInt(argument * 2)],
      };
    }
    case "square": {
      const argument = randomInt(3, 12);
      const offset = randomInt(1, 9);
      return {
        code: [
          `int rechne(int pZahl) {`,
          `    return pZahl * pZahl + ${offset};`,
          `}`,
          ``,
          ...main(`IO.println(rechne(${argument}));`),
        ],
        ask: "call",
        expected: [javaInt(argument * argument + offset)],
      };
    }
    case "nested": {
      const argument = randomInt(2, 9);
      return {
        code: [
          `int verdoppeln(int pZahl) {`,
          `    return pZahl * 2;`,
          `}`,
          ``,
          ...main(`IO.println(verdoppeln(verdoppeln(${argument})));`),
        ],
        ask: "call",
        expected: [javaInt(argument * 4)],
      };
    }
    case "twoParams": {
      const a = randomInt(2, 12);
      const b = randomInt(2, 12);
      const c = randomInt(2, 6);
      return {
        code: [
          `int flaeche(int pBreite, int pHoehe) {`,
          `    return pBreite * pHoehe;`,
          `}`,
          ``,
          `int volumen(int pBreite, int pHoehe, int pTiefe) {`,
          `    return flaeche(pBreite, pHoehe) * pTiefe;`,
          `}`,
          ``,
          ...main(`IO.println(volumen(${a}, ${b}, ${c}));`),
        ],
        ask: "call",
        expected: [javaInt(a * b * c)],
      };
    }
    default: {
      // Every path has to hit a return — and the first one ends the method.
      const a = randomInt(2, 40);
      const b = randomInt(2, 40);
      return {
        code: [
          `int groesserer(int pA, int pB) {`,
          `    if (pA > pB) {`,
          `        return pA;`,
          `    }`,
          `    return pB;`,
          `}`,
          ``,
          ...main(`IO.println(groesserer(${a}, ${b}));`),
        ],
        ask: "call",
        expected: [javaInt(Math.max(a, b))],
      };
    }
  }
}

function argumentOrderTask(): Task {
  switch (pick(["difference", "divide", "rest"] as const)) {
    case "difference": {
      const a = randomInt(2, 20);
      const b = randomInt(2, 20);
      return {
        code: [
          `int differenz(int pA, int pB) {`,
          `    return pA - pB;`,
          `}`,
          ``,
          ...main(`IO.println(differenz(${a}, ${b}));`),
        ],
        ask: "call",
        expected: [javaInt(a - b)],
      };
    }
    case "divide": {
      const b = randomInt(2, 9);
      const a = b * randomInt(2, 20) + randomInt(0, b - 1);
      return {
        code: [
          `int teile(int pZaehler, int pNenner) {`,
          `    return pZaehler / pNenner;`,
          `}`,
          ``,
          ...main(`IO.println(teile(${a}, ${b}));`),
        ],
        ask: "call",
        expected: [javaInt(intDiv(a, b))],
      };
    }
    default: {
      const b = randomInt(3, 12);
      const a = randomInt(2 * b + 1, 120);
      return {
        code: [
          `int rest(int pZahl, int pTeiler) {`,
          `    return pZahl % pTeiler;`,
          `}`,
          ``,
          ...main(`IO.println(rest(${a}, ${b}));`),
        ],
        ask: "call",
        expected: [javaInt(intMod(a, b))],
      };
    }
  }
}

/** A void method prints; it does not hand anything back — Kapitel 4.1 vs 4.2. */
function voidTask(): Task {
  if (Math.random() < 0.5) {
    const times = randomInt(2, 4);
    const word = pick(["Hallo", "Achtung", "Runde"]);
    return {
      code: [
        `void melde(String pText) {`,
        `    IO.println(pText + "!");`,
        `}`,
        ``,
        ...main(`for (int i = 0; i < ${times}; i++) {`, `    melde("${word}");`, `}`),
      ],
      ask: "output",
      expected: Array.from({ length: times }, () => `${word}!`),
    };
  }
  // A method called for its output, then called again inside a computation.
  const argument = randomInt(3, 12);
  return {
    code: [
      `int quadrat(int pZahl) {`,
      `    IO.println("rechne " + pZahl);`,
      `    return pZahl * pZahl;`,
      `}`,
      ``,
      ...main(`int ergebnis = quadrat(${argument});`, `IO.println(ergebnis);`),
    ],
    ask: "output",
    expected: [`rechne ${argument}`, javaInt(argument * argument)],
  };
}

const methodsStage: StageHandler<CodeAnswerQuestion> = {
  id: "methods",

  createQuestions({ settings }) {
    const mode = String(settings.methodTasks);
    return build(Number(settings.questionsPerRound), () => {
      if (mode === "order") return argumentOrderTask();
      if (mode === "returns") return returnTask();
      const roll = Math.random();
      if (roll < 0.2) return voidTask();
      return roll < 0.6 ? returnTask() : argumentOrderTask();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// arrays — Kapitel 5: gezählt wird ab 0, und length hat keine Klammern
// ---------------------------------------------------------------------------

function arrayValues(count: number): number[] {
  return Array.from({ length: count }, () => randomInt(1, 15));
}

function literal(values: number[]): string {
  return `{${values.join(", ")}}`;
}

function indexTask(): Task {
  const name = pick(ARRAY_NAMES);
  const values = arrayValues(randomInt(4, 6));
  const head = `int[] ${name} = ${literal(values)};`;

  switch (pick(["index", "length", "last", "sumTwo", "write"] as const)) {
    case "index": {
      const index = randomInt(0, values.length - 1);
      return {
        code: main(head, `IO.println(${name}[${index}]);`),
        ask: "output",
        expected: [javaInt(values[index])],
      };
    }
    case "length":
      return {
        code: main(head, `IO.println(${name}.length);`),
        ask: "output",
        expected: [javaInt(values.length)],
      };
    case "last":
      return {
        code: main(head, `IO.println(${name}[${name}.length - 1]);`),
        ask: "output",
        expected: [javaInt(values[values.length - 1])],
      };
    case "sumTwo": {
      const i = randomInt(0, values.length - 2);
      const j = randomInt(i + 1, values.length - 1);
      return {
        code: main(head, `IO.println(${name}[${i}] + ${name}[${j}]);`),
        ask: "output",
        expected: [javaInt(values[i] + values[j])],
      };
    }
    default: {
      // A fresh array is not empty: an int field starts out full of zeros.
      const size = randomInt(3, 5);
      const index = randomInt(0, size - 1);
      const other = (index + 1) % size;
      const value = randomInt(2, 40);
      return {
        code: main(
          `int[] ${name} = new int[${size}];`,
          `${name}[${index}] = ${value};`,
          `IO.println(${name}[${index}]);`,
          `IO.println(${name}[${other}]);`,
        ),
        ask: "output",
        expected: [javaInt(value), javaInt(0)],
      };
    }
  }
}

function traverseTask(): Task {
  const name = pick(ARRAY_NAMES);
  const values = arrayValues(randomInt(4, 6));
  const head = `int[] ${name} = ${literal(values)};`;

  switch (pick(["sum", "max", "count", "each", "average"] as const)) {
    case "sum":
      return {
        code: main(
          head,
          `int summe = 0;`,
          `for (int i = 0; i < ${name}.length; i++) {`,
          `    summe = summe + ${name}[i];`,
          `}`,
          `IO.println(summe);`,
        ),
        ask: "output",
        expected: [javaInt(values.reduce((a, b) => a + b, 0))],
      };
    case "max":
      return {
        code: main(
          head,
          `int groesster = ${name}[0];`,
          `for (int i = 1; i < ${name}.length; i++) {`,
          `    if (${name}[i] > groesster) {`,
          `        groesster = ${name}[i];`,
          `    }`,
          `}`,
          `IO.println(groesster);`,
        ),
        ask: "output",
        expected: [javaInt(Math.max(...values))],
      };
    case "count": {
      const bound = randomInt(5, 15);
      return {
        code: main(
          head,
          `int anzahl = 0;`,
          `for (int wert : ${name}) {`,
          `    if (wert > ${bound}) {`,
          `        anzahl++;`,
          `    }`,
          `}`,
          `IO.println(anzahl);`,
        ),
        ask: "output",
        expected: [javaInt(values.filter((value) => value > bound).length)],
      };
    }
    case "each": {
      const factor = randomInt(2, 5);
      return {
        code: main(head, `for (int wert : ${name}) {`, `    IO.println(wert * ${factor});`, `}`),
        ask: "output",
        expected: values.map((value) => javaInt(value * factor)),
      };
    }
    default: {
      // The average of ints is an int — the trap of Kapitel 2.2, met again.
      const total = values.reduce((a, b) => a + b, 0);
      return {
        code: main(
          head,
          `int summe = 0;`,
          `for (int wert : ${name}) {`,
          `    summe = summe + wert;`,
          `}`,
          `IO.println(summe / ${name}.length);`,
        ),
        ask: "output",
        expected: [javaInt(intDiv(total, values.length))],
      };
    }
  }
}

const arraysStage: StageHandler<CodeAnswerQuestion> = {
  id: "arrays",

  createQuestions({ settings }) {
    const mode = String(settings.arrayTasks);
    return build(Number(settings.questionsPerRound), () => {
      if (mode === "index") return indexTask();
      if (mode === "traverse") return traverseTask();
      return Math.random() < 0.5 ? indexTask() : traverseTask();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// sorting — Kapitel 7: ein Durchlauf von Hand, und wie viel er gekostet hat
// ---------------------------------------------------------------------------

/** Distinct values, so "the smallest" is never ambiguous. */
function distinctValues(count: number): number[] {
  const pool = shuffle(Array.from({ length: 60 }, (_, i) => i + 1));
  return pool.slice(0, count);
}

function arrayLine(values: number[]): string {
  return `int[] werte = ${literal(values)};`;
}

function searchTask(): Task {
  const values = distinctValues(randomInt(5, 7));
  const inside = Math.random() < 0.75;
  const index = randomInt(0, values.length - 1);
  const needle = inside ? values[index] : randomInt(61, 99);

  if (Math.random() < 0.5) {
    // Lineare Suche: how many values does it look at before it can answer?
    return {
      code: [arrayLine(values), `int gesucht = ${needle};`],
      ask: "linearComparisons",
      expected: [javaInt(inside ? index + 1 : values.length)],
    };
  }
  // And what does it hand back — the position, or -1?
  return {
    code: [arrayLine(values), `int gesucht = ${needle};`],
    ask: "linearResult",
    expected: [javaInt(inside ? index : -1)],
  };
}

/** One pass of Bubblesort: neighbours compared, the largest carried to the end. */
function bubblePass(values: number[]): { result: number[]; swaps: number } {
  const result = [...values];
  let swaps = 0;
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i] > result[i + 1]) {
      [result[i], result[i + 1]] = [result[i + 1], result[i]];
      swaps++;
    }
  }
  return { result, swaps };
}

/** One step of Sortieren durch Auswählen: the smallest swapped to the front. */
function selectionStep(values: number[]): number[] {
  const result = [...values];
  let smallest = 0;
  for (let i = 1; i < result.length; i++) {
    if (result[i] < result[smallest]) smallest = i;
  }
  [result[0], result[smallest]] = [result[smallest], result[0]];
  return result;
}

/**
 * Values for which the asked step actually does something.
 *
 * An array whose smallest value already sits at the front makes "the first step
 * of Sortieren durch Auswählen" a question about copying the line above, and a
 * sorted array makes the first pass of Bubblesort the same. Both are answerable
 * without running the verfahren, so neither is drawn.
 */
function valuesFor(task: "bubble" | "selection"): number[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const values = distinctValues(randomInt(5, 6));
    const smallest = Math.min(...values);
    if (task === "selection" ? values[0] !== smallest : bubblePass(values).swaps > 0) {
      return values;
    }
  }
  // Random values that need no work at all are vanishingly rare; sort descending.
  return distinctValues(randomInt(5, 6)).sort((a, b) => b - a);
}

function sortTask(): Task {
  switch (pick(["bubblePass", "bubbleSwaps", "selection", "comparisons"] as const)) {
    case "bubblePass": {
      const values = valuesFor("bubble");
      return {
        code: [arrayLine(values)],
        ask: "bubblePass",
        expected: bubblePass(values).result.map(javaInt),
      };
    }
    case "bubbleSwaps": {
      const values = valuesFor("bubble");
      return {
        code: [arrayLine(values)],
        ask: "bubbleSwaps",
        expected: [javaInt(bubblePass(values).swaps)],
      };
    }
    case "selection": {
      const values = valuesFor("selection");
      return {
        code: [arrayLine(values)],
        ask: "selectionPass",
        expected: selectionStep(values).map(javaInt),
      };
    }
    default: {
      // n - 1 comparisons in the first pass, whatever the values happen to be.
      const values = distinctValues(randomInt(5, 6));
      return {
        code: [arrayLine(values)],
        ask: "bubbleComparisons",
        expected: [javaInt(values.length - 1)],
      };
    }
  }
}

const sortingStage: StageHandler<CodeAnswerQuestion> = {
  id: "sorting",

  createQuestions({ settings }) {
    const mode = String(settings.sortTasks);
    return build(Number(settings.questionsPerRound), () => {
      if (mode === "search") return searchTask();
      if (mode === "sort") return sortTask();
      return Math.random() < 0.4 ? searchTask() : sortTask();
    });
  },

  evaluate: (question, answer, timing) => gradeTyped(question, answer, timing),
};

// ---------------------------------------------------------------------------
// bugs — eine Zeile ist kaputt; welche?
// ---------------------------------------------------------------------------

interface BugTemplate {
  kind: "syntax" | "semantic";
  build: () => { code: string[]; errorLine: number; reasonKey: string };
}

/** `main(...)` indents and wraps, so an error line inside the body shifts by one. */
function inMain(body: string[], line: number, reasonKey: string) {
  return { code: main(...body), errorLine: line + 1, reasonKey };
}

const BUG_TEMPLATES: BugTemplate[] = [
  {
    kind: "syntax",
    build: () =>
      inMain(
        [`int zahl = ${randomInt(2, 40)}`, `IO.println(zahl * 2);`],
        0,
        "games.java.bugs.semicolon",
      ),
  },
  {
    kind: "syntax",
    build: () => {
      const bound = randomInt(3, 20);
      return inMain(
        [
          `int zahl = ${randomInt(1, 30)};`,
          `if (zahl > ${bound} {`,
          `    IO.println("groesser");`,
          `}`,
        ],
        1,
        "games.java.bugs.paren",
      );
    },
  },
  {
    kind: "syntax",
    build: () => {
      const value = randomInt(1, 9);
      return inMain(
        [
          `int zahl = ${randomInt(1, 9)};`,
          `if (zahl = ${value}) {`,
          `    IO.println("Treffer");`,
          `}`,
        ],
        1,
        "games.java.bugs.assign",
      );
    },
  },
  {
    kind: "syntax",
    build: () =>
      inMain(
        [`double preis = ${randomInt(2, 40)},${randomInt(10, 99)};`, `IO.println(preis);`],
        0,
        "games.java.bugs.comma",
      ),
  },
  {
    kind: "syntax",
    build: () =>
      inMain(
        [`char anfang = "${pick(["A", "M", "Z"])}";`, `IO.println(anfang);`],
        0,
        "games.java.bugs.charQuotes",
      ),
  },
  {
    kind: "syntax",
    build: () =>
      inMain(
        [`boolean fertig = True;`, `if (fertig) {`, `    IO.println("fertig");`, `}`],
        0,
        "games.java.bugs.boolean",
      ),
  },
  {
    kind: "syntax",
    build: () =>
      inMain([`String name = "Ada";`, `IO.Println(name);`], 1, "games.java.bugs.case"),
  },
  {
    kind: "syntax",
    build: () =>
      inMain([`int meine zahl = ${randomInt(2, 30)};`, `IO.println(meine zahl);`], 0, "games.java.bugs.name"),
  },
  {
    kind: "syntax",
    build: () =>
      inMain(
        [`int zahl = IO.readln("Zahl: ");`, `IO.println(zahl * 2);`],
        0,
        "games.java.bugs.parseInt",
      ),
  },
  {
    kind: "semantic",
    build: () => {
      const bound = randomInt(3, 20);
      return inMain(
        [
          `int zahl = ${randomInt(1, 30)};`,
          `if (zahl > ${bound});`,
          `{`,
          `    IO.println("immer");`,
          `}`,
        ],
        1,
        "games.java.bugs.emptyIf",
      );
    },
  },
  {
    kind: "semantic",
    build: () => {
      const limit = randomInt(5, 12);
      return inMain(
        [`int i = 1;`, `while (i < ${limit}) {`, `    IO.println(i);`, `    i--;`, `}`],
        3,
        "games.java.bugs.endless",
      );
    },
  },
  {
    kind: "semantic",
    build: () => {
      const values = arrayValues(5);
      return inMain(
        [
          `int[] punkte = ${literal(values)};`,
          `for (int i = 0; i <= punkte.length; i++) {`,
          `    IO.println(punkte[i]);`,
          `}`,
        ],
        1,
        "games.java.bugs.offByOne",
      );
    },
  },
  {
    kind: "semantic",
    build: () => {
      const values = arrayValues(5);
      return inMain(
        [`int[] punkte = ${literal(values)};`, `IO.println(punkte[${values.length}]);`],
        1,
        "games.java.bugs.index",
      );
    },
  },
  {
    kind: "semantic",
    build: () =>
      inMain(
        [
          `String eingabe = IO.readln("Weiter? ");`,
          `if (eingabe == "ja") {`,
          `    IO.println("los");`,
          `}`,
        ],
        1,
        "games.java.bugs.equals",
      ),
  },
  {
    kind: "semantic",
    build: () => {
      const values = arrayValues(4);
      return inMain(
        [
          `int[] noten = ${literal(values)};`,
          `int summe = 0;`,
          `for (int note : noten) {`,
          `    summe = summe + note;`,
          `}`,
          `double schnitt = summe / noten.length;`,
          `IO.println(schnitt);`,
        ],
        5,
        "games.java.bugs.intDivision",
      );
    },
  },
  {
    kind: "semantic",
    build: () => {
      const a = randomInt(2, 20);
      const b = randomInt(2, 9);
      return inMain(
        [`int zahl = ${a};`, `IO.println("Summe: " + zahl + ${b});`],
        1,
        "games.java.bugs.concat",
      );
    },
  },
  {
    kind: "syntax",
    build: () => {
      const bound = randomInt(3, 9);
      return inMain(
        [
          `int summe = 0;`,
          `for (int i = 1; i <= ${bound}; i++) {`,
          `    int summe = summe + i;`,
          `}`,
          `IO.println(summe);`,
        ],
        2,
        "games.java.bugs.shadow",
      );
    },
  },
  {
    kind: "semantic",
    build: () => {
      const argument = randomInt(2, 12);
      return {
        code: [
          `int verdoppeln(int pZahl) {`,
          `    pZahl * 2;`,
          `}`,
          ``,
          ...main(`IO.println(verdoppeln(${argument}));`),
        ],
        errorLine: 1,
        reasonKey: "games.java.bugs.noReturn",
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
    const count = Number(settings.questionsPerRound);
    const templates = pickN(pool.length > 0 ? pool : BUG_TEMPLATES, count);
    return build(count, (index) => templates[index].build());
  },

  evaluate(question, answer, timing) {
    const correct = Number(answer) === question.errorLine;
    return { correct, points: correct ? speedPoints(timing.questionMs / 1000, 2, 40) : 0 };
  },
};

export default createStageGame(javaSpec, [
  outputStage,
  typesStage,
  variablesStage,
  logicStage,
  branchStage,
  loopsStage,
  structogramStage,
  methodsStage,
  arraysStage,
  sortingStage,
  bugsStage,
] as StageHandler[]);
