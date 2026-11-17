import type { GameSpec, SettingsField, StageQuestion } from "../framework";
import type { Circuit } from "../logic-circuit";
import type { PartOffer } from "../rechner-pc";

// ---------------------------------------------------------------------------
// Settings shared by the stations
// ---------------------------------------------------------------------------

const questionsPerRound = (options: number[], value: number): SettingsField => ({
  type: "select",
  key: "questionsPerRound",
  labelKey: "settings.questionsPerRound",
  options,
  default: value,
});

const duration = (value: number, max = 240): SettingsField => ({
  type: "range",
  key: "duration",
  labelKey: "settings.duration",
  min: 30,
  max,
  step: 15,
  default: value,
  unit: "s",
});

/** A choice whose option labels live at `settings.<key><Option>`. */
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

const multi = (key: string, values: string[], value: string[]): SettingsField => ({
  type: "multi",
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

const count = (key: string, options: number[], value: number): SettingsField => ({
  type: "select",
  key,
  labelKey: `settings.${key}`,
  options,
  default: value,
});

/**
 * Innenansichten des Computers — UV 9.3 (UV-INF-SEK1-09-03), following the
 * hyperbook's Lernpfad of the same name chapter by chapter: build a computer
 * from parts (Kapitel 1 and the Kaufberatung of 4.4), sort parts by EVA (1.1,
 * 1.2), the Binärsystem and writing in it (2.2, 2.3) with the hex colours of
 * its brain box, logic gates (3.1) and the Mini-Prozessor (4.2).
 */
export const rechnerSpec: GameSpec = {
  id: "rechner",
  titleKey: "games.rechner.title",
  descriptionKey: "games.rechner.description",
  category: "cs",
  grades: ["9"],
  icon: "chip",
  color: "slate",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "bauen",
      nameKey: "games.rechner.stages.bauen.name",
      summaryKey: "games.rechner.stages.bauen.summary",
      rulesKey: "games.rechner.stages.bauen.rules",
      settings: [questionsPerRound([1, 2, 3], 2), duration(180, 420), count("testRuns", [0, 1, 2, 3, 5], 2)],
    },
    {
      id: "eva",
      nameKey: "games.rechner.stages.eva.name",
      summaryKey: "games.rechner.stages.eva.summary",
      rulesKey: "games.rechner.stages.eva.rules",
      settings: [
        questionsPerRound([8, 12, 16], 12),
        duration(60, 180),
        multi("evaTasks", ["eva", "bauteil"], ["eva", "bauteil"]),
      ],
    },
    {
      id: "binaer",
      nameKey: "games.rechner.stages.binaer.name",
      summaryKey: "games.rechner.stages.binaer.summary",
      rulesKey: "games.rechner.stages.binaer.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(120),
        choice("binaryDirection", ["beide", "zuDezimal", "zuBinaer"], "beide"),
        count("bitCount", [4, 6, 8], 8),
        toggle("showPlaceValues", true),
      ],
    },
    {
      id: "farbcode",
      nameKey: "games.rechner.stages.farbcode.name",
      summaryKey: "games.rechner.stages.farbcode.summary",
      rulesKey: "games.rechner.stages.farbcode.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(90),
        choice("hexDirection", ["beide", "code", "farbe"], "beide"),
      ],
    },
    {
      id: "rechnen",
      nameKey: "games.rechner.stages.rechnen.name",
      summaryKey: "games.rechner.stages.rechnen.summary",
      rulesKey: "games.rechner.stages.rechnen.rules",
      settings: [
        questionsPerRound([3, 5, 8], 5),
        duration(180, 300),
        multi("binaryOps", ["add", "mul"], ["add"]),
        count("bitCount", [4, 6, 8], 4),
        toggle("register", false),
      ],
    },
    {
      id: "gatter",
      nameKey: "games.rechner.stages.gatter.name",
      summaryKey: "games.rechner.stages.gatter.summary",
      rulesKey: "games.rechner.stages.gatter.rules",
      settings: [
        questionsPerRound([3, 5, 8], 5),
        duration(150, 300),
        choice("gateTask", ["beide", "ausgang", "tabelle"], "beide"),
        choice("gateCircuit", ["gemischt", "einfach", "verbunden"], "gemischt"),
        toggle("withXor", false),
      ],
    },
    {
      id: "prozessor",
      nameKey: "games.rechner.stages.prozessor.name",
      summaryKey: "games.rechner.stages.prozessor.summary",
      rulesKey: "games.rechner.stages.prozessor.rules",
      settings: [
        questionsPerRound([3, 5, 8], 5),
        duration(240, 480),
        multi("cpuTasks", ["code", "trace", "write"], ["code", "trace", "write"]),
        toggle("rawCodes", false),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// bauen — the best computer for the money
// ---------------------------------------------------------------------------

/**
 * Pick one part of each kind and stay within the budget.
 *
 * Every part carries a `perf` the player never sees before answering: what it
 * adds to the benchmark is the thing to be worked out from the datasheet, and
 * a station that showed it would be a sum rather than a judgement. The few
 * test runs a player gets are measured on the server for the same reason.
 */
export interface BuildQuestion extends StageQuestion {
  budget: number;
  parts: PartOffer[];
  /** The best build within budget, one part id per kind — blanked for players. */
  bestPicks: string[];
  bestScore: number;
}

/** What the player sends: one part id per kind, in kind order. */
export interface BuildAnswer {
  picks: string[];
}

export interface BenchmarkRun {
  picks: string[];
  score: number;
}

/** `extra` of a round of `bauen`: test runs, per player and question. */
export interface BuildExtra {
  runs: Record<string, Record<number, BenchmarkRun[]>>;
}

// ---------------------------------------------------------------------------
// eva — what does this part do?
// ---------------------------------------------------------------------------

export const EVA_ROLES = ["eingabe", "verarbeitung", "ausgabe", "speicherung"] as const;

export interface EvaQuestion extends StageQuestion {
  /** "eva": a device, sorted into E, V, A or Speicherung. "bauteil": a job,
   *  matched to the part that does it. */
  kind: "eva" | "bauteil";
  /** Key under `games.rechner.devices` or `games.rechner.jobs`. */
  item: string;
  /** Keys under `games.rechner.roles` or `games.rechner.parts`. */
  options: string[];
  answerIndex: number;
}

// ---------------------------------------------------------------------------
// binaer — reading and writing place value with two digits
// ---------------------------------------------------------------------------

export interface BinaryQuestion extends StageQuestion {
  direction: "toDecimal" | "toBinary";
  value: number;
  bits: number;
  showPlaceValues: boolean;
}

// ---------------------------------------------------------------------------
// farbcode — hex, as the web writes colours
// ---------------------------------------------------------------------------

export interface HexQuestion extends StageQuestion {
  /** "code": the code is given, pick the colour. "farbe": the colour is
   *  given, pick its code. */
  direction: "code" | "farbe";
  /** "#RRGGBB" */
  target: string;
  options: string[];
  answerIndex: number;
}

// ---------------------------------------------------------------------------
// rechnen — schriftlich, in binary
// ---------------------------------------------------------------------------

export interface BinaryCalcQuestion extends StageQuestion {
  op: "add" | "mul";
  a: number;
  b: number;
  /** Digits the two numbers are written with. */
  aBits: number;
  bBits: number;
  /** How many result cells there are — the register's width, in register mode. */
  width: number;
  /** In a register the carry out of the top digit is lost, and has to be named. */
  register: boolean;
  /** What belongs in the cells, as a number; -1 for players. */
  result: number;
  overflow: boolean;
}

export interface BinaryCalcAnswer {
  /** The result cells, most significant first, "0" or "1" each. */
  bits: string;
  overflow?: boolean;
}

// ---------------------------------------------------------------------------
// gatter — what comes out
// ---------------------------------------------------------------------------

export interface GateQuestion extends StageQuestion {
  /** "ausgang": the switches are set, say what the lamp does. "tabelle":
   *  fill in the whole truth table. */
  task: "ausgang" | "tabelle";
  circuit: Circuit;
  /** Input names, in the order the table counts them (first is the slowest). */
  inputs: string[];
  /** For "ausgang": the value of each input, in `inputs` order. */
  assignment: number[];
}

// ---------------------------------------------------------------------------
// prozessor — the Mini-Prozessor of Lektion 4.2
// ---------------------------------------------------------------------------

export type CpuTask = "encode" | "decode" | "trace" | "write";

/** One term of a program to write: a data cell, added or subtracted. */
export interface CpuTerm {
  cell: number;
  sign: 1 | -1;
}

export interface CpuQuestion extends StageQuestion {
  task: CpuTask;
  /** encode: the command to turn into a number. decode: the command a number
   *  stands for (blanked for players). */
  op: number;
  addr: number;
  /** decode: the number to read. */
  value: number;
  /** decode: show the bit pattern rather than the number. */
  asBits: boolean;
  /** trace: the whole memory. write: the memory with the program area empty. */
  memory: number[];
  /** trace: show program cells as numbers only, so they must be decoded. */
  raw: boolean;
  /** write: how many cells from 0 the player fills. */
  programCells: number;
  /** trace/write: which cell is asked about. */
  resultCell: number;
  /** trace: what is in it at the end (blanked for players). write: what
   *  should be in it at the end on the data shown. */
  expected: number;
  /** write: what the program computes. */
  terms: CpuTerm[];
  /** write: other data the program is run on, so it computes rather than
   *  happens to land on the number. Never sent to players. */
  checks: number[][];
}
