import type { GameSpec, SettingsField, StageQuestion } from "../framework";
import type { Polynomial } from "../polynomial";

const questionsPerRound = (options: number[], value: number): SettingsField => ({
  type: "select",
  key: "questionsPerRound",
  labelKey: "settings.questionsPerRound",
  options,
  default: value,
});

const duration = (value: number): SettingsField => ({
  type: "range",
  key: "duration",
  labelKey: "settings.duration",
  min: 60,
  max: 300,
  step: 30,
  default: value,
  unit: "s",
});

const degree: SettingsField = {
  type: "select",
  key: "degree",
  labelKey: "settings.degree",
  options: [2, 3, 4],
  default: 3,
};

const showTargetGraph: SettingsField = {
  type: "toggle",
  key: "showTargetGraph",
  labelKey: "settings.showTargetGraph",
  default: true,
};

/**
 * How much of the model a question asks for.
 *
 * The station used to ask for all of it every time, which is the exam question
 * and a wall on the way to it: a class that cannot yet tell the
 * Nebenbedingung from the Zielfunktion gets no credit for knowing either. With
 * the rest of the way shown already, one step is a question a class can answer
 * on the first day of the topic — and `mixed` walks the round from one step up
 * to the whole way, so the last question of a round is still the exam one.
 */
const modelParts: SettingsField = {
  type: "choice",
  key: "modelParts",
  labelKey: "settings.modelParts",
  options: [
    { value: "mixed", labelKey: "settings.modelPartsMixed" },
    { value: "one", labelKey: "settings.modelPartsOne" },
    { value: "all", labelKey: "settings.modelPartsAll" },
  ],
  default: "mixed",
};

export const extremumSpec: GameSpec = {
  id: "extremum",
  titleKey: "games.extremum.title",
  descriptionKey: "games.extremum.description",
  category: "math",
  grades: ["Q1"],
  icon: "mountain",
  color: "lime",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "derive",
      nameKey: "games.extremum.stages.derive.name",
      summaryKey: "games.extremum.stages.derive.summary",
      rulesKey: "games.extremum.stages.derive.rules",
      settings: [questionsPerRound([5, 8, 10], 8), duration(120), degree],
    },
    {
      id: "optimize",
      nameKey: "games.extremum.stages.optimize.name",
      summaryKey: "games.extremum.stages.optimize.summary",
      rulesKey: "games.extremum.stages.optimize.rules",
      settings: [questionsPerRound([4, 6, 8], 6), duration(240), modelParts, showTargetGraph],
    },
  ],
};

// ---------------------------------------------------------------------------
// Question types — created on the server, rendered on the client
// ---------------------------------------------------------------------------

export interface DeriveQuestion extends StageQuestion {
  /** f(x) as LaTeX; the answer is its derivative. */
  functionLatex: string;
  /** The same function as coefficients — it is the question, not the answer. */
  polynomial: Polynomial;
}

/**
 * The model, in the order it is written down: the quantity that is to become
 * as large as possible, that quantity in two variables, the constraint that
 * ties the two together, and the function of x that substituting leaves.
 *
 * A question asks for some of these and shows the rest already filled in, so
 * the same situation is a one-step question ("which of these is the
 * Nebenbedingung?") or the whole way from the picture to the maximum.
 */
export const OPTIMIZE_PARTS = ["quantity", "extremal", "constraint", "target"] as const;
export type OptimizePart = (typeof OPTIMIZE_PARTS)[number];

/** The three parts that are a term on a card, in the order they are asked. */
export const OPTIMIZE_TERMS = ["extremal", "constraint", "target"] as const;
export type OptimizeTerm = (typeof OPTIMIZE_TERMS)[number];

export interface OptimizeQuestion extends StageQuestion {
  icon: string;
  /** i18n key of the situation, interpolated with `params`. */
  contextKey: string;
  params: Record<string, number>;
  /** i18n key of what is being made as large as possible (an area, a volume). */
  quantityKey: string;
  /** The whole model as LaTeX, in `OPTIMIZE_TERMS` order. */
  terms: [string, string, string];
  /** Which parts the player has to find; the others are shown as given. */
  asked: OptimizePart[];
  /** The cards on offer for the asked terms — the right ones plus decoys. */
  cards: string[];
  /** The quantities on offer as i18n keys, when the quantity is asked. */
  quantityOptions: string[] | null;
  /** The target function, so both sides can plot and score it. */
  target: Polynomial;
  /** The interval x may be chosen from. */
  xMin: number;
  xMax: number;
  /** Plot window for the target function. */
  yMin: number;
  yMax: number;
  /** Slider step. */
  step: number;
}

/**
 * How close to the maximum counts as having found it, as a share of the
 * interval x is chosen from — and how far off is worth no points at all.
 *
 * Shared because the review draws what the server scored: the ring around the
 * maximum on the graph is this number, and a tolerance that was generous on
 * one side and drawn tight on the other would be worse than not drawing it.
 */
export const X_CORRECT_AT = 0.05;
export const X_ZERO_AT = 0.15;

/** The terms this question asks for, in board order. */
export function askedTerms(question: OptimizeQuestion): OptimizeTerm[] {
  return OPTIMIZE_TERMS.filter((term) => question.asked.includes(term));
}

/** The LaTeX that belongs to one term of the model. */
export function termAnswer(question: OptimizeQuestion, term: OptimizeTerm): string {
  return question.terms[OPTIMIZE_TERMS.indexOf(term)];
}

/** What the optimize stage submits. */
export interface OptimizeAnswer {
  /** Index into `quantityOptions`, when the question asked for it. */
  quantity?: number | null;
  assignment: (number | null)[];
  x: number;
}
