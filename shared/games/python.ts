import type { GameSpec, SettingsField, StageQuestion } from "../framework";
import type { TurtleDrawing } from "../python-turtle";

// ---------------------------------------------------------------------------
// Settings shared by the stages
// ---------------------------------------------------------------------------

const questionsPerRound = (options: number[], value: number): SettingsField => ({
  type: "select",
  key: "questionsPerRound",
  labelKey: "settings.questionsPerRound",
  options,
  default: value,
});

const duration = (value: number, max = 180): SettingsField => ({
  type: "range",
  key: "duration",
  labelKey: "settings.duration",
  min: 30,
  max,
  step: 15,
  default: value,
  unit: "s",
});

const choice = (key: string, values: string[], value: string): SettingsField => ({
  type: "choice",
  key,
  labelKey: `settings.${key}`,
  options: values.map((option) => ({
    value: option,
    labelKey: `settings.${key}${option[0].toUpperCase()}${option.slice(1)}`,
  })),
  default: value,
});

const toggle = (key: string, value: boolean): SettingsField => ({
  type: "toggle",
  key,
  labelKey: `settings.${key}`,
  default: value,
});

/**
 * Textual programming with Python — UV-INF-SEK1-10-01, the largest vorhaben of
 * the whole Sekundarstufe I. The stages follow the chapter order of the
 * hyperbook's Turtle-Lernpfad, so a station can be played the week its lesson is
 * taught, and they stay inside the subset of Python that path teaches.
 */
export const pythonSpec: GameSpec = {
  id: "python",
  titleKey: "games.python.title",
  descriptionKey: "games.python.description",
  category: "cs",
  grades: ["10"],
  icon: "🐍",
  color: "cyan",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "output",
      nameKey: "games.python.stages.output.name",
      summaryKey: "games.python.stages.output.summary",
      rulesKey: "games.python.stages.output.rules",
      settings: [
        questionsPerRound([5, 10, 15], 10),
        duration(90),
        choice("outputTasks", ["mixed", "arithmetic", "division"], "mixed"),
      ],
    },
    {
      id: "variables",
      nameKey: "games.python.stages.variables.name",
      summaryKey: "games.python.stages.variables.summary",
      rulesKey: "games.python.stages.variables.rules",
      settings: [questionsPerRound([5, 8, 12], 8), duration(90), toggle("withStrings", true)],
    },
    {
      id: "loops",
      nameKey: "games.python.stages.loops.name",
      summaryKey: "games.python.stages.loops.summary",
      rulesKey: "games.python.stages.loops.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(120),
        choice("loopTasks", ["mixed", "for", "while"], "mixed"),
        toggle("withNested", true),
      ],
    },
    {
      id: "branch",
      nameKey: "games.python.stages.branch.name",
      summaryKey: "games.python.stages.branch.summary",
      rulesKey: "games.python.stages.branch.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(90),
        { type: "select", key: "branchCount", labelKey: "settings.branchCount", options: [2, 3, 4], default: 3 },
        toggle("withLogicConditions", false),
      ],
    },
    {
      id: "logic",
      nameKey: "games.python.stages.logic.name",
      summaryKey: "games.python.stages.logic.summary",
      rulesKey: "games.python.stages.logic.rules",
      settings: [
        questionsPerRound([10, 15, 20], 15),
        duration(60),
        choice("logicTasks", ["mixed", "values", "variables"], "mixed"),
      ],
    },
    {
      id: "functions",
      nameKey: "games.python.stages.functions.name",
      summaryKey: "games.python.stages.functions.summary",
      rulesKey: "games.python.stages.functions.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(120),
        choice("functionTasks", ["mixed", "value", "order"], "mixed"),
      ],
    },
    {
      id: "lists",
      nameKey: "games.python.stages.lists.name",
      summaryKey: "games.python.stages.lists.summary",
      rulesKey: "games.python.stages.lists.rules",
      settings: [
        questionsPerRound([5, 10, 15], 10),
        duration(90),
        choice("listTasks", ["mixed", "index", "loop"], "mixed"),
      ],
    },
    {
      id: "turtle",
      nameKey: "games.python.stages.turtle.name",
      summaryKey: "games.python.stages.turtle.summary",
      rulesKey: "games.python.stages.turtle.rules",
      settings: [questionsPerRound([3, 5, 8], 5), duration(120)],
    },
    {
      id: "parsons",
      nameKey: "games.python.stages.parsons.name",
      summaryKey: "games.python.stages.parsons.summary",
      rulesKey: "games.python.stages.parsons.rules",
      settings: [questionsPerRound([2, 3, 5], 3), duration(150, 240), toggle("withIndent", false)],
    },
    {
      id: "bugs",
      nameKey: "games.python.stages.bugs.name",
      summaryKey: "games.python.stages.bugs.summary",
      rulesKey: "games.python.stages.bugs.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(120),
        choice("bugTasks", ["mixed", "syntax", "semantic"], "mixed"),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — built on the server, rendered on the client
// ---------------------------------------------------------------------------

/** What the player is asked about the listing. Keys under `games.python.ask`. */
export type AskKind =
  | "output" // "Was gibt das Programm aus?"
  | "value" // "Welchen Wert hat <name> am Ende?"
  | "count" // "Wie oft wird die eingerückte Zeile ausgeführt?"
  | "call"; // "Was gibt der Aufruf aus?"

/**
 * The shape five stages share: a listing to read and a value to type. Only the
 * generator differs between them — output, variables, loops, functions and
 * lists all ask the player to run the code in their head and write down what
 * comes out.
 */
export interface CodeAnswerQuestion extends StageQuestion {
  code: string[];
  ask: AskKind;
  /** Interpolated into the question, e.g. the name of the variable asked about. */
  askArg?: string;
  /** The expected output, one entry per printed line. */
  expected: string[];
  /** Shown above the listing, e.g. what the user typed into `input()`. */
  noteKey?: string;
  noteArg?: string;
}

/** Read the listing, pick the output it produces. */
export interface CodeChoiceQuestion extends StageQuestion {
  code: string[];
  ask: AskKind;
  askArg?: string;
  options: string[];
  answerIndex: number;
}

/** Is the expression True or False? */
export interface LogicValueQuestion extends StageQuestion {
  kind: "value";
  /** Assignments shown above the expression; may be empty. */
  code: string[];
  expression: string;
  answer: boolean;
}

/** How does Python bracket this expression? */
export interface LogicReadingQuestion extends StageQuestion {
  kind: "reading";
  expression: string;
  options: string[];
  answerIndex: number;
}

/** True or False — and, once in a while, how Python brackets an expression. */
export type LogicQuestion = LogicValueQuestion | LogicReadingQuestion;

/** Which picture does this program draw? */
export interface TurtleQuestion extends StageQuestion {
  code: string[];
  options: TurtleDrawing[];
  answerIndex: number;
}

// The puzzle itself is not a Python idea — see shared/parsons.ts, which Java
// uses too. Re-exported here so the stations that already name it keep working.
export type { ParsonsAnswer, ParsonsQuestion } from "../parsons";

/** One line is broken. Which one? */
export interface BugQuestion extends StageQuestion {
  code: string[];
  /** 0-based index into `code`. */
  errorLine: number;
  /** i18n key under `games.python.bugs` explaining the mistake afterwards. */
  reasonKey: string;
}
