import type { GameSpec, SettingsField, StageQuestion } from "../framework";
import type { Edge, Point } from "../intuition-graph";

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

const count = (key: string, options: number[], value: number): SettingsField => ({
  type: "select",
  key,
  labelKey: `settings.${key}`,
  options,
  default: value,
});

/**
 * Bauchgefühl — the game anybody can play.
 *
 * Every other game in here asks the player to know something. This one asks
 * them to look, and the rules of each station fit in one sentence: match the
 * colour, hit the number, say what the picture is, turn the ring until there
 * are words, pull the wires apart, find the quickest way, put the cards in
 * order. Nothing on screen is a technical term, and the first question of a
 * round teaches the rule by being played.
 *
 * Underneath, each station is one idea from the subject with its vocabulary
 * taken off — place value, resolution, a shift cipher, a planar drawing, a
 * shortest path, sorting by neighbouring swaps. That is the point rather than
 * a joke at the player's expense: a class that has spent ten minutes flicking
 * lamps worth 1, 2, 4 and 8 has somewhere to stand when the word "Dualsystem"
 * turns up later.
 *
 * It carries no `grades` on purpose. The stations work in a Jahrgang 5 lesson
 * and in a Q2 course, and a badge saying "5, 6" would only tell the wrong half
 * of the school to stay away.
 */
export const intuitionSpec: GameSpec = {
  id: "intuition",
  titleKey: "games.intuition.title",
  descriptionKey: "games.intuition.description",
  category: "cs",
  grades: [],
  icon: "🧠",
  color: "fuchsia",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "farbe",
      nameKey: "games.intuition.stages.farbe.name",
      summaryKey: "games.intuition.stages.farbe.summary",
      rulesKey: "games.intuition.stages.farbe.rules",
      settings: [
        questionsPerRound([3, 5, 8], 5),
        duration(90),
        choice("colorPrecision", ["grob", "fein"], "grob"),
      ],
    },
    {
      id: "lampen",
      nameKey: "games.intuition.stages.lampen.name",
      summaryKey: "games.intuition.stages.lampen.summary",
      rulesKey: "games.intuition.stages.lampen.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(90),
        choice("lampValues", ["mixed", "double", "coins"], "mixed"),
        count("lampCount", [4, 5, 6, 8], 6),
      ],
    },
    {
      id: "pixel",
      nameKey: "games.intuition.stages.pixel.name",
      summaryKey: "games.intuition.stages.pixel.summary",
      rulesKey: "games.intuition.stages.pixel.rules",
      settings: [
        questionsPerRound([5, 8, 12], 8),
        duration(120),
        choice("revealSpeed", ["langsam", "normal", "schnell"], "normal"),
      ],
    },
    {
      id: "drehen",
      nameKey: "games.intuition.stages.drehen.name",
      summaryKey: "games.intuition.stages.drehen.summary",
      rulesKey: "games.intuition.stages.drehen.rules",
      settings: [
        questionsPerRound([3, 5, 8], 5),
        duration(120),
        toggle("withFrequencyHint", false),
      ],
    },
    {
      id: "kabel",
      nameKey: "games.intuition.stages.kabel.name",
      summaryKey: "games.intuition.stages.kabel.summary",
      rulesKey: "games.intuition.stages.kabel.rules",
      settings: [questionsPerRound([2, 3, 5], 3), duration(150, 240), count("nodeCount", [5, 6, 7, 8], 6)],
    },
    {
      id: "weg",
      nameKey: "games.intuition.stages.weg.name",
      summaryKey: "games.intuition.stages.weg.summary",
      rulesKey: "games.intuition.stages.weg.rules",
      settings: [questionsPerRound([3, 5, 8], 5), duration(120, 240), count("mapSize", [6, 7, 8, 9], 7)],
    },
    {
      id: "ziele",
      nameKey: "games.intuition.stages.ziele.name",
      summaryKey: "games.intuition.stages.ziele.summary",
      rulesKey: "games.intuition.stages.ziele.rules",
      // No questionsPerRound: how many targets there are follows from how long
      // the round lasts and how long each one stays.
      settings: [
        duration(45, 120),
        choice("targetLife", ["gemuetlich", "normal", "flink"], "normal"),
        choice("targetSize", ["gross", "normal", "klein"], "normal"),
      ],
    },
    {
      id: "ampel",
      nameKey: "games.intuition.stages.ampel.name",
      summaryKey: "games.intuition.stages.ampel.summary",
      rulesKey: "games.intuition.stages.ampel.rules",
      settings: [duration(60, 120), choice("waitSpread", ["kurz", "normal", "lang"], "normal")],
    },
    {
      id: "nachbarn",
      nameKey: "games.intuition.stages.nachbarn.name",
      summaryKey: "games.intuition.stages.nachbarn.summary",
      rulesKey: "games.intuition.stages.nachbarn.rules",
      settings: [questionsPerRound([3, 5, 8], 5), duration(120), count("cardCount", [4, 5, 6, 7], 5)],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — built on the server, rendered on the client
// ---------------------------------------------------------------------------

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Match this colour with three sliders. */
export interface ColorQuestion extends StageQuestion {
  target: Rgb;
  /** How far one step of a slider moves — 1 is fine, 16 is forgiving. */
  step: number;
}

/** Switch lamps on until their values add up to the number asked for. */
export interface LampQuestion extends StageQuestion {
  /** What each lamp is worth, in the order they are shown. */
  values: number[];
  target: number;
  /** The largest number these lamps can make, for partial credit. */
  maximum: number;
}

/** A picture that starts as a handful of blocks and sharpens. What is it? */
export interface PixelQuestion extends StageQuestion {
  /** The glyph the client renders and then pixelates. */
  glyph: string;
  /** i18n keys under `games.intuition.things`. */
  options: string[];
  answerIndex: number;
  /** Seconds per sharpening step, from the host's setting. */
  stepSeconds: number;
}

/**
 * Turn the ring until the letters make words.
 *
 * The shift is in here, like the expected answer of every other game in the
 * app: a player who opens the network tab can read it, and one who does has
 * worked harder than the question deserved.
 */
export interface DialQuestion extends StageQuestion {
  cipher: string;
  shift: number;
  withHint: boolean;
}

/** Drag the dots until no two wires cross. */
export interface UntangleQuestion extends StageQuestion {
  /** The scrambled positions the player starts from. */
  nodes: Point[];
  edges: Edge[];
  /** Crossings in the starting layout, for partial credit. */
  startCrossings: number;
}

/** Tap your way from the green dot to the red one, as quickly as the map allows. */
export interface RouteQuestion extends StageQuestion {
  nodes: Point[];
  edges: Edge[];
  from: number;
  to: number;
  /** Minutes the best route takes. */
  best: number;
}

/** Sort the cards, but only ever swap two that are side by side. */
export interface SwapQuestion extends StageQuestion {
  values: number[];
  /** The fewest swaps that can sort them — the number of inversions. */
  minSwaps: number;
}

// ---------------------------------------------------------------------------
// The two live stations
// ---------------------------------------------------------------------------

/** One target of the shooting gallery, on the round's own timeline. */
export interface Target {
  /** Its place in the timeline; targets are resolved in this order. */
  id: number;
  /** When it appears, milliseconds after the round started. */
  at: number;
  /** How long it stays before it is gone. */
  life: number;
  /** Where, in the same 0-100 box the maps use. */
  x: number;
  y: number;
  /** Radius when it appears; it shrinks to `SHRINK_TO` of that as it ages. */
  r: number;
}

/** How small a target gets by the end of its life — never nothing, or the last
 *  moments of it would be unhittable rather than merely hard. */
export const SHRINK_TO = 0.35;

/**
 * Under this, nobody saw the target: they were already on their way down when
 * it appeared, or they are tapping the board like a drum. The server refuses
 * such a tap, and the board says so where it happened — otherwise the fastest
 * taps of the round are the ones that silently score nothing.
 */
export const MIN_REACTION_MS = 120;

/** What a live round of the shooting gallery keeps in `extra`, beside the tally. */
export interface TargetRoundExtra {
  targets: Target[];
}

/** One resolved target, as the player's device reports it. */
export interface TargetEvent {
  id: number;
  /** Milliseconds after the target appeared, or null when it was missed. */
  ms: number | null;
}

export interface TargetBatch {
  events: TargetEvent[];
}

/** Where the traffic light is, for everybody at once. */
export interface LightRoundExtra {
  /** Which light of the round this is, counting from zero. */
  light: number;
  phase: "wait" | "go";
  /** Server clock reading when this phase began. */
  since: number;
  /** How long "wait" lasts this time — never sent while it is still waiting. */
  waitMs: number;
  /** Highest light each player has already answered. */
  tapped: Record<string, number>;
}

/** What a player sends when they hit the light — or jump the gun. */
export interface LightTap {
  light: number;
  /**
   * Milliseconds between this device showing green and the tap, measured on
   * the device: a slow connection then delays when the light arrives rather
   * than making the player look slow. Null means they tapped while it was red.
   */
  ms: number | null;
}

/** What the player sends back from the untangling station. */
export interface UntangleAnswer {
  nodes: Point[];
}

/** What the player sends back from the swapping station: which gaps they tapped. */
export interface SwapAnswer {
  /** Each entry is a position `i`, meaning "swap the cards at i and i+1". */
  swaps: number[];
}
