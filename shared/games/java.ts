import type { GameSpec, SettingsField, StageQuestion } from "../framework";
import type { Structogram } from "../java-structogram";

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
 * Grundlagen der Programmierung mit Java — the Einführungsphase.
 *
 * The stations follow the chapter order of the hyperbook's Lernpfad
 * *Grundlagen der Programmierung mit Java*, which is itself the order of the
 * SILP's vorhaben EF-II to EF-VI, so a station can be played the week its
 * lesson is taught:
 *
 * | Station | Kapitel | UV |
 * | --- | --- | --- |
 * | output, types | 1 Erste Schritte, 2 Variablen und Datentypen | EF-II |
 * | variables | 2 Variablen und Datentypen | EF-II |
 * | logic, branch, loops, structogram | 3 Kontrollstrukturen | EF-III |
 * | methods | 4 Methoden und Modularisierung | EF-VI |
 * | arrays | 5 Felder | EF-V |
 * | sorting | 7 Algorithmen, Suchen und Sortieren | EF-IV |
 * | bugs | durchgehend ("testen Programme schrittweise") | EF-III, EF-V |
 *
 * Kapitel 6 (Objektorientierung, UV-INF-EF-07) is deliberately not here: it is
 * about modelling with diagrams, not about reading a listing, and belongs in a
 * game of its own.
 *
 * The Java is the Java of that Lernpfad — `void main()` and `IO.println` rather
 * than `public static void main(String[] args)` and `System.out.println` — and
 * nothing outside it.
 */
export const javaSpec: GameSpec = {
  id: "java",
  titleKey: "games.java.title",
  descriptionKey: "games.java.description",
  category: "cs",
  grades: ["EF"],
  icon: "☕",
  color: "amber",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "output",
      nameKey: "games.java.stages.output.name",
      summaryKey: "games.java.stages.output.summary",
      rulesKey: "games.java.stages.output.rules",
      settings: [
        questionsPerRound([5, 10, 15], 10),
        duration(90),
        choice("arithmeticTasks", ["mixed", "basic", "division"], "mixed"),
      ],
    },
    {
      id: "types",
      nameKey: "games.java.stages.types.name",
      summaryKey: "games.java.stages.types.summary",
      rulesKey: "games.java.stages.types.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(90),
        choice("typeTasks", ["mixed", "numbers", "strings", "naming"], "mixed"),
      ],
    },
    {
      id: "variables",
      nameKey: "games.java.stages.variables.name",
      summaryKey: "games.java.stages.variables.summary",
      rulesKey: "games.java.stages.variables.rules",
      settings: [questionsPerRound([5, 8, 12], 8), duration(90), toggle("withShorthand", true)],
    },
    {
      id: "logic",
      nameKey: "games.java.stages.logic.name",
      summaryKey: "games.java.stages.logic.summary",
      rulesKey: "games.java.stages.logic.rules",
      settings: [
        questionsPerRound([10, 15, 20], 15),
        duration(60),
        choice("boolTasks", ["mixed", "values", "variables"], "mixed"),
      ],
    },
    {
      id: "branch",
      nameKey: "games.java.stages.branch.name",
      summaryKey: "games.java.stages.branch.summary",
      rulesKey: "games.java.stages.branch.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(90),
        {
          type: "select",
          key: "branchCount",
          labelKey: "settings.branchCount",
          options: [2, 3, 4],
          default: 3,
        },
        toggle("withCompoundConditions", false),
      ],
    },
    {
      id: "loops",
      nameKey: "games.java.stages.loops.name",
      summaryKey: "games.java.stages.loops.summary",
      rulesKey: "games.java.stages.loops.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(120),
        choice("loopKind", ["mixed", "for", "while", "doWhile"], "mixed"),
        toggle("withNestedLoops", true),
      ],
    },
    {
      id: "structogram",
      nameKey: "games.java.stages.structogram.name",
      summaryKey: "games.java.stages.structogram.summary",
      rulesKey: "games.java.stages.structogram.rules",
      settings: [questionsPerRound([3, 5, 8], 5), duration(120)],
    },
    {
      id: "methods",
      nameKey: "games.java.stages.methods.name",
      summaryKey: "games.java.stages.methods.summary",
      rulesKey: "games.java.stages.methods.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(120),
        choice("methodTasks", ["mixed", "returns", "order"], "mixed"),
      ],
    },
    {
      id: "arrays",
      nameKey: "games.java.stages.arrays.name",
      summaryKey: "games.java.stages.arrays.summary",
      rulesKey: "games.java.stages.arrays.rules",
      settings: [
        questionsPerRound([5, 10, 15], 10),
        duration(90),
        choice("arrayTasks", ["mixed", "index", "traverse"], "mixed"),
      ],
    },
    {
      id: "sorting",
      nameKey: "games.java.stages.sorting.name",
      summaryKey: "games.java.stages.sorting.summary",
      rulesKey: "games.java.stages.sorting.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(120),
        choice("sortTasks", ["mixed", "search", "sort"], "mixed"),
      ],
    },
    {
      id: "bugs",
      nameKey: "games.java.stages.bugs.name",
      summaryKey: "games.java.stages.bugs.summary",
      rulesKey: "games.java.stages.bugs.rules",
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

/** What the player is asked about the listing. Keys under `games.java.ask`. */
export type AskKind =
  | "output" // "Was gibt das Programm aus?"
  | "value" // "Welchen Wert hat <name> am Ende?"
  | "count" // "Wie oft wird die innerste Anweisung ausgeführt?"
  | "call" // "Was gibt der Aufruf aus?"
  // The sorting station names its verfahren in the question rather than in an
  // argument, so the prompt stays one translatable sentence per task.
  | "bubblePass" // "Wie sieht das Feld nach dem ersten Durchlauf von Bubblesort aus?"
  | "selectionPass" // "… nach dem ersten Schritt von Sortieren durch Auswählen?"
  | "bubbleSwaps" // "Wie oft wird im ersten Durchlauf vertauscht?"
  | "bubbleComparisons" // "Wie viele Vergleiche macht der erste Durchlauf?"
  | "linearComparisons" // "Wie viele Werte sieht sich die lineare Suche an?"
  | "linearResult"; // "Welchen Index liefert die lineare Suche zurück?"

/**
 * The shape six stations share: a listing to read and a value to type. Only the
 * generator behind them differs — output, variables, loops, methods, arrays and
 * sorting all ask the player to run the code in their head and write down what
 * comes out.
 */
export interface CodeAnswerQuestion extends StageQuestion {
  code: string[];
  ask: AskKind;
  /** Interpolated into the question, e.g. the name of the variable asked about. */
  askArg?: string;
  /** The expected output, one entry per printed line. */
  expected: string[];
  /** Shown above the listing, e.g. what the user typed into `IO.readln`. */
  noteKey?: string;
  noteArg?: string;
}

/** Read the listing, pick what it produces — or pick the type that fits. */
export interface CodeChoiceQuestion extends StageQuestion {
  /** Empty for a question that is only a prompt, e.g. "which type fits?". */
  code: string[];
  /** i18n key of the question above the options. */
  promptKey: string;
  promptArg?: string;
  options: string[];
  answerIndex: number;
  /** Shown with the answer in the review, e.g. why that type is the right one. */
  reasonKey?: string;
}

/** Is the expression true or false? */
export interface LogicValueQuestion extends StageQuestion {
  kind: "value";
  /** Declarations shown above the expression; may be empty. */
  code: string[];
  expression: string;
  answer: boolean;
}

/** How does Java bracket this expression? */
export interface LogicReadingQuestion extends StageQuestion {
  kind: "reading";
  expression: string;
  options: string[];
  answerIndex: number;
}

/** true or false — and, once in a while, how Java brackets an expression. */
export type LogicQuestion = LogicValueQuestion | LogicReadingQuestion;

/** Which Struktogramm belongs to this program? */
export interface StructogramQuestion extends StageQuestion {
  code: string[];
  options: Structogram[];
  answerIndex: number;
}

/** One line is broken. Which one? */
export interface BugQuestion extends StageQuestion {
  code: string[];
  /** 0-based index into `code`. */
  errorLine: number;
  /** i18n key under `games.java.bugs` explaining the mistake afterwards. */
  reasonKey: string;
}
