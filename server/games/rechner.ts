// Innenansichten des Computers — seven stations along the hyperbook's Lernpfad
// for UV 9.3: build a computer, sort its parts by EVA, read and write binary,
// read a colour code, add in binary, follow a circuit, and program the
// Mini-Prozessor.

import {
  EVA_ROLES,
  rechnerSpec,
  type BinaryCalcAnswer,
  type BinaryCalcQuestion,
  type BinaryQuestion,
  type BuildAnswer,
  type BuildExtra,
  type BuildQuestion,
  type CpuQuestion,
  type CpuTask,
  type CpuTerm,
  type EvaQuestion,
  type GateQuestion,
  type HexQuestion,
} from "../../shared/games/rechner";
import {
  CATALOGUE,
  PART_KINDS,
  allBuilds,
  benchmark,
  offer,
  resolvePicks,
  totalPrice,
  type PartKind,
  type PartOffer,
} from "../../shared/rechner-pc";
import {
  circuitInputs,
  evaluate as evaluateCircuit,
  gateCount,
  isInput,
  outputColumn,
  type Circuit,
} from "../../shared/logic-circuit";
import {
  ADDIERE,
  LADE,
  SPEICHERE,
  SPRINGE,
  STOPP,
  SUBTRAHIERE,
  encode,
  run,
  withProgram,
} from "../../shared/mini-prozessor";
import { closenessPoints, speedPoints } from "../../shared/framework";
import { createStageGame, type StageHandler } from "../framework";

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

function build<Q extends object>(count: number, make: (index: number) => Q): (Q & { id: number })[] {
  return Array.from({ length: count }, (_, id) => ({ ...make(id), id }));
}

function parseAnswer<T>(answer: string): T | null {
  try {
    return JSON.parse(answer) as T;
  } catch {
    return null;
  }
}

/** A whole number typed into a box, or null. */
function readInteger(answer: string): number | null {
  const trimmed = answer.trim();
  return /^\d{1,6}$/.test(trimmed) ? Number(trimmed) : null;
}

/**
 * Hands out the tasks the host picked, as evenly as the round allows, and
 * puts them in the order they were listed — easiest first, so a round that
 * mixes them warms up rather than opening on the hardest.
 */
function deal<T extends string>(picked: T[], count: number, order: readonly T[]): T[] {
  const tasks = shuffle(Array.from({ length: count }, (_, i) => picked[i % picked.length]));
  return tasks.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function selected<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  const list = Array.isArray(value) ? value.filter((v): v is T => allowed.includes(v as T)) : [];
  return list.length > 0 ? list : [...allowed];
}

// ---------------------------------------------------------------------------
// bauen — the best computer for the money
// ---------------------------------------------------------------------------

const OFFERS_PER_KIND: Record<PartKind, number> = { cpu: 4, gpu: 4, ram: 3, storage: 3 };

/** A price that looks like a shop's: 10% either way, ending in 9. */
function shopPrice(base: number): number {
  const jittered = base * (0.9 + Math.random() * 0.2);
  return Math.max(9, Math.round(jittered / 10) * 10 - 1);
}

function buildTask(): Omit<BuildQuestion, "id"> {
  let fallback: Omit<BuildQuestion, "id"> | null = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const parts: PartOffer[] = PART_KINDS.flatMap((kind) =>
      shuffle(CATALOGUE.filter((entry) => entry.kind === kind))
        .slice(0, OFFERS_PER_KIND[kind])
        .map((entry) => offer(entry, shopPrice(entry.price)))
        .sort((a, b) => a.price - b.price),
    );
    const builds = allBuilds(parts);
    const prices = builds.map(totalPrice);
    const cheapest = Math.min(...prices);
    const dearest = Math.max(...prices);
    const budget = Math.round((cheapest + (dearest - cheapest) * (0.3 + Math.random() * 0.3)) / 50) * 50;

    const affordable = builds.filter((b) => totalPrice(b) <= budget);
    if (affordable.length < 6) continue;
    let best = affordable[0];
    for (const candidate of affordable) {
      const [score, bestScore] = [benchmark(candidate), benchmark(best)];
      if (score > bestScore || (score === bestScore && totalPrice(candidate) < totalPrice(best))) {
        best = candidate;
      }
    }
    const task = {
      budget,
      parts,
      bestPicks: best.map((part) => part.id),
      bestScore: benchmark(best),
    };
    fallback ??= task;
    // Spending the whole budget must not already be the answer: the station
    // is about reading the datasheet, and "buy the most expensive" would make
    // it about reading the price tag.
    const dearestAffordable = affordable.reduce((a, b) => (totalPrice(b) > totalPrice(a) ? b : a));
    if (benchmark(dearestAffordable) >= task.bestScore * 0.97) continue;
    return task;
  }
  return fallback!;
}

/** At this share of the best score, the build counts as found. */
const BUILD_FOUND = 0.98;

/** Half the best score is worth nothing: anybody gets that by accident. */
const BUILD_ZERO_AT = 0.5;

const bauenStage: StageHandler<BuildQuestion> = {
  id: "bauen",
  // What each part does for the score is the thing to be worked out, and the
  // best build is the answer.
  forPlayer: (question) => ({
    ...question,
    parts: question.parts.map((part) => ({ ...part, perf: 0 })),
    bestPicks: [],
    bestScore: 0,
  }),

  createQuestions({ settings }) {
    return build(Number(settings.questionsPerRound), () => buildTask());
  },

  createExtra: () => ({ runs: {} }),

  extraForPlayer(extra, playerId) {
    const runs = (extra as unknown as BuildExtra).runs ?? {};
    return { runs: { [playerId]: runs[playerId] ?? {} } };
  },

  onAction(data, payload, playerId, ctx) {
    if (payload.action !== "benchmark") return false;
    const questionId = Number(payload.questionId);
    const question = data.questions.find((q) => q.id === questionId);
    if (!question || data.answers[playerId]?.[questionId]) return false;
    const parts = resolvePicks(question.parts, payload.picks);
    if (!parts || totalPrice(parts) > question.budget) return false;

    const extra = data.extra as unknown as BuildExtra;
    const mine = ((extra.runs ??= {})[playerId] ??= {});
    const runs = (mine[questionId] ??= []);
    if (runs.length >= Number(ctx.settings.testRuns)) return false;
    runs.push({ picks: parts.map((p) => p.id), score: benchmark(parts) });
    return true;
  },

  evaluate(question, answer) {
    const sent = parseAnswer<BuildAnswer>(answer);
    const parts = resolvePicks(question.parts, sent?.picks);
    if (!parts || totalPrice(parts) > question.budget || question.bestScore <= 0) {
      return { correct: false, points: 0 };
    }
    const share = benchmark(parts) / question.bestScore;
    return {
      correct: share >= BUILD_FOUND,
      points: Math.round(closenessPoints(1 - share, BUILD_ZERO_AT)),
    };
  },
};

// ---------------------------------------------------------------------------
// eva — what does this part do?
// ---------------------------------------------------------------------------

/** Devices whose place in EVA is not up for debate. A touchscreen or a
 *  graphics card is both, and a station of quick taps is no place for that. */
const DEVICES: Record<(typeof EVA_ROLES)[number], string[]> = {
  eingabe: ["tastatur", "maus", "mikrofon", "webcam", "scanner", "touchpad", "gamepad", "fingerabdruck", "barcode"],
  verarbeitung: ["prozessor", "rechenwerk", "steuerwerk", "mikrocontroller"],
  ausgabe: ["bildschirm", "lautsprecher", "drucker", "kopfhoerer", "beamer", "druck3d"],
  speicherung: ["arbeitsspeicher", "ssd", "festplatte", "usbstick", "sdkarte"],
};

/** A job, and the part of Lektion 1.2's table that does it. */
const JOBS: Record<string, string> = {
  befehle: "prozessor",
  bereithalten: "arbeitsspeicher",
  dauerhaft: "massenspeicher",
  verbinden: "hauptplatine",
  bild: "grafikkarte",
  strom: "netzteil",
  waerme: "luefter",
};

const PARTS = [...new Set(Object.values(JOBS))];

const evaStage: StageHandler<EvaQuestion> = {
  id: "eva",
  forPlayer: (question) => ({ ...question, answerIndex: -1 }),

  createQuestions({ settings }) {
    const kinds = selected(settings.evaTasks, ["eva", "bauteil"] as const);
    const usedDevices = new Set<string>();
    const usedJobs: string[] = [];
    return build(Number(settings.questionsPerRound), () => {
      if (pick(kinds) === "bauteil") {
        if (usedJobs.length >= Object.keys(JOBS).length) usedJobs.length = 0;
        const job = pick(Object.keys(JOBS).filter((j) => !usedJobs.includes(j)));
        usedJobs.push(job);
        const part = JOBS[job];
        const options = shuffle([part, ...shuffle(PARTS.filter((p) => p !== part)).slice(0, 3)]);
        return { kind: "bauteil" as const, item: job, options, answerIndex: options.indexOf(part) };
      }
      const role = pick(EVA_ROLES);
      const fresh = DEVICES[role].filter((d) => !usedDevices.has(d));
      const device = pick(fresh.length > 0 ? fresh : DEVICES[role]);
      usedDevices.add(device);
      return {
        kind: "eva" as const,
        item: device,
        options: [...EVA_ROLES],
        answerIndex: EVA_ROLES.indexOf(role),
      };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const correct = Number(answer) === question.answerIndex && answer.trim() !== "";
    return { correct, points: correct ? speedPoints(questionMs / 1000, 5, 30) : 0 };
  },
};

// ---------------------------------------------------------------------------
// binaer — place value with two digits
// ---------------------------------------------------------------------------

const binaerStage: StageHandler<BinaryQuestion> = {
  id: "binaer",
  // The number on screen is the question; its other spelling is the answer
  // and follows from it by arithmetic, which is the exercise.
  forPlayer: (question) => question,

  createQuestions({ settings }) {
    const bits = Number(settings.bitCount);
    const mode = String(settings.binaryDirection);
    const max = 2 ** bits - 1;
    const used = new Set<number>();
    return build(Number(settings.questionsPerRound), (index) => {
      const direction =
        mode === "zuDezimal"
          ? ("toDecimal" as const)
          : mode === "zuBinaer"
            ? ("toBinary" as const)
            : index % 2 === 0
              ? ("toDecimal" as const)
              : ("toBinary" as const);
      let value = randomInt(3, max);
      // A single lit card is one tap: keep those rare, and no repeats.
      for (let attempt = 0; attempt < 30; attempt++) {
        const powerOfTwo = (value & (value - 1)) === 0;
        if (!used.has(value) && (!powerOfTwo || Math.random() < 0.15)) break;
        value = randomInt(3, max);
      }
      used.add(value);
      return { direction, value, bits, showPlaceValues: settings.showPlaceValues === true };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const trimmed = answer.trim();
    const value =
      question.direction === "toDecimal"
        ? readInteger(trimmed)
        : /^[01]{1,16}$/.test(trimmed)
          ? parseInt(trimmed, 2)
          : null;
    const correct = value === question.value;
    return { correct, points: correct ? speedPoints(questionMs / 1000, 3, 30) : 0 };
  },
};

// ---------------------------------------------------------------------------
// farbcode — #RRGGBB
// ---------------------------------------------------------------------------

/** Three levels per channel: none, half, full. Finer than that and four
 *  swatches stop being told apart on a classroom projector. */
const LEVELS = ["00", "80", "FF"];

function hex(channels: string[]): string {
  return `#${channels.join("")}`;
}

function hexTask(direction: HexQuestion["direction"]): Omit<HexQuestion, "id"> {
  let target = [pick(LEVELS), pick(LEVELS), pick(LEVELS)];
  // A grey has no hue to read, and those are the colours this is about.
  while (new Set(target).size === 1) target = [pick(LEVELS), pick(LEVELS), pick(LEVELS)];

  const options = new Set<string>([hex(target)]);
  // The classic mistakes first: red and blue the wrong way round, then green
  // and blue, then one channel off.
  const swaps = [
    [target[2], target[1], target[0]],
    [target[0], target[2], target[1]],
    [target[1], target[0], target[2]],
  ];
  for (const swap of shuffle(swaps)) {
    if (options.size >= 3) break;
    options.add(hex(swap));
  }
  while (options.size < 4) {
    const changed = [...target];
    const channel = randomInt(0, 2);
    changed[channel] = pick(LEVELS.filter((level) => level !== target[channel]));
    if (new Set(changed).size > 1 || Math.random() < 0.2) options.add(hex(changed));
  }
  const list = shuffle([...options]);
  return { direction, target: hex(target), options: list, answerIndex: list.indexOf(hex(target)) };
}

const farbcodeStage: StageHandler<HexQuestion> = {
  id: "farbcode",
  // The target has to be on screen — as a code or as a colour — and the
  // option that matches it is the answer to work out.
  forPlayer: (question) => ({ ...question, answerIndex: -1 }),

  createQuestions({ settings }) {
    const mode = String(settings.hexDirection);
    return build(Number(settings.questionsPerRound), (index) =>
      hexTask(mode === "code" || mode === "farbe" ? mode : index % 2 === 0 ? "code" : "farbe"),
    );
  },

  evaluate(question, answer, { questionMs }) {
    const correct = answer.trim() !== "" && Number(answer) === question.answerIndex;
    return { correct, points: correct ? speedPoints(questionMs / 1000, 4, 30) : 0 };
  },
};

// ---------------------------------------------------------------------------
// rechnen — schriftlich, in binary
// ---------------------------------------------------------------------------

function bitLength(value: number): number {
  return Math.max(1, value.toString(2).length);
}

function additionTask(bits: number, register: boolean): Omit<BinaryCalcQuestion, "id"> {
  const max = 2 ** bits - 1;
  // Numbers that fill most of their digits, so there is something to carry.
  const min = Math.max(2, 2 ** (bits - 2));
  const wantOverflow = register && Math.random() < 0.5;
  let a = randomInt(min, max);
  let b = randomInt(min, max);
  for (let attempt = 0; attempt < 50; attempt++) {
    const carries = (a & b) !== 0;
    const overflows = a + b > max;
    if (carries && (!register || overflows === wantOverflow)) break;
    a = randomInt(min, max);
    b = randomInt(min, max);
  }
  const sum = a + b;
  return {
    op: "add",
    a,
    b,
    aBits: bits,
    bBits: bits,
    width: register ? bits : bits + 1,
    register,
    result: register ? sum & max : sum,
    overflow: sum > max,
  };
}

function multiplicationTask(bits: number): Omit<BinaryCalcQuestion, "id"> {
  // Half of them are "times 2, 4, 8": the shift the lesson wants seen.
  const shift = Math.random() < 0.5;
  const a = randomInt(5, 2 ** Math.min(bits, 5) - 1);
  const b = shift ? 2 ** randomInt(1, 3) : randomInt(3, 7);
  const aBits = bitLength(a);
  const bBits = bitLength(b);
  return { op: "mul", a, b, aBits, bBits, width: aBits + bBits, register: false, result: a * b, overflow: false };
}

const rechnenStage: StageHandler<BinaryCalcQuestion> = {
  id: "rechnen",
  forPlayer: (question) => ({ ...question, result: -1, overflow: false }),

  createQuestions({ settings }) {
    const ops = selected(settings.binaryOps, ["add", "mul"] as const);
    const bits = Number(settings.bitCount);
    const tasks = deal(ops, Number(settings.questionsPerRound), ["add", "mul"]);
    return build(tasks.length, (index) =>
      tasks[index] === "mul" ? multiplicationTask(bits) : additionTask(bits, settings.register === true),
    );
  },

  evaluate(question, answer, { questionMs }) {
    const sent = parseAnswer<BinaryCalcAnswer>(answer);
    if (!sent || typeof sent.bits !== "string" || !/^[01]*$/.test(sent.bits)) {
      return { correct: false, points: 0 };
    }
    if (sent.bits.length !== question.width) return { correct: false, points: 0 };
    const truth = question.result.toString(2).padStart(question.width, "0");
    const wrongBits = [...truth].filter((bit, i) => sent.bits[i] !== bit).length;
    const overflowRight = !question.register || sent.overflow === question.overflow;
    if (wrongBits === 0 && overflowRight) {
      return { correct: true, points: speedPoints(questionMs / 1000, 1, 50) };
    }
    // One slipped carry is a long way from not knowing how, and the overflow
    // is a separate question from the sum.
    if (wrongBits === 0) return { correct: false, points: 50 };
    if (wrongBits === 1 && overflowRight) return { correct: false, points: 40 };
    return { correct: false, points: 0 };
  },
};

// ---------------------------------------------------------------------------
// gatter — what comes out
// ---------------------------------------------------------------------------

type BinaryOp = "und" | "oder" | "xor";

function randomCircuit(gates: number, names: string[], ops: BinaryOp[]): Circuit {
  if (gates === 0) return { in: pick(names) };
  if (Math.random() < 0.25) {
    const inner = randomCircuit(gates - 1, names, ops);
    if (isInput(inner) || inner.op !== "nicht") return { op: "nicht", a: inner };
  }
  const left = randomInt(0, gates - 1);
  return {
    op: pick(ops),
    a: randomCircuit(left, names, ops),
    b: randomCircuit(gates - 1 - left, names, ops),
  };
}

function leafCount(circuit: Circuit): number {
  if (isInput(circuit)) return 1;
  return leafCount(circuit.a) + (circuit.op === "nicht" ? 0 : leafCount(circuit.b));
}

/** Same as each other, gate for gate — `A UND A` is not a circuit worth drawing. */
function sameCircuit(x: Circuit, y: Circuit): boolean {
  return JSON.stringify(x) === JSON.stringify(y);
}

function sensible(circuit: Circuit): boolean {
  if (isInput(circuit)) return true;
  if (circuit.op === "nicht") return sensible(circuit.a);
  return !sameCircuit(circuit.a, circuit.b) && sensible(circuit.a) && sensible(circuit.b);
}

function gateTask(task: GateQuestion["task"], connected: boolean, ops: BinaryOp[]): Omit<GateQuestion, "id"> {
  let circuit: Circuit = { op: "und", a: { in: "A" }, b: { in: "B" } };
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = connected
      ? randomCircuit(randomInt(2, 3), ["A", "B", "C"], ops)
      : Math.random() < 0.15
        ? ({ op: "nicht", a: { in: "A" } } as Circuit)
        : ({ op: pick(ops), a: { in: "A" }, b: { in: "B" } } as Circuit);
    const inputs = circuitInputs(candidate);
    const column = outputColumn(candidate, inputs);
    const constant = !column.includes("0") || !column.includes("1");
    // An input twice where a third one could have gone is a circuit that
    // simplifies away — B UND (A UND B) — rather than one worth following.
    const distinct = inputs.length === Math.min(leafCount(candidate), 3);
    const enough = connected ? distinct && gateCount(candidate) >= 2 : true;
    if (sensible(candidate) && !constant && enough) {
      circuit = candidate;
      break;
    }
  }
  const inputs = circuitInputs(circuit);
  return { task, circuit, inputs, assignment: inputs.map(() => randomInt(0, 1)) };
}

const gatterStage: StageHandler<GateQuestion> = {
  id: "gatter",
  // The circuit and the switches are the question, and the lamp follows from
  // them — working it out is the exercise.
  forPlayer: (question) => question,

  createQuestions({ settings }) {
    const mode = String(settings.gateTask);
    const size = String(settings.gateCircuit);
    const ops: BinaryOp[] = settings.withXor === true ? ["und", "oder", "xor"] : ["und", "oder"];
    const count = Number(settings.questionsPerRound);
    return build(count, (index) => {
      const task = mode === "ausgang" || mode === "tabelle" ? mode : index % 2 === 0 ? "ausgang" : "tabelle";
      // In a mixed round the first questions are single gates, to start from.
      const connected = size === "verbunden" || (size === "gemischt" && index >= Math.floor(count / 3));
      return gateTask(task, connected, ops);
    });
  },

  evaluate(question, answer, { questionMs }) {
    if (question.task === "ausgang") {
      const values = Object.fromEntries(question.inputs.map((name, i) => [name, question.assignment[i]]));
      const correct = answer.trim() === String(evaluateCircuit(question.circuit, values));
      return { correct, points: correct ? speedPoints(questionMs / 1000, 4, 30) : 0 };
    }
    const truth = outputColumn(question.circuit, question.inputs);
    const sent = answer.trim();
    if (sent.length !== truth.length) return { correct: false, points: 0 };
    const wrong = [...truth].filter((bit, i) => sent[i] !== bit).length;
    // Half the rows are right by guessing, so half right is worth nothing.
    return { correct: wrong === 0, points: Math.round(closenessPoints(wrong / truth.length, 0.5)) };
  },
};

// ---------------------------------------------------------------------------
// prozessor — the Mini-Prozessor
// ---------------------------------------------------------------------------

const CPU_ORDER: CpuTask[] = ["encode", "decode", "trace", "write"];

const emptyCpu = {
  op: 0,
  addr: 0,
  value: 0,
  asBits: false,
  memory: [] as number[],
  raw: false,
  programCells: 0,
  resultCell: 0,
  expected: 0,
  terms: [] as CpuTerm[],
  checks: [] as number[][],
};

function codeTask(task: "encode" | "decode"): Omit<CpuQuestion, "id"> {
  const op = randomInt(LADE, SPRINGE);
  const addr = randomInt(0, 15);
  return { ...emptyCpu, task, op, addr, value: encode(op, addr), asBits: task === "decode" && Math.random() < 0.5 };
}

type Target = { data: number } | "result" | "skip" | null;

/** Runs a program without wrapping at a byte, to make sure none of it does:
 *  a trace that goes below zero tests two's complement, not the cycle. */
function staysInRange(memory: number[]): boolean {
  const cells = [...memory];
  let akku = 0;
  let pc = 0;
  for (let steps = 0; steps < 50 && pc < cells.length; steps++) {
    const value = cells[pc++];
    const op = value >> 5;
    const addr = value & 31;
    if (op === LADE) akku = cells[addr];
    else if (op === ADDIERE) akku += cells[addr];
    else if (op === SUBTRAHIERE) akku -= cells[addr];
    else if (op === SPEICHERE) cells[addr] = akku;
    else if (op === SPRINGE) pc = addr;
    else return true;
    if (akku < 0 || akku > 255) return false;
  }
  return true;
}

function traceTask(raw: boolean): Omit<CpuQuestion, "id"> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const dataCount = randomInt(2, 3);
    const variant = pick(["plain", "jump", "overwrite"] as const);
    const program: { op: number; target: Target }[] = [{ op: LADE, target: { data: 0 } }];
    const steps = randomInt(Math.max(dataCount - 1, variant === "jump" ? 2 : 1), 3);
    // Every data cell gets read, and the first one — the one loaded — is
    // only ever added again: taking it away from itself just leaves 0.
    const reads = shuffle(
      Array.from({ length: steps }, (_, i) => (i < dataCount - 1 ? i + 1 : randomInt(0, dataCount - 1))),
    );
    for (const cell of reads) {
      const op = cell === 0 ? ADDIERE : pick([ADDIERE, ADDIERE, SUBTRAHIERE]);
      program.push({ op, target: { data: cell } });
    }
    if (variant === "jump") {
      // Jump over one of the sums — the one the player must not count.
      program.splice(randomInt(1, program.length - 1), 0, { op: SPRINGE, target: "skip" });
    } else if (variant === "overwrite") {
      const cell = randomInt(1, dataCount - 1);
      program.splice(randomInt(1, program.length), 0, { op: SPEICHERE, target: { data: cell } });
      program.push({ op: ADDIERE, target: { data: cell } });
    }
    program.push({ op: SPEICHERE, target: "result" }, { op: STOPP, target: null });

    const dataStart = program.length;
    const resultCell = dataStart + dataCount;
    const data = Array.from({ length: dataCount }, (_, i) => (i === 0 ? randomInt(10, 40) : randomInt(1, 15)));
    const memory = [
      ...program.map(({ op, target }, index) => {
        if (target === null) return encode(op, 0);
        if (target === "result") return encode(op, resultCell);
        if (target === "skip") return encode(op, index + 2);
        return encode(op, dataStart + target.data);
      }),
      ...data,
      0,
    ];
    if (!staysInRange(memory)) continue;
    const expected = run(memory).memory[resultCell];
    return { ...emptyCpu, task: "trace", memory, raw, resultCell, expected };
  }
  // Unreachable in practice; a fixed program keeps the round alive.
  const memory = [encode(LADE, 5), encode(ADDIERE, 6), encode(SPEICHERE, 7), encode(STOPP, 0), 0, 3, 4, 0];
  return { ...emptyCpu, task: "trace", memory, raw, resultCell: 7, expected: 7 };
}

const WRITE_MEMORY = 16;
const WRITE_DATA_START = 10;
const WRITE_RESULT = 15;

function writeData(terms: CpuTerm[]): number[] | null {
  const memory = Array.from({ length: WRITE_MEMORY }, () => 0);
  const cells = [...new Set(terms.map((t) => t.cell))];
  for (const cell of cells) memory[cell] = cell === terms[0].cell ? randomInt(15, 40) : randomInt(1, 12);
  let akku = 0;
  for (const term of terms) {
    akku += term.sign * memory[term.cell];
    if (akku < 0) return null;
  }
  return akku > 255 ? null : memory;
}

function expectedOf(terms: CpuTerm[], memory: number[]): number {
  return terms.reduce((sum, t) => sum + t.sign * memory[t.cell], 0) & 255;
}

function writeTask(): Omit<CpuQuestion, "id"> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const count = randomInt(2, 3);
    const cells = shuffle([10, 11, 12, 13]).slice(0, count);
    const terms: CpuTerm[] = cells.map((cell, i) => ({
      cell,
      sign: i === 0 || Math.random() < 0.6 ? 1 : -1,
    }));
    // Now and then a cell twice — "doppelt" has to be spelled out as a sum.
    if (count === 2 && Math.random() < 0.25) terms.push({ cell: terms[0].cell, sign: 1 });
    const memory = writeData(terms);
    const checks = [writeData(terms), writeData(terms)];
    if (!memory || checks.some((c) => c == null)) continue;
    // One spare cell, so a player who ends with an explicit STOPP has room.
    const programCells = Math.min(WRITE_DATA_START, terms.length + 2);
    return {
      ...emptyCpu,
      task: "write",
      memory,
      programCells,
      resultCell: WRITE_RESULT,
      expected: expectedOf(terms, memory),
      terms,
      checks: checks as number[][],
    };
  }
  const terms: CpuTerm[] = [
    { cell: 10, sign: 1 },
    { cell: 11, sign: 1 },
  ];
  const memory = Array.from({ length: WRITE_MEMORY }, (_, i) => (i === 10 ? 3 : i === 11 ? 4 : 0));
  return {
    ...emptyCpu,
    task: "write",
    memory,
    programCells: 4,
    resultCell: WRITE_RESULT,
    expected: 7,
    terms,
    checks: [memory.map((v, i) => (i === 10 ? 9 : v))],
  };
}

/** What a written program leaves in the result cell, run on `data`, or null
 *  when it never stops. */
function runWritten(question: CpuQuestion, program: number[], data: number[]): number | null {
  const result = run(withProgram(data, program, question.programCells));
  return result.halted ? result.memory[question.resultCell] : null;
}

const prozessorStage: StageHandler<CpuQuestion> = {
  id: "prozessor",
  forPlayer(question) {
    switch (question.task) {
      case "encode":
        return { ...question, value: -1 };
      case "decode":
        return { ...question, op: -1, addr: -1 };
      case "trace":
        return { ...question, expected: -1 };
      case "write":
        return { ...question, checks: [] };
    }
  },

  createQuestions({ settings }) {
    const picked = selected(settings.cpuTasks, ["code", "trace", "write"] as const);
    const tasks = deal(picked, Number(settings.questionsPerRound), ["code", "trace", "write"]);
    const qs = tasks.map((task): Omit<CpuQuestion, "id"> => {
      if (task === "code") return codeTask(Math.random() < 0.5 ? "encode" : "decode");
      if (task === "trace") return traceTask(settings.rawCodes === true);
      return writeTask();
    });
    qs.sort((a, b) => CPU_ORDER.indexOf(a.task) - CPU_ORDER.indexOf(b.task));
    return build(qs.length, (index) => qs[index]);
  },

  evaluate(question, answer, { questionMs }) {
    const seconds = questionMs / 1000;
    switch (question.task) {
      case "encode": {
        const correct = readInteger(answer) === question.value;
        return { correct, points: correct ? speedPoints(seconds, 3, 30) : 0 };
      }
      case "decode": {
        const [op, addr] = answer.split(",").map((part) => readInteger(part));
        const opRight = op === question.op;
        const correct = opRight && addr === question.addr;
        return { correct, points: correct ? speedPoints(seconds, 3, 30) : opRight ? 40 : 0 };
      }
      case "trace": {
        const correct = readInteger(answer) === question.expected;
        return { correct, points: correct ? speedPoints(seconds, 2, 40) : 0 };
      }
      case "write": {
        const sent = parseAnswer<{ program?: unknown }>(answer);
        const program = Array.isArray(sent?.program)
          ? sent.program.slice(0, question.programCells).map((v) => (Number.isInteger(v) ? Number(v) & 255 : 0))
          : null;
        if (!program) return { correct: false, points: 0 };
        const shown = runWritten(question, program, question.memory) === question.expected;
        const general = question.checks.every(
          (data) => runWritten(question, program, data) === expectedOf(question.terms, data),
        );
        if (shown && general) return { correct: true, points: speedPoints(seconds, 0.5, 60) };
        // Right on the numbers shown and wrong on any others: the program
        // landed on the answer rather than computing it.
        return { correct: false, points: shown ? 40 : 0 };
      }
    }
  },
};

export default createStageGame(rechnerSpec, [
  bauenStage,
  evaStage,
  binaerStage,
  farbcodeStage,
  rechnenStage,
  gatterStage,
  prozessorStage,
]);
