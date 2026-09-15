// Bauchgefühl — seven stations that ask the player to look rather than to know.
//
// Every generator here has the same job: produce something a person can have a
// feeling about within a second of seeing it, and grade the feeling honestly.
// That mostly means partial credit. A player who mixed a colour that is nearly
// right, pulled six of eight wires apart or found the second-best route has
// done the thinking the station is about, and a round where half the class
// scores nothing is a round nobody asks to play again.

import { intuitionSpec } from "../../shared/games/intuition";
import type {
  ColorQuestion,
  DialQuestion,
  LampQuestion,
  PixelQuestion,
  RouteQuestion,
  Rgb,
  SwapAnswer,
  SwapQuestion,
  Target,
  TargetBatch,
  TargetRoundExtra,
  LightRoundExtra,
  LightTap,
  UntangleAnswer,
  UntangleQuestion,
} from "../../shared/games/intuition";
import {
  buildPlanarGraph,
  countCrossings,
  distance,
  pathCost,
  shortestPath,
  type Point,
} from "../../shared/intuition-graph";
import { shiftText } from "../../shared/intuition-cipher";
import { closenessPoints, liveScore, liveTally, speedPoints } from "../../shared/framework";
import type { StageHandler } from "../framework";
import { createStageGame, recordLiveEvent } from "../framework";

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

/** Builds `count` questions from a generator and numbers them. */
function build<Q extends object>(count: number, make: (index: number) => Q): (Q & { id: number })[] {
  return Array.from({ length: count }, (_, id) => ({ ...make(id), id }));
}

/** Whatever the client sent, as JSON, or null when it was not JSON at all. */
function parseAnswer<T>(answer: string): T | null {
  try {
    return JSON.parse(answer) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// farbe — three sliders and an eye
// ---------------------------------------------------------------------------

/** The furthest two colours can be from each other: black to white. */
const MAX_COLOR_DISTANCE = Math.sqrt(3 * 255 * 255);

/**
 * How far off the mix was, as a share of that.
 *
 * Scored against a quarter of the range rather than the whole of it: being
 * half a colour wheel out is not "half right", and a player who is within
 * about twenty per channel should feel rewarded rather than corrected.
 */
const COLOR_ZERO_AT = 0.25;

/** Closer than this and the two halves of the seam are the same colour to look
 *  at — about 2% of the longest distance there is between two colours. */
const EXACT_ENOUGH = MAX_COLOR_DISTANCE * 0.02;

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function colorTask(step: number): Omit<ColorQuestion, "id"> {
  // A channel that lands on a step the sliders can actually reach, so a
  // careful player can match the colour exactly instead of almost.
  const channel = () => Math.min(255, randomInt(0, Math.floor(255 / step)) * step);
  let target = { r: channel(), g: channel(), b: channel() };
  // Near-black and near-white are the same puzzle every time: no hue to read.
  for (let attempt = 0; attempt < 20; attempt++) {
    const total = target.r + target.g + target.b;
    const spread = Math.max(target.r, target.g, target.b) - Math.min(target.r, target.g, target.b);
    if (total > 120 && total < 620 && spread > 40) break;
    target = { r: channel(), g: channel(), b: channel() };
  }
  return { target, step };
}

const farbeStage: StageHandler<ColorQuestion> = {
  id: "farbe",

  createQuestions({ settings }) {
    const step = settings.colorPrecision === "fein" ? 1 : 16;
    return build(Number(settings.questionsPerRound), () => colorTask(step));
  },

  evaluate(question, answer) {
    const mixed = parseAnswer<Rgb>(answer);
    if (
      !mixed ||
      ![mixed.r, mixed.g, mixed.b].every((value) => typeof value === "number" && isFinite(value))
    ) {
      return { correct: false, points: 0 };
    }
    const clamped: Rgb = {
      r: Math.max(0, Math.min(255, mixed.r)),
      g: Math.max(0, Math.min(255, mixed.g)),
      b: Math.max(0, Math.min(255, mixed.b)),
    };
    const distance = colorDistance(clamped, question.target);
    const points = closenessPoints(distance / MAX_COLOR_DISTANCE, COLOR_ZERO_AT);
    // "Correct" is what the tick in the review means, so it is reserved for a
    // mix nobody could tell from the target — but on the coarse sliders one
    // click is 16, and a tolerance of 9 made the nearest miss a mix that looks
    // identical and is marked wrong. A station that hands out big steps cannot
    // then ask for an accuracy smaller than a step.
    return { correct: distance <= Math.max(EXACT_ENOUGH, question.step), points: Math.round(points) };
  },
};

// ---------------------------------------------------------------------------
// lampen — place value, with the word taken off
// ---------------------------------------------------------------------------

/** Lamps worth 1, 2, 4, 8 … — the binary station in disguise. */
function doubleLamps(count: number): number[] {
  return Array.from({ length: count }, (_, index) => 2 ** index);
}

/** Lamps worth what coins are worth: the same game, a different arithmetic. */
function coinLamps(count: number): number[] {
  return [1, 2, 5, 10, 20, 50, 100, 200].slice(0, count);
}

/**
 * The lamps stay in the order they are worth, smallest first.
 *
 * A shuffled row was a second puzzle sitting on top of the first — find the
 * lamp, then do the arithmetic — and finding the lamp is not what this station
 * is about. In order, the row reads like the place values it is teaching.
 */
function lampTask(values: number[]): Omit<LampQuestion, "id"> {
  const maximum = values.reduce((sum, value) => sum + value, 0);
  // Draw the target by lighting lamps rather than by picking a number, so it
  // is always reachable — with coins, most numbers are not.
  let target = values[0] + values[1];
  for (let attempt = 0; attempt < 40; attempt++) {
    const lit = values.filter(() => Math.random() < 0.5);
    const sum = lit.reduce((total, value) => total + value, 0);
    // A target that one lamp already carries is one tap, and a target that
    // needs every lamp is the same tap eight times. Neither is a puzzle.
    if (lit.length >= 2 && lit.length < values.length && !values.includes(sum)) {
      target = sum;
      break;
    }
  }
  return { values: [...values].sort((a, b) => a - b), target, maximum };
}

const lampenStage: StageHandler<LampQuestion> = {
  id: "lampen",

  createQuestions({ settings }) {
    const mode = String(settings.lampValues);
    const count = Number(settings.lampCount);
    return build(Number(settings.questionsPerRound), () => {
      const useCoins = mode === "coins" || (mode === "mixed" && Math.random() < 0.4);
      const values = useCoins ? coinLamps(count) : doubleLamps(count);
      return lampTask(values);
    });
  },

  evaluate(question, answer, timing) {
    const value = Number(answer);
    if (!isFinite(value)) return { correct: false, points: 0 };
    if (value === question.target) {
      return { correct: true, points: speedPoints(timing.questionMs / 1000, 4, 40) };
    }
    // Off by one lamp is a different thing from off by everything.
    const error = Math.abs(value - question.target) / Math.max(1, question.maximum);
    return { correct: false, points: Math.round(0.3 * closenessPoints(error, 0.3)) };
  },
};

// ---------------------------------------------------------------------------
// pixel — how few blocks does it take to recognise something?
// ---------------------------------------------------------------------------

/**
 * Glyphs with a silhouette strong enough to survive four blocks across, and a
 * name a Jahrgang 5 knows. No glyph that needs a variation selector: those
 * render as a black-and-white outline on some systems and in full colour on
 * others, and the station is largely about the colour.
 */
const THINGS: { glyph: string; key: string }[] = [
  { glyph: "🍕", key: "pizza" },
  { glyph: "🍌", key: "banane" },
  { glyph: "🐧", key: "pinguin" },
  { glyph: "🌳", key: "baum" },
  { glyph: "🚗", key: "auto" },
  { glyph: "🏠", key: "haus" },
  { glyph: "🐟", key: "fisch" },
  { glyph: "🍓", key: "erdbeere" },
  { glyph: "🌙", key: "mond" },
  { glyph: "⭐", key: "stern" },
  { glyph: "🐝", key: "biene" },
  { glyph: "🦋", key: "schmetterling" },
  { glyph: "🍎", key: "apfel" },
  { glyph: "🐘", key: "elefant" },
  { glyph: "🚀", key: "rakete" },
  { glyph: "🎈", key: "ballon" },
  { glyph: "🐸", key: "frosch" },
  { glyph: "🍔", key: "burger" },
  { glyph: "🐼", key: "panda" },
  { glyph: "🌻", key: "sonnenblume" },
  { glyph: "🚲", key: "fahrrad" },
  { glyph: "🎸", key: "gitarre" },
  { glyph: "🐙", key: "krake" },
  { glyph: "🍄", key: "pilz" },
];

const REVEAL_SECONDS: Record<string, number> = { langsam: 1.6, normal: 1.1, schnell: 0.7 };

function pixelTask(
  right: (typeof THINGS)[number],
  stepSeconds: number,
): Omit<PixelQuestion, "id"> {
  const wrong = shuffle(THINGS.filter((thing) => thing.key !== right.key)).slice(0, 3);
  const options = shuffle([right, ...wrong]);
  return {
    glyph: right.glyph,
    options: options.map((thing) => `games.intuition.things.${thing.key}`),
    answerIndex: options.indexOf(right),
    stepSeconds,
  };
}

const pixelStage: StageHandler<PixelQuestion> = {
  id: "pixel",

  createQuestions({ settings }) {
    const stepSeconds = REVEAL_SECONDS[String(settings.revealSpeed)] ?? REVEAL_SECONDS.normal;
    const count = Number(settings.questionsPerRound);
    // Dealt from one shuffled pack: being asked about the same banana twice in
    // a round is the second time a free point rather than a question.
    const picture = shuffle(THINGS);
    return build(count, (index) => pixelTask(picture[index % picture.length], stepSeconds));
  },

  evaluate(question, answer, timing) {
    const correct = Number(answer) === question.answerIndex;
    // Steep enough that waiting costs, shallow enough that it never pays to
    // stab at one of the four straight away: a blind guess is worth a quarter
    // of 100, and waiting the few seconds it takes to actually see the thing
    // is worth about twice that.
    return { correct, points: correct ? speedPoints(timing.questionMs / 1000, 6, 30) : 0 };
  },
};

// ---------------------------------------------------------------------------
// drehen — turn the ring until there are words
// ---------------------------------------------------------------------------

/** Everyday German without an umlaut in sight, so 26 letters are enough. */
const PHRASES = [
  "DER KAFFEE IST SCHON WIEDER KALT",
  "MORGEN FAELLT DIE ERSTE STUNDE AUS",
  "DAS WLAN IST WIEDER WEG",
  "WER HAT DEN BEAMER AUSGEMACHT",
  "IM KELLER STEHT EIN ALTER DRUCKER",
  "DIE MENSA HAT HEUTE NUDELN",
  "NIMM DEN ZWEITEN GANG NACH LINKS",
  "MEIN AKKU IST GLEICH LEER",
  "HINTER DEM REGAL LIEGT DER SCHLUESSEL",
  "NACH DER PAUSE GEHT ES WEITER",
  "DIE KATZE SITZT AUF DEM DACH",
  "BITTE NICHT AUF DEN KNOPF DRUECKEN",
  "DER BUS FAEHRT UM VIERTEL NACH",
  "HEUTE SCHEINT ENDLICH DIE SONNE",
  "ICH HABE DIE HAUSAUFGABEN VERGESSEN",
  "AM FREITAG SCHREIBEN WIR EINE ARBEIT",
  "DAS PASSWORT STEHT AUF EINEM ZETTEL",
  "UNTER DER TREPPE IST EIN VERSTECK",
  "DER HUND HAT MEIN HEFT GEFRESSEN",
  "ZWEI PIZZEN UND EINE COLA BITTE",
  "DIE TUER KLEMMT SCHON WIEDER",
  "SCHALTE BITTE DAS LICHT AUS",
  "IM SOMMER FAHREN WIR ANS MEER",
  "DAS FAHRRAD STEHT VOR DER SCHULE",
];

function dialTask(withHint: boolean): Omit<DialQuestion, "id"> {
  // Never zero: a message that is already readable has nothing to turn.
  const shift = randomInt(1, 25);
  return { cipher: shiftText(pick(PHRASES), shift), shift, withHint };
}

const drehenStage: StageHandler<DialQuestion> = {
  id: "drehen",

  createQuestions({ settings }) {
    const withHint = settings.withFrequencyHint === true;
    return build(Number(settings.questionsPerRound), () => dialTask(withHint));
  },

  evaluate(question, answer, timing) {
    const dialled = Number(answer);
    if (!isFinite(dialled)) return { correct: false, points: 0 };
    const correct = ((dialled % 26) + 26) % 26 === question.shift;
    return { correct, points: correct ? speedPoints(timing.questionMs / 1000, 2, 40) : 0 };
  },
};

// ---------------------------------------------------------------------------
// kabel — pull the wires apart
// ---------------------------------------------------------------------------

/**
 * The graph is built in a drawing that has no crossings and then has its
 * positions dealt out again, so a solution provably exists — it is the layout
 * the graph was born in — while the player never sees it.
 */
function untangleTask(nodeCount: number): Omit<UntangleQuestion, "id"> {
  const graph = buildPlanarGraph(nodeCount);
  let nodes = graph.nodes;
  let crossings = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    const scrambled = shuffle(graph.nodes);
    const count = countCrossings(scrambled, graph.edges);
    if (count > crossings) {
      nodes = scrambled;
      crossings = count;
    }
    if (crossings >= 3) break;
  }
  return { nodes, edges: graph.edges, startCrossings: Math.max(1, crossings) };
}

const kabelStage: StageHandler<UntangleQuestion> = {
  id: "kabel",

  createQuestions({ settings }) {
    const nodeCount = Number(settings.nodeCount);
    return build(Number(settings.questionsPerRound), () => untangleTask(nodeCount));
  },

  evaluate(question, answer, timing) {
    const sent = parseAnswer<UntangleAnswer>(answer);
    const nodes = sent?.nodes;
    // The client is not trusted with the verdict: the crossings are counted
    // again here, from the positions it says the player left the dots in.
    if (!Array.isArray(nodes) || nodes.length !== question.nodes.length) {
      return { correct: false, points: 0 };
    }
    const clean: Point[] = nodes.map((node) => ({
      x: Math.max(0, Math.min(100, Number(node?.x))),
      y: Math.max(0, Math.min(100, Number(node?.y))),
    }));
    if (clean.some((node) => !isFinite(node.x) || !isFinite(node.y))) {
      return { correct: false, points: 0 };
    }
    const left = countCrossings(clean, question.edges);
    if (left === 0) return { correct: true, points: speedPoints(timing.questionMs / 1000, 1, 60) };
    // Six of eight wires pulled apart is most of the puzzle solved.
    const removed = Math.max(0, question.startCrossings - left) / question.startCrossings;
    return { correct: false, points: Math.round(50 * removed) };
  },
};

// ---------------------------------------------------------------------------
// weg — the quickest way is never the one that looks shortest
// ---------------------------------------------------------------------------

/** How often a road is a country lane, and how much longer it then takes. */
const SLOW_ROAD_CHANCE = 0.35;
const SLOW_ROAD_FACTOR = 2.5;

function routeTask(nodeCount: number): Omit<RouteQuestion, "id"> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const graph = buildPlanarGraph(nodeCount, 3);
    // Minutes follow the drawn length, and then about a third of the roads
    // turn out to be slow ones. Without that, the route that looks shortest is
    // already the quickest four times out of five and there is nothing to
    // read; with it, a glance is right about half the time — good enough that
    // a gut feeling is worth having, wrong often enough that the numbers on
    // the roads are worth a look.
    const edges = graph.edges.map((edge) => {
      const straight =
        Math.round(distance(graph.nodes[edge.a], graph.nodes[edge.b]) / 6) + randomInt(-1, 2);
      const slow = Math.random() < SLOW_ROAD_CHANCE;
      return { ...edge, weight: Math.max(1, Math.round(straight * (slow ? SLOW_ROAD_FACTOR : 1))) };
    });
    const weighted = { nodes: graph.nodes, edges };

    // Start and goal far apart, so the route has something to decide.
    let from = 0;
    let to = 0;
    let far = -1;
    for (let a = 0; a < nodeCount; a++) {
      for (let b = a + 1; b < nodeCount; b++) {
        const apart = distance(graph.nodes[a], graph.nodes[b]);
        if (apart > far) {
          far = apart;
          from = a;
          to = b;
        }
      }
    }

    const best = shortestPath(weighted, from, to);
    // Two nodes next to each other make the answer one tap; not a question.
    if (best.path.length >= 3 && isFinite(best.cost)) {
      return { nodes: graph.nodes, edges, from, to, best: best.cost };
    }
  }
  const graph = buildPlanarGraph(nodeCount, 3);
  const edges = graph.edges.map((edge) => ({ ...edge, weight: 1 }));
  const best = shortestPath({ nodes: graph.nodes, edges }, 0, nodeCount - 1);
  return { nodes: graph.nodes, edges, from: 0, to: nodeCount - 1, best: best.cost };
}

const wegStage: StageHandler<RouteQuestion> = {
  id: "weg",

  createQuestions({ settings }) {
    const nodeCount = Number(settings.mapSize);
    return build(Number(settings.questionsPerRound), () => routeTask(nodeCount));
  },

  evaluate(question, answer, timing) {
    const path = parseAnswer<number[]>(answer);
    if (!Array.isArray(path)) return { correct: false, points: 0 };
    const cost = pathCost(
      { nodes: question.nodes, edges: question.edges },
      path.map(Number),
      question.from,
      question.to,
    );
    // A route that does not exist on this map is not a slow route.
    if (cost == null) return { correct: false, points: 0 };
    if (cost <= question.best) {
      return { correct: true, points: speedPoints(timing.questionMs / 1000, 2, 50) };
    }
    // A detour of a few minutes still found a way across the map.
    const excess = (cost - question.best) / question.best;
    return { correct: false, points: Math.round(0.6 * closenessPoints(excess, 0.6)) };
  },
};

// ---------------------------------------------------------------------------
// nachbarn — sorting when you may only ever swap two that touch
// ---------------------------------------------------------------------------

/** The fewest neighbouring swaps that sort a row: its number of inversions. */
function inversions(values: number[]): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] > values[j]) total++;
    }
  }
  return total;
}

function swapTask(cardCount: number): Omit<SwapQuestion, "id"> {
  const pool = shuffle(Array.from({ length: 40 }, (_, index) => index + 5)).slice(0, cardCount);
  let values = shuffle(pool);
  // A row that is already nearly sorted is over before it starts; one that is
  // exactly reversed is the same puzzle every time.
  const most = (cardCount * (cardCount - 1)) / 2;
  for (let attempt = 0; attempt < 30; attempt++) {
    const count = inversions(values);
    if (count >= Math.ceil(most / 3) && count < most) break;
    values = shuffle(pool);
  }
  return { values, minSwaps: inversions(values) };
}

/** Replays the taps the player made and says where the cards ended up. */
function replaySwaps(values: number[], swaps: number[]): number[] | null {
  const row = [...values];
  for (const at of swaps) {
    if (!Number.isInteger(at) || at < 0 || at + 1 >= row.length) return null;
    [row[at], row[at + 1]] = [row[at + 1], row[at]];
  }
  return row;
}

function sortedShare(values: number[]): number {
  if (values.length < 2) return 1;
  let inOrder = 0;
  for (let i = 0; i + 1 < values.length; i++) {
    if (values[i] <= values[i + 1]) inOrder++;
  }
  return inOrder / (values.length - 1);
}

const nachbarnStage: StageHandler<SwapQuestion> = {
  id: "nachbarn",

  createQuestions({ settings }) {
    const cardCount = Number(settings.cardCount);
    return build(Number(settings.questionsPerRound), () => swapTask(cardCount));
  },

  evaluate(question, answer, timing) {
    const sent = parseAnswer<SwapAnswer>(answer);
    const swaps = sent?.swaps;
    // The taps are replayed here rather than taken on trust, which is also how
    // the move count is known: it is how many of them there were.
    if (!Array.isArray(swaps) || swaps.length > 200) return { correct: false, points: 0 };
    const row = replaySwaps(question.values, swaps.map(Number));
    if (!row) return { correct: false, points: 0 };

    const isSorted = row.every((value, index) => index === 0 || row[index - 1] <= value);
    if (!isSorted) return { correct: false, points: Math.round(25 * sortedShare(row)) };
    if (swaps.length <= question.minSwaps) {
      return { correct: true, points: speedPoints(timing.questionMs / 1000, 1, 60) };
    }
    // Sorted, but the long way round: still most of the points.
    return { correct: false, points: Math.round(60 * (question.minSwaps / swaps.length)) };
  },
};

// ---------------------------------------------------------------------------
// ziele — the live one: targets appear, shrink and are gone
// ---------------------------------------------------------------------------

/**
 * Faster than this and nobody reacted to anything — they either guessed where
 * the next one would be or they are not a person. Either way it is not a hit.
 */
const MIN_REACTION_MS = 120;

/** Most events one report may carry, so a bad client cannot flood the round. */
const MAX_BATCH = 50;

const TARGET_LIFE: Record<string, number> = { gemuetlich: 1900, normal: 1300, flink: 900 };
const TARGET_SIZE: Record<string, number> = { gross: 9, normal: 6.5, klein: 4.5 };

/**
 * The whole round, laid out before it starts.
 *
 * The timeline goes to the player's device rather than being fed target by
 * target, because a target that appears when the network says so is a target
 * that appears at a different moment on thirty devices. What the device cannot
 * do is award itself points: it reports when each target was hit, and the
 * server decides what that was worth.
 */
function buildTimeline(durationSeconds: number, life: number, radius: number): Target[] {
  const gap = Math.round(life * 0.7);
  const targets: Target[] = [];
  let previous: { x: number; y: number } | null = null;

  for (let at = 400; at + life < durationSeconds * 1000; at += gap) {
    let spot = { x: randomInt(12, 88), y: randomInt(12, 88) };
    // Never twice in nearly the same place: that is a drill in holding still,
    // not in aiming.
    for (let attempt = 0; attempt < 30 && previous; attempt++) {
      if (Math.hypot(spot.x - previous.x, spot.y - previous.y) >= 28) break;
      spot = { x: randomInt(12, 88), y: randomInt(12, 88) };
    }
    previous = spot;
    targets.push({ id: targets.length, at, life, x: spot.x, y: spot.y, r: radius });
  }
  return targets;
}

const zieleStage: StageHandler = {
  id: "ziele",
  live: true,
  // Nothing here moves on its own: the board is running on the player's device
  // and the tick exists only to carry the scoreboard. Beating any faster would
  // mean sending a fifty-target timeline that never changes several times a
  // second to every device in the room.
  tickMs: 1000,

  createQuestions: () => [],

  createExtra({ settings }) {
    const life = TARGET_LIFE[String(settings.targetLife)] ?? TARGET_LIFE.normal;
    const radius = TARGET_SIZE[String(settings.targetSize)] ?? TARGET_SIZE.normal;
    const targets = buildTimeline(Number(settings.duration), life, radius);
    const extra: TargetRoundExtra = { targets };
    // Every target of the timeline appears inside the round, so the round
    // offers all of them from the start.
    return { ...extra, offered: targets.length };
  },

  // Nothing is answered question by question here; everything arrives as a
  // report of targets that have come and gone.
  evaluate: () => ({ correct: false, points: 0 }),

  onAction(data, payload, playerId) {
    if (payload.action !== "hits") return false;
    const batch = payload as unknown as TargetBatch;
    if (!Array.isArray(batch.events) || batch.events.length > MAX_BATCH) return false;

    const { targets } = data.extra as unknown as TargetRoundExtra;
    let changed = false;

    for (const event of batch.events) {
      const tally = liveTally(data, playerId);
      // Targets are resolved in order and exactly once, so the next one a
      // player may report is the one after everything they have reported so
      // far. That is the whole replay protection, and it needs no bookkeeping.
      const next = tally.hits + tally.misses;
      if (Number(event?.id) !== next) continue;
      const target = targets[next];
      if (!target) continue;

      const ms = event.ms == null ? null : Number(event.ms);
      const hit = ms != null && isFinite(ms) && ms >= MIN_REACTION_MS && ms <= target.life;
      recordLiveEvent(data, playerId, {
        correct: hit,
        // Full marks the instant it appears, nothing by the time it goes, and
        // never less than a token for getting there at all.
        points: hit ? Math.max(25, closenessPoints(ms / target.life)) : 0,
        ms: hit ? ms : undefined,
      });
      changed = true;
    }
    return changed;
  },

  scorePlayer: (data, playerId) => liveScore(data, playerId),
};

// ---------------------------------------------------------------------------
// ampel — the other live one: wait for green, and do not jump
// ---------------------------------------------------------------------------

/** How long a green light waits to be hit before it counts as missed. */
const GO_WINDOW_MS = 2000;

/**
 * Reaction worth everything, and reaction worth nothing.
 *
 * Both are set for a finger on a touchscreen, not for a thumb on a switch. A
 * measurement here is a true reaction plus the time the display takes to show
 * the green and the panel takes to report the touch — together most of a tenth
 * of a second, and none of it the player's. A class lands around 330ms, and a
 * quick one gets near 250. Anything under 250 as the top of the scale is a top
 * nobody in the room can reach, which wastes the half of the scale where the
 * difference between a fast player and a very fast one would show.
 */
const PERFECT_MS = 250;
const HOPELESS_MS = 650;

const WAIT_SPREAD: Record<string, [number, number]> = {
  kurz: [1000, 2500],
  normal: [1500, 4000],
  lang: [2000, 6000],
};

function nextWait(settings: Record<string, unknown>): number {
  const [from, to] = WAIT_SPREAD[String(settings.waitSpread)] ?? WAIT_SPREAD.normal;
  return randomInt(from, to);
}

/**
 * The light nobody can see coming.
 *
 * When it turns green is decided here, on the tick, and sent out — so it is
 * not in anything the device was given in advance. It could not be: a station
 * whose answer is "how fast can you react" is the one station where knowing
 * the moment in advance replaces the whole exercise.
 *
 * What the device does measure is the gap between the green arriving *there*
 * and the tap. A slow connection then means the light turns green late rather
 * than that the player looks slow, which on school wifi is the difference
 * between a reaction test and a broadband test.
 */
const ampelStage: StageHandler = {
  id: "ampel",
  live: true,
  // This one does move on its own, and the moment it moves is the whole
  // station, so it beats quickly — it can afford to, carrying no timeline.
  tickMs: 250,

  createQuestions: () => [],

  createExtra({ settings }) {
    const extra: LightRoundExtra = {
      light: 0,
      phase: "wait",
      since: Date.now(),
      waitMs: nextWait(settings),
      tapped: {},
    };
    return { ...extra };
  },

  evaluate: () => ({ correct: false, points: 0 }),

  onBegin(data, now) {
    // The first light has been counting down behind the rules screen, so
    // without this it turns green the instant the round starts.
    (data.extra as unknown as LightRoundExtra).since = now;
  },

  onTick(data, now, ctx) {
    const extra = data.extra as unknown as LightRoundExtra;

    if (extra.phase === "wait") {
      if (now - extra.since < extra.waitMs) return false;
      extra.phase = "go";
      extra.since = now;
      return true;
    }

    if (now - extra.since < GO_WINDOW_MS) return false;
    // The light is going out: everyone who never touched it missed it.
    for (const player of ctx.players) {
      if (extra.tapped[player.id] === extra.light) continue;
      extra.tapped[player.id] = extra.light;
      recordLiveEvent(data, player.id, { correct: false, points: 0 });
    }
    extra.light += 1;
    // Counted as offered only now that it is settled for everybody. A light
    // still in the air would drag every score down until it lands, and one
    // the clock cuts short was never really offered at all.
    (data.extra as { offered?: number }).offered = extra.light;
    extra.phase = "wait";
    extra.since = now;
    extra.waitMs = nextWait(ctx.settings);
    return true;
  },

  onAction(data, payload, playerId) {
    if (payload.action !== "tap") return false;
    const tap = payload as unknown as LightTap;
    const extra = data.extra as unknown as LightRoundExtra;

    // Only the light that is up, and only once.
    if (Number(tap.light) !== extra.light) return false;
    if (extra.tapped[playerId] === extra.light) return false;
    extra.tapped[playerId] = extra.light;

    // Tapped while it was still red: a false start costs the light.
    if (tap.ms == null || extra.phase !== "go") {
      recordLiveEvent(data, playerId, { correct: false, points: 0 });
      return true;
    }

    const ms = Number(tap.ms);
    const real = isFinite(ms) && ms >= MIN_REACTION_MS && ms <= GO_WINDOW_MS;
    recordLiveEvent(data, playerId, {
      correct: real,
      points: real
        ? // Clamped at zero: closenessPoints treats a negative error as
          // nonsense input and scores it zero, so a reaction quicker than
          // PERFECT_MS would land on the floor instead of the ceiling —
          // exactly backwards, and aimed at the fastest player in the room.
          Math.max(10, closenessPoints(Math.max(0, (ms - PERFECT_MS) / (HOPELESS_MS - PERFECT_MS))))
        : 0,
      ms: real ? ms : undefined,
    });
    return true;
  },

  scorePlayer: (data, playerId) => liveScore(data, playerId),
};

export default createStageGame(intuitionSpec, [
  farbeStage,
  lampenStage,
  pixelStage,
  drehenStage,
  kabelStage,
  wegStage,
  zieleStage,
  ampelStage,
  nachbarnStage,
] as StageHandler[]);
