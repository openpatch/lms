import type { GameSpec, SettingsField, StageQuestion, StageSettings } from "../framework";

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

const duration = (value: number, min = 60, max = 240): SettingsField => ({
  type: "range",
  key: "duration",
  labelKey: "settings.duration",
  min,
  max,
  step: 15,
  default: value,
  unit: "s",
});

/**
 * The model a situation or a graph follows. "weder" is the EdM's "weder
 * noch" — a linear Zuordnung with an Achsenabschnitt, or something that is
 * neither of the two models at all. The Funktionsbegriff is not introduced
 * in year 7, so the third option stays a catch-all rather than "linear".
 */
export type ModelKind = "proportional" | "antiproportional" | "weder";

/** Which of the two Zuordnungsarten a table round draws from. */
export type TableKind = "proportional" | "antiproportional";

const models: SettingsField = {
  type: "multi",
  key: "models",
  labelKey: "settings.models",
  options: [
    { value: "proportional", labelKey: "settings.modelProportional" },
    { value: "antiproportional", labelKey: "settings.modelAntiproportional" },
  ],
  default: ["proportional", "antiproportional"],
};

/** Reads the models toggle into the kinds a round may ask. */
export function readTableKinds(settings: StageSettings): TableKind[] {
  const picked = settings.models;
  const kinds: TableKind[] = [];
  if (Array.isArray(picked) && picked.includes("proportional")) kinds.push("proportional");
  if (Array.isArray(picked) && picked.includes("antiproportional")) kinds.push("antiproportional");
  return kinds.length > 0 ? kinds : ["proportional", "antiproportional"];
}

/** Whether the model-choice station may deal out "weder noch" situations. */
export function readIncludeNeither(settings: StageSettings): boolean {
  const value = settings.includeNeither;
  return typeof value === "boolean" ? value : true;
}

/** What the graph station asks: classify the curve, or read a value off it. */
export type GraphTask = "klasse" | "ablesen";

export function readGraphTasks(settings: StageSettings): GraphTask[] {
  const picked = settings.graphTasks;
  const tasks: GraphTask[] = [];
  if (Array.isArray(picked) && picked.includes("klasse")) tasks.push("klasse");
  if (Array.isArray(picked) && picked.includes("ablesen")) tasks.push("ablesen");
  return tasks.length > 0 ? tasks : ["klasse", "ablesen"];
}

/** Where a Zuordnungsvorschrift is to be read from: table or graph. */
export type VorschriftSource = "tabelle" | "graph";

/** What the kitchen station asks: the shopping list, or the pans. */
export type KuecheTask = "einkauf" | "pfanne";

export function readKuecheTasks(settings: StageSettings): KuecheTask[] {
  const picked = settings.kuecheTasks;
  const tasks: KuecheTask[] = [];
  if (Array.isArray(picked) && picked.includes("einkauf")) tasks.push("einkauf");
  if (Array.isArray(picked) && picked.includes("pfanne")) tasks.push("pfanne");
  return tasks.length > 0 ? tasks : ["einkauf", "pfanne"];
}

/** The kinds of Vorschrift the station deals out ("linear" = y = kx + d). */
export type VorschriftKind = "proportional" | "antiproportional" | "linear";

export function readVorschriftSources(settings: StageSettings): VorschriftSource[] {
  const picked = settings.sources;
  const sources: VorschriftSource[] = [];
  if (Array.isArray(picked) && picked.includes("tabelle")) sources.push("tabelle");
  if (Array.isArray(picked) && picked.includes("graph")) sources.push("graph");
  return sources.length > 0 ? sources : ["tabelle", "graph"];
}

export function readVorschriftKinds(settings: StageSettings): VorschriftKind[] {
  const picked = settings.vorschriftKinds;
  const kinds: VorschriftKind[] = [];
  if (Array.isArray(picked) && picked.includes("proportional")) kinds.push("proportional");
  if (Array.isArray(picked) && picked.includes("antiproportional")) kinds.push("antiproportional");
  if (Array.isArray(picked) && picked.includes("linear")) kinds.push("linear");
  return kinds.length > 0 ? kinds : ["proportional", "antiproportional", "linear"];
}

// ---------------------------------------------------------------------------
// The spec — Zuordnungen in Klasse 7, following EdM 7 Kapitel 1 and the
// Arbeitsheft of the same unit: four Darstellungsformen (Wortform, Tabelle,
// Graph, Zuordnungsvorschrift), Quotienten- und Produktgleichheit, Dreisatz
// and the Wahl eines geeigneten Zuordnungsmodells. The situations are the
// unit's own contexts: CO₂, Ackerfläche, Wasser, Ernährung.
// ---------------------------------------------------------------------------

export const zuordnungSpec: GameSpec = {
  id: "zuordnung",
  titleKey: "games.zuordnung.title",
  descriptionKey: "games.zuordnung.description",
  category: "math",
  grades: ["7"],
  icon: "mapping",
  color: "yellow",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "modell",
      nameKey: "games.zuordnung.stages.modell.name",
      summaryKey: "games.zuordnung.stages.modell.summary",
      rulesKey: "games.zuordnung.stages.modell.rules",
      settings: [
        questionsPerRound([6, 8, 10], 8),
        duration(90),
        {
          type: "toggle",
          key: "includeNeither",
          labelKey: "settings.includeNeither",
          default: true,
        },
      ],
    },
    {
      id: "tabelle",
      nameKey: "games.zuordnung.stages.tabelle.name",
      summaryKey: "games.zuordnung.stages.tabelle.summary",
      rulesKey: "games.zuordnung.stages.tabelle.rules",
      settings: [questionsPerRound([4, 6, 8], 6), duration(150, 90), models],
    },
    {
      id: "kueche",
      nameKey: "games.zuordnung.stages.kueche.name",
      summaryKey: "games.zuordnung.stages.kueche.summary",
      rulesKey: "games.zuordnung.stages.kueche.rules",
      settings: [
        {
          type: "select",
          key: "ordersPerRound",
          labelKey: "settings.ordersPerRound",
          options: [6, 8, 10],
          default: 8,
        },
        duration(180, 90, 300),
        {
          type: "multi",
          key: "kuecheTasks",
          labelKey: "settings.kuecheTasks",
          options: [
            { value: "einkauf", labelKey: "settings.kuecheTaskEinkauf" },
            { value: "pfanne", labelKey: "settings.kuecheTaskPfanne" },
          ],
          default: ["einkauf", "pfanne"],
        },
      ],
    },
    {
      id: "graph",
      nameKey: "games.zuordnung.stages.graph.name",
      summaryKey: "games.zuordnung.stages.graph.summary",
      rulesKey: "games.zuordnung.stages.graph.rules",
      settings: [
        questionsPerRound([4, 6, 8], 6),
        duration(120, 90),
        {
          type: "multi",
          key: "graphTasks",
          labelKey: "settings.graphTasks",
          options: [
            { value: "klasse", labelKey: "settings.graphTaskKlasse" },
            { value: "ablesen", labelKey: "settings.graphTaskAblesen" },
          ],
          default: ["klasse", "ablesen"],
        },
      ],
    },
    {
      id: "vorschrift",
      nameKey: "games.zuordnung.stages.vorschrift.name",
      summaryKey: "games.zuordnung.stages.vorschrift.summary",
      rulesKey: "games.zuordnung.stages.vorschrift.rules",
      settings: [
        questionsPerRound([4, 6, 8], 6),
        duration(120, 90),
        {
          type: "multi",
          key: "sources",
          labelKey: "settings.sources",
          options: [
            { value: "tabelle", labelKey: "settings.sourceTabelle" },
            { value: "graph", labelKey: "settings.sourceGraph" },
          ],
          default: ["tabelle", "graph"],
        },
        {
          type: "multi",
          key: "vorschriftKinds",
          labelKey: "settings.vorschriftKinds",
          options: [
            { value: "proportional", labelKey: "settings.modelProportional" },
            { value: "antiproportional", labelKey: "settings.modelAntiproportional" },
            { value: "linear", labelKey: "settings.modelLinear" },
          ],
          default: ["proportional", "antiproportional", "linear"],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — created on the server, rendered on the client
// ---------------------------------------------------------------------------

/** i18n key of the word form of a model, shown on the buttons and in reviews. */
export const MODEL_KEYS: Record<ModelKind, string> = {
  proportional: "games.zuordnung.kinds.proportional",
  antiproportional: "games.zuordnung.kinds.antiproportional",
  weder: "games.zuordnung.kinds.weder",
};

/** One situation in Wortform, to be sorted into a Zuordnungsmodell (EdM 1.7). */
export interface ModellQuestion extends StageQuestion {
  icon: string;
  /** i18n key of the situation, interpolated with `params`. */
  setupKey: string;
  params: Record<string, number>;
  /** The three models, in the order the buttons show them. */
  optionKeys: string[];
  /** The model that fits; -1 on a player's device until they have answered. */
  answerIndex: number;
}

/** A number as the class writes it: German comma, at most two decimals. */
export function zuordnungNumber(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

/** One row of a table. Exactly one cell of the round's table is null. */
export interface TableRow {
  x: number | null;
  y: number | null;
}

/**
 * A table with one value missing — Quotientengleichheit when the Zuordnung is
 * proportional, Produktgleichheit when it is not (EdM 1.3, 1.6, Dreisatz).
 */
export interface TabelleQuestion extends StageQuestion {
  icon: string;
  /** i18n key of the situation the table belongs to. */
  setupKey: string;
  kind: TableKind;
  /** i18n keys of the two column heads. */
  xLabelKey: string;
  yLabelKey: string;
  xUnit: string;
  yUnit: string;
  /** Three rows, in ascending x. Exactly one cell is null. */
  rows: TableRow[];
  /** The row the missing value belongs to. */
  answerRow: number;
  /** "x" when the x value is missing, "y" for the y value. */
  blank: "x" | "y";
  /** The missing value as the class writes it; "" until answered. */
  answer: string;
  /** Both halves of the equality that solves the row, formatted for a review. */
  explainFirst: string;
  explainSecond: string;
}

/** A drawn curve, as the graph station sees one. */
export interface GraphCurve {
  type: "proportional" | "antiproportional" | "linear" | "wachstum";
  /** y = k·x — proportional; y = k·x + d — linear ("weder noch"). */
  k?: number;
  d?: number;
  /** y = p/x — antiproportional. */
  p?: number;
}

/**
 * Which model a curve belongs to. The Knick in the tail: curves that are not
 * straight through the origin count as "weder noch", which is the whole point
 * of the station — a Hyperbel and a fallende Gerade are not the same graph,
 * and neither is a Gerade with an Achsenabschnitt.
 */
export function graphModel(curve: GraphCurve): ModelKind {
  if (curve.type === "proportional") return "proportional";
  if (curve.type === "antiproportional") return "antiproportional";
  return "weder";
}

/** One axis range the graph station draws on, so modulo the marker: whole numbers. */
export interface GraphWindow {
  xMax: number;
  yMax: number;
}

/** A curve to sort into its model (EdM 1.1, 1.2: Graphen lesen). */
export interface GraphClassQuestion extends StageQuestion {
  task: "klasse";
  curve: GraphCurve;
  window: GraphWindow;
  optionKeys: string[];
  answerIndex: number;
}

/** A point read off a curve: the marked point gives k or p, apply it to askX. */
export interface GraphReadQuestion extends StageQuestion {
  task: "ablesen";
  icon: string;
  setupKey: string;
  window: GraphWindow;
  curve: GraphCurve;
  /** The labelled point on the curve the round gives away. */
  given: { x: number; y: number };
  /** The x value the player is asked to find the y value for. */
  askX: number;
  xLabelKey: string;
  yLabelKey: string;
  xUnit: string;
  yUnit: string;
  /** The y value that belongs to askX; "" until answered. */
  answer: string;
}

export type GraphQuestion = GraphClassQuestion | GraphReadQuestion;

/** The Zuordnungsvorschrift of a table or a graph, chosen from four terms. */
export interface VorschriftQuestion extends StageQuestion {
  icon: string;
  source: VorschriftSource;
  kind: VorschriftKind;
  /** The situation, as the table's word form; unused for the graph source. */
  setupKey: string;
  xLabelKey: string;
  yLabelKey: string;
  xUnit: string;
  yUnit: string;
  /** The complete table, when `source` is "tabelle". */
  rows?: TableRow[];
  /** The curve and its labelled point, when `source` is "graph". */
  window?: GraphWindow;
  curve?: GraphCurve;
  point?: { x: number; y: number };
  /** Four Zuordnungsvorschriften as LaTeX, shuffled. */
  options: string[];
  answerIndex: number;
}

// ---------------------------------------------------------------------------
// Küchen-Panik — a live arcade station on the Arbeitsheft's own cooking
// contexts (Expertenaufgaben E2 and E4). Orders arrive one at a time, each
// with a shrinking time bar; the player taps the right amount tile per
// ingredient and sends the order off before the clock runs out. Scaling a
// recipe is Quotientengleichheit with a factor you can see; splitting the
// batter over more pans is Produktgleichheit.
//
// The round is a live one (no questions): the tickets come with the round in
// `extra.orders`, each player works through them at their own pace — the next
// ticket is `orders[tally.hits + tally.misses]` — and reports what happened;
// the server alone knows which tile was right.
// ---------------------------------------------------------------------------

/** One line of the base recipe printed on a ticket. */
export interface CardIngredient {
  /** i18n key of the ingredient. */
  ingredientKey: string;
  /** The amount as the class writes it, formatted on the server. */
  amount: string;
  unit: string;
}

/** One slot of a ticket: an ingredient (or the time) and four tiles to pick from. */
export interface KuecheSlot {
  /** i18n key of what is to be picked — the ingredient, or the duration. */
  labelKey: string;
  unit: string;
  /** Four amounts, formatted; exactly one is right. The server holds the index. */
  tiles: string[];
}

/** One order on the counter. */
export interface KuecheOrder {
  id: number;
  task: KuecheTask;
  icon: string;
  /** i18n key of the order's wording, interpolated with `params`. */
  wordingKey: string;
  params: Record<string, number>;
  /** The base recipe the ticket prints, for "einkauf". */
  recipe: CardIngredient[];
  slots: KuecheSlot[];
}

/** What a live kitchen round carries in `extra`, beside the tallies. */
export interface KuecheRoundExtra {
  orders: KuecheOrder[];
  offered: number;
  /** Per player, the tickets they settled, in order — each player sees only their own. */
  settled?: Record<string, KuecheSettled[]>;
  /**
   * The right tile per order and slot. Only added to a player's view once the
   * round is over (`extraForPlayer`'s `over`), so an unserved ticket still
   * shows its solution in the review without leaking it during play.
   */
  truth?: Record<number, string[]>;
}

/** What one settled ticket looks like in a "hits" report. */
export interface KuecheEvent {
  id: number;
  /** How long the ticket took, measured on the device — kept for the round's average. */
  ms: number | null;
  /** The tile index picked per slot. */
  picks: number[];
}

/**
 * What the server remembers of one settled ticket for one player: their picks
 * and the tiles that were right. Kept per player and stripped from everyone
 * else's view by `extraForPlayer` — after submitting, a player may see what
 * was right, but nobody may read it off before answering.
 */
export interface KuecheSettled {
  id: number;
  /** The tile index picked per slot. */
  picks: number[];
  /** The right tile per slot, formatted like the tiles themselves. */
  truth: string[];
  correct: boolean;
}

