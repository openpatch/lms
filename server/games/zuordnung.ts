import {
  MODEL_KEYS,
  graphModel,
  readGraphTasks,
  readIncludeNeither,
  readKuecheTasks,
  readTableKinds,
  readVorschriftKinds,
  readVorschriftSources,
  zuordnungNumber,
  zuordnungSpec,
  type GraphClassQuestion,
  type GraphCurve,
  type GraphQuestion,
  type GraphReadQuestion,
  type GraphWindow,
  type KuecheEvent,
  type KuecheOrder,
  type KuecheRoundExtra,
  type ModellQuestion,
  type ModelKind,
  type TableRow,
  type TabelleQuestion,
  type TableKind,
  type VorschriftKind,
  type VorschriftQuestion,
  type VorschriftSource,
} from "../../shared/games/zuordnung";
import { liveScore, liveTally, speedPoints } from "../../shared/framework";
import { equals, parseFraction, reduce } from "../../shared/rational-math";
import { recordLiveEvent, type StageHandler } from "../framework";
import { createStageGame } from "../framework";

/*
 * Zuordnungen in Klasse 7 (EdM 7, Kapitel 1) — one handler per stage, each fed
 * by the unit's own contexts: CO₂, Ackerfläche, Wasser, Preise. The four
 * stages are the four Darstellungsformen the SILP asks for (Wortform, Tabelle,
 * Graph, Zuordnungsvorschrift), plus the Wahl eines geeigneten Zuordnungsmodells.
 */

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

/** Up to `count` values, without repetition, in the order they were picked. */
function sample<T>(values: readonly T[], count: number): T[] {
  const copy = [...values];
  const picked: T[] = [];
  while (picked.length < count && copy.length > 0) {
    picked.push(copy.splice(randomInt(0, copy.length - 1), 1)[0]);
  }
  return picked;
}

function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const KEY = "games.zuordnung";

/** A situation the stages share: what it is about, and how its table reads. */
interface Context {
  id: string;
  icon: string;
  /** i18n key of the word form of the situation. */
  setupKey: string;
  xLabelKey: string;
  yLabelKey: string;
  xUnit: string;
  yUnit: string;
}

interface ProportionalContext extends Context {
  /** y = k · x */
  k: number;
  /** x values with a nice k · x, ascending. */
  xs: number[];
}

interface AntiproportionalContext extends Context {
  /** x · y = P */
  p: number;
  /** x values with a nice P / x, ascending. */
  xs: number[];
}

interface LinearContext extends Context {
  /** y = k · x + d */
  k: number;
  d: number;
  xs: number[];
}

// --- proportional: mehr von dem einen, mehr von dem anderen ------------------

const PROPORTIONAL: ProportionalContext[] = [
  {
    id: "acker",
    icon: "plant",
    setupKey: `${KEY}.setups.acker`,
    xLabelKey: `${KEY}.axes.portionen`,
    yLabelKey: `${KEY}.axes.ackerflaeche`,
    xUnit: "",
    yUnit: "m²",
    k: 7,
    xs: [1, 2, 3, 4, 5, 6, 10],
  },
  {
    id: "co2",
    icon: "car",
    setupKey: `${KEY}.setups.co2`,
    xLabelKey: `${KEY}.axes.kilometer`,
    yLabelKey: `${KEY}.axes.co2`,
    xUnit: "km",
    yUnit: "kg",
    k: 0.2,
    xs: [5, 10, 15, 20, 25, 30],
  },
  {
    id: "dusche",
    icon: "waves",
    setupKey: `${KEY}.setups.dusche`,
    xLabelKey: `${KEY}.axes.minuten`,
    yLabelKey: `${KEY}.axes.wasser`,
    xUnit: "min",
    yUnit: "l",
    k: 12,
    xs: [2, 3, 5, 10],
  },
  {
    id: "kartoffeln",
    icon: "box",
    setupKey: `${KEY}.setups.kartoffeln`,
    xLabelKey: `${KEY}.axes.kartoffeln`,
    yLabelKey: `${KEY}.axes.preis`,
    xUnit: "kg",
    yUnit: "€",
    k: 1.5,
    xs: [2, 4, 6, 8, 10],
  },
  {
    id: "popcorn",
    icon: "popcorn",
    setupKey: `${KEY}.setups.popcorn`,
    xLabelKey: `${KEY}.axes.beutel`,
    yLabelKey: `${KEY}.axes.preis`,
    xUnit: "",
    yUnit: "€",
    k: 2.5,
    xs: [2, 4, 6, 8],
  },
];

// --- antiproportional: mehr von dem einen, weniger von dem anderen -----------

const ANTIPROPORTIONAL: AntiproportionalContext[] = [
  {
    id: "bau",
    icon: "wrench",
    setupKey: `${KEY}.setups.bau`,
    xLabelKey: `${KEY}.axes.handwerker`,
    yLabelKey: `${KEY}.axes.tage`,
    xUnit: "",
    yUnit: "Tage",
    p: 36,
    xs: [4, 6, 9, 12, 18],
  },
  {
    id: "futter",
    icon: "piggy",
    setupKey: `${KEY}.setups.futter`,
    xLabelKey: `${KEY}.axes.kuehe`,
    yLabelKey: `${KEY}.axes.tage`,
    xUnit: "",
    yUnit: "Tage",
    p: 60,
    xs: [4, 5, 6, 10, 12, 15, 20, 30],
  },
  {
    id: "bus",
    icon: "money",
    setupKey: `${KEY}.setups.bus`,
    xLabelKey: `${KEY}.axes.personen`,
    yLabelKey: `${KEY}.axes.proPerson`,
    xUnit: "",
    yUnit: "€",
    p: 120,
    xs: [4, 5, 6, 8, 10, 12],
  },
  {
    id: "tank",
    icon: "depth",
    setupKey: `${KEY}.setups.tank`,
    xLabelKey: `${KEY}.axes.ventile`,
    yLabelKey: `${KEY}.axes.stunden`,
    xUnit: "",
    yUnit: "h",
    p: 90,
    xs: [3, 5, 6, 9, 10, 15, 18],
  },
];

// --- lineare Zuordnungen with an Achsenabschnitt: "weder noch" --------------

const LINEAR: LinearContext[] = [
  {
    id: "taxi",
    icon: "taxi",
    setupKey: `${KEY}.setups.taxi`,
    xLabelKey: `${KEY}.axes.kilometer`,
    yLabelKey: `${KEY}.axes.fahrtpreis`,
    xUnit: "km",
    yUnit: "€",
    k: 2,
    d: 3,
    xs: [1, 2, 4, 5, 7, 8, 10],
  },
  {
    id: "handy",
    icon: "clock",
    setupKey: `${KEY}.setups.handy`,
    xLabelKey: `${KEY}.axes.minuten`,
    yLabelKey: `${KEY}.axes.kosten`,
    xUnit: "min",
    yUnit: "€",
    k: 0.1,
    d: 10,
    xs: [10, 20, 30, 40, 60, 100],
  },
];

// --- "weder noch"-Situationen for the model choice (EdM 1.7) ----------------

interface NeitherSituation {
  icon: string;
  setupKey: string;
}

const NEITHER: NeitherSituation[] = [
  { icon: "taxi", setupKey: `${KEY}.setups.taxi` },
  { icon: "clock", setupKey: `${KEY}.setups.handy` },
  { icon: "clock", setupKey: `${KEY}.setups.kinoticket` },
  { icon: "ruler", setupKey: `${KEY}.setups.alter` },
  { icon: "thermometer", setupKey: `${KEY}.setups.temperatur` },
];

/** Every value a Zuordnungen round can ask for, as an exact fraction. */
function fraction(value: number): { n: number; d: number } {
  return reduce({ n: Math.round(value * 100), d: 100 });
}

/** Grades a typed number: exact as a fraction, so 7,5 and 15/2 and 7.50 all pass. */
function evaluateNumber(value: number, answer: string, questionMs: number) {
  const expected = fraction(value);
  const parsed = parseFraction(answer);
  const correct = parsed != null && equals(parsed, expected);
  return { correct, points: correct ? speedPoints(questionMs / 1000, 2, 25) : 0 };
}

/** Grades a picked option by its index, sent as a string. */
function evaluateChoice(answerIndex: number, answer: string, questionMs: number) {
  const correct = Number(answer) === answerIndex;
  return { correct, points: correct ? speedPoints(questionMs / 1000, 2, 25) : 0 };
}

/** The three models, shuffled, with the answer's index — a fresh order every
 *  question, so "the right answer is always on the left" never gets to happen. */
function modelOptions(answer: ModelKind) {
  const keys = [MODEL_KEYS.proportional, MODEL_KEYS.antiproportional, MODEL_KEYS.weder];
  const optionKeys = shuffled(keys);
  return { optionKeys, answerIndex: optionKeys.indexOf(MODEL_KEYS[answer]) };
}

// ---------------------------------------------------------------------------
// modell — the situation in Wortform, sorted into its Zuordnungsmodell
// ---------------------------------------------------------------------------

/** One modell question, drawn from the contexts of all three models. */
function makeModellQuestion(id: number, includeNeither: boolean): ModellQuestion {
  let icon: string;
  let setupKey: string;
  let answer: ModelKind;

  const bucket = randomInt(0, includeNeither ? 2 : 1);
  if (bucket === 0) {
    const context = pick(PROPORTIONAL);
    icon = context.icon;
    setupKey = context.setupKey;
    answer = "proportional";
  } else if (bucket === 1) {
    const context = pick(ANTIPROPORTIONAL);
    icon = context.icon;
    setupKey = context.setupKey;
    answer = "antiproportional";
  } else {
    const situation = pick(NEITHER);
    icon = situation.icon;
    setupKey = situation.setupKey;
    answer = "weder";
  }

  const { optionKeys, answerIndex } = modelOptions(answer);
  return { id, icon, setupKey, params: {}, optionKeys, answerIndex };
}

const modellStage: StageHandler<ModellQuestion> = {
  id: "modell",
  forPlayer: (question) => ({ ...question, answerIndex: -1 }),

  createQuestions({ settings }) {
    const includeNeither = readIncludeNeither(settings);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) =>
      makeModellQuestion(id, includeNeither),
    );
  },

  evaluate(question, answer, { questionMs }) {
    return evaluateChoice(question.answerIndex, answer, questionMs);
  },
};

// ---------------------------------------------------------------------------
// tabelle — a missing value, by Quotienten- oder Produktgleichheit (Dreisatz)
// ---------------------------------------------------------------------------

/** The two equalities a review shows: proof from a complete row, applied to the blank. */
function explainPair(first: string, second: string) {
  return { explainFirst: first, explainSecond: second };
}

/** A proportional table: three rows, one value missing. */
function proportionalTable(context: ProportionalContext, id: number): TabelleQuestion {
  const xs = sample(context.xs, 3).sort((a, b) => a - b);
  const blankX = Math.random() < 0.35;
  const answerRow = randomInt(0, 2);

  let rows: TableRow[];
  let answer: number;
  if (blankX) {
    rows = xs.map((x, index) =>
      index === answerRow ? { x: null, y: context.k * xs[answerRow] } : { x, y: context.k * x },
    );
    answer = xs[answerRow];
  } else {
    rows = xs.map((x, index) =>
      index === answerRow ? { x, y: null } : { x, y: context.k * x },
    );
    answer = context.k * xs[answerRow];
  }

  const known = pick([0, 1, 2].filter((index) => index !== answerRow));
  const quotient = `${zuordnungNumber(context.k * xs[known])} : ${zuordnungNumber(xs[known])} = ${zuordnungNumber(context.k)}`;
  const applied = blankX
    ? `${zuordnungNumber(answer)} · ${zuordnungNumber(context.k)} = ${zuordnungNumber(context.k * xs[answerRow])}`
    : `${zuordnungNumber(context.k)} · ${zuordnungNumber(xs[answerRow])} = ${zuordnungNumber(answer)}`;

  return {
    id,
    icon: context.icon,
    setupKey: context.setupKey,
    kind: "proportional",
    xLabelKey: context.xLabelKey,
    yLabelKey: context.yLabelKey,
    xUnit: context.xUnit,
    yUnit: context.yUnit,
    rows,
    answerRow,
    blank: blankX ? "x" : "y",
    answer: zuordnungNumber(answer),
    ...explainPair(quotient, applied),
  };
}

/** An antiproportional table: three x·y pairs of one P, one value missing. */
function antiproportionalTable(context: AntiproportionalContext, id: number): TabelleQuestion {
  const xs = sample(context.xs, 3).sort((a, b) => a - b);
  const blankX = Math.random() < 0.35;
  const answerRow = randomInt(0, 2);

  let rows: TableRow[];
  let answer: number;
  if (blankX) {
    rows = xs.map((x, index) =>
      index === answerRow ? { x: null, y: context.p / xs[answerRow] } : { x, y: context.p / x },
    );
    answer = xs[answerRow];
  } else {
    rows = xs.map((x, index) =>
      index === answerRow ? { x, y: null } : { x, y: context.p / x },
    );
    answer = context.p / xs[answerRow];
  }

  const known = pick([0, 1, 2].filter((index) => index !== answerRow));
  const product = `${xs[known]} · ${zuordnungNumber(context.p / xs[known])} = ${context.p}`;
  const applied = blankX
    ? `${zuordnungNumber(answer)} · ${zuordnungNumber(context.p / xs[answerRow])} = ${context.p}`
    : `${context.p} : ${zuordnungNumber(xs[answerRow])} = ${zuordnungNumber(answer)}`;

  return {
    id,
    icon: context.icon,
    setupKey: context.setupKey,
    kind: "antiproportional",
    xLabelKey: context.xLabelKey,
    yLabelKey: context.yLabelKey,
    xUnit: context.xUnit,
    yUnit: context.yUnit,
    rows,
    answerRow,
    blank: blankX ? "x" : "y",
    answer: zuordnungNumber(answer),
    ...explainPair(product, applied),
  };
}

const tabelleStage: StageHandler<TabelleQuestion> = {
  id: "tabelle",
  // The answer is the only thing a player cannot see before answering: the
  // two complete rows are what the value is to be worked out from.
  forPlayer: (question) => ({ ...question, answer: "" }),

  createQuestions({ settings }) {
    const kinds = readTableKinds(settings);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const kind: TableKind = pick(kinds);
      return kind === "proportional"
        ? proportionalTable(pick(PROPORTIONAL), id)
        : antiproportionalTable(pick(ANTIPROPORTIONAL), id);
    });
  },

  evaluate(question, answer, { questionMs }) {
    return evaluateNumber(Number(question.answer.replace(",", ".")), answer, questionMs);
  },
};

// ---------------------------------------------------------------------------
// graph — a curve sorted into its model, or a value read off it
// ---------------------------------------------------------------------------

/** A curve to classify. "wachstum" is the Bevölkerungsgraph: growth that picks
 *  up speed, which belongs to neither of the two models. */
function classifyCurve(): GraphCurve {
  switch (randomInt(0, 3)) {
    case 0:
      return { type: "proportional", k: pick([2, 3, 4]) };
    case 1:
      return { type: "antiproportional", p: pick([20, 24, 30]) };
    case 2:
      return { type: "linear", k: pick([2, 3]), d: pick([4, 5]) };
    default:
      return { type: "wachstum" };
  }
}

function classifyWindow(curve: GraphCurve): GraphWindow {
  if (curve.type === "antiproportional") {
    return { xMax: 12, yMax: curve.p ?? 20 };
  }
  if (curve.type === "wachstum") {
    return { xMax: 10, yMax: 33 };
  }
  return { xMax: 10, yMax: 10 * (curve.k ?? 1) + (curve.d ?? 0) + 5 };
}

function makeClassifyQuestion(id: number): GraphClassQuestion {
  const curve = classifyCurve();
  const { optionKeys, answerIndex } = modelOptions(graphModel(curve));
  return { id, task: "klasse", curve, window: classifyWindow(curve), optionKeys, answerIndex };
}

/** The graph contexts for reading: the two Zuordnungsarten with values nice to see. */
const GRAPH_READ: (ProportionalContext | AntiproportionalContext)[] = [
  ...PROPORTIONAL.filter((context) => context.xs.length > 2),
  ...ANTIPROPORTIONAL,
];

function makeReadQuestion(id: number): GraphReadQuestion {
  const context = pick(GRAPH_READ);

  if ("k" in context) {
    // A proportionale Zuordnung: the given point pins the line, the asked one
    // lies beyond it on the drawn part of the curve.
    const [givenX, ...rest] = context.xs;
    const askX = pick(rest) ?? context.xs[context.xs.length - 1];
    const k = context.k;
    const window = { xMax: askX + 2, yMax: k * (askX + 2) };
    return {
      id,
      task: "ablesen",
      icon: context.icon,
      setupKey: context.setupKey,
      window,
      curve: { type: "proportional", k },
      given: { x: givenX, y: k * givenX },
      askX,
      xLabelKey: context.xLabelKey,
      yLabelKey: context.yLabelKey,
      xUnit: context.xUnit,
      yUnit: context.yUnit,
      answer: zuordnungNumber(k * askX),
    };
  }

  // An antiproportionale Zuordnung: the window is cut around the two points
  // that matter, so the hyperbola shows its bend instead of hugging the axis.
  const [givenX, ...rest] = context.xs;
  const askX = pick(rest) ?? context.xs[context.xs.length - 1];
  const p = context.p;
  const window = { xMax: Math.max(askX + 2, 12), yMax: Math.ceil((p / givenX) * 1.25) };
  return {
    id,
    task: "ablesen",
    icon: context.icon,
    setupKey: context.setupKey,
    window,
    curve: { type: "antiproportional", p },
    given: { x: givenX, y: p / givenX },
    askX,
    xLabelKey: context.xLabelKey,
    yLabelKey: context.yLabelKey,
    xUnit: context.xUnit,
    yUnit: context.yUnit,
    answer: zuordnungNumber(p / askX),
  };
}

const graphStage: StageHandler<GraphQuestion> = {
  id: "graph",
  // Which half is hidden depends on the task: the model of a curve to sort,
  // or the value a marked point is to be turned into.
  forPlayer(question) {
    if (question.task === "klasse") return { ...question, answerIndex: -1 };
    return { ...question, answer: "" };
  },

  createQuestions({ settings }) {
    const tasks = readGraphTasks(settings);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, index) =>
      pick(tasks) === "klasse" ? makeClassifyQuestion(index) : makeReadQuestion(index),
    );
  },

  evaluate(question, answer, { questionMs }) {
    if (question.task === "klasse") {
      return evaluateChoice(question.answerIndex, answer, questionMs);
    }
    return evaluateNumber(Number(question.answer.replace(",", ".")), answer, questionMs);
  },
};

// ---------------------------------------------------------------------------
// kueche — Küchen-Panik: a live arcade station on the Arbeitsheft's own
// cooking contexts (Expertenaufgaben E2 and E4). Orders arrive one at a time
// with a shrinking time bar; the player taps the right amount tile per
// ingredient and sends the order off. Scaling a recipe is
// Quotientengleichheit with a visible factor; splitting the batter over more
// pans is Produktgleichheit.
//
// The tickets all come with the round in `extra.orders` — tiles included,
// but never which tile is right. Each player works through the orders at
// their own pace (the next one is orders[hits + misses]), reports each
// settled ticket as a "hits" event, and the server alone decides whether the
// picks were the right ones.
// ---------------------------------------------------------------------------

/** A dish the kitchen cooks, as the Arbeitsheft prints the recipe. */
interface Dish {
  id: string;
  icon: string;
  /** i18n key of the order's wording for this dish. */
  orderKey: string;
  /** How many the recipe serves. */
  serves: number;
  /** Class sizes whose scaled amounts stay whole numbers. */
  targets: number[];
  ingredients: { ingredientKey: string; amount: number; unit: string }[];
}

// Expertenaufgabe E2: 250 g Mehl, 500 ml Milch, 4 Eier — für 4 Personen.
const PFANNKUCHEN: Dish = {
  id: "pfannkuchen",
  icon: "cake",
  orderKey: `${KEY}.orders.pfannkuchen`,
  serves: 4,
  targets: [6, 8, 10, 12, 20, 30],
  ingredients: [
    { ingredientKey: `${KEY}.ingredients.mehl`, amount: 250, unit: "g" },
    { ingredientKey: `${KEY}.ingredients.milch`, amount: 500, unit: "ml" },
    { ingredientKey: `${KEY}.ingredients.eier`, amount: 4, unit: "" },
  ],
};

// Expertenaufgabe E4: 50 g Haferflocken und 200 ml Milch — ein Müsli pro Person.
const MUESLI: Dish = {
  id: "muesli",
  icon: "plant",
  orderKey: `${KEY}.orders.muesli`,
  serves: 1,
  targets: [4, 5, 6, 8, 12, 25],
  ingredients: [
    { ingredientKey: `${KEY}.ingredients.haferflocken`, amount: 50, unit: "g" },
    { ingredientKey: `${KEY}.ingredients.milch`, amount: 200, unit: "ml" },
  ],
};

// The Weltacker lunch of the unit: Linsencurry für 4 Personen.
const CURRY: Dish = {
  id: "curry",
  icon: "bowl",
  orderKey: `${KEY}.orders.curry`,
  serves: 4,
  targets: [6, 8, 12, 20],
  ingredients: [
    { ingredientKey: `${KEY}.ingredients.linsen`, amount: 300, unit: "g" },
    { ingredientKey: `${KEY}.ingredients.kokosmilch`, amount: 400, unit: "ml" },
    { ingredientKey: `${KEY}.ingredients.reis`, amount: 200, unit: "g" },
  ],
};

// The other half of the Weltacker: Burger für 4 Personen.
const BURGER: Dish = {
  id: "burger",
  icon: "burger",
  orderKey: `${KEY}.orders.burger`,
  serves: 4,
  targets: [6, 8, 10, 12, 20],
  ingredients: [
    { ingredientKey: `${KEY}.ingredients.hack`, amount: 400, unit: "g" },
    { ingredientKey: `${KEY}.ingredients.broetchen`, amount: 4, unit: "" },
    { ingredientKey: `${KEY}.ingredients.kaese`, amount: 8, unit: "" },
  ],
};

const DISHES: Dish[] = [PFANNKUCHEN, MUESLI, CURRY, BURGER];

/** Four distinct whole-number tiles for one slot, the right one among them. */
function tiles(correct: number, distractors: number[]): string[] {
  const picked: number[] = [correct];
  for (const candidate of distractors) {
    if (
      Number.isInteger(candidate) &&
      candidate > 0 &&
      candidate !== correct &&
      !picked.includes(candidate)
    ) {
      picked.push(candidate);
    }
    if (picked.length === 4) break;
  }
  // Rare clashes (the eggs of E2 add up either way) get a further factor.
  for (let extra = 2; picked.length < 4; extra++) {
    const candidate = correct * extra;
    if (!picked.includes(candidate) && Number.isInteger(candidate) && candidate > 0) {
      picked.push(candidate);
    }
  }
  return shuffled(picked).map((value) => zuordnungNumber(value));
}

/** A proportionale ticket: scale every ingredient of a dish by the same factor. */
function makeEinkaufOrder(id: number): KuecheOrder {
  const dish = pick(DISHES);
  const cookingFor = pick(dish.targets);
  const f = cookingFor / dish.serves;
  const wrongFactor = pick([2, 3, 4, 5].filter((factor) => factor !== f));

  return {
    id,
    task: "einkauf",
    icon: dish.icon,
    wordingKey: dish.orderKey,
    params: { for: dish.serves, cookingFor },
    recipe: dish.ingredients.map((ingredient) => ({
      ingredientKey: ingredient.ingredientKey,
      amount: zuordnungNumber(ingredient.amount),
      unit: ingredient.unit,
    })),
    slots: dish.ingredients.map((ingredient) => ({
      labelKey: ingredient.ingredientKey,
      unit: ingredient.unit,
      tiles: tiles(ingredient.amount * f, [
        // the plausible mistakes: wrong factor outright, amounts added to
        // extra persons, and one portion too many
        ingredient.amount * wrongFactor,
        ingredient.amount + (cookingFor - dish.serves),
        ingredient.amount * (f + 1),
      ]),
    })),
  };
}

/** An antiproportionale ticket: the Pfannenhilfe of E2. */
function makePfanneOrder(id: number): KuecheOrder {
  const persons = pick([4, 8, 12, 16, 20]);
  const crepes = 2 * persons;
  const single = 3 * crepes;
  // Pans that share the pancakes evenly, so no remainder shows up anywhere.
  const pans = pick([2, 3, 4, 6, 8].filter((count) => crepes % count === 0));
  const answer = single / pans;

  return {
    id,
    task: "pfanne",
    icon: "clock",
    wordingKey: `${KEY}.orders.pfanne`,
    params: { persons, crepes, single, pans },
    recipe: [],
    slots: [
      {
        labelKey: `${KEY}.slotTime`,
        unit: "",
        tiles: tiles(answer, [
          // minutes counted without the 3 minutes per pancake, the odd
          // pancake per pan, one pan more or less, and not splitting at all
          crepes / pans,
          answer + 3,
          answer - 3,
          single,
          pans * 3,
        ]),
      },
    ],
  };
}

/** The tile index that is right for a slot — known here, and only here. */
function expectedTile(order: KuecheOrder, slot: number): string {
  if (order.task === "einkauf") {
    const base = Number(order.recipe[slot].amount.replace(",", "."));
    const factor = order.params.cookingFor / order.params.for;
    return zuordnungNumber(base * factor);
  }
  return zuordnungNumber(order.params.single / order.params.pans);
}

/** The maximum events one report may carry. */
const MAX_ORDER_BATCH = 50;

const kuecheStage: StageHandler = {
  id: "kueche",
  // A live stage has no questions to blank out; the board is the tickets, and
  // the answer is not in them.
  forPlayer: (question) => question,
  live: true,

  createQuestions: () => [],

  createExtra({ settings }) {
    const tasks = readKuecheTasks(settings);
    const total = Number(settings.ordersPerRound ?? 8);
    const orders = Array.from({ length: total }, (_, id) =>
      pick(tasks) === "einkauf" ? makeEinkaufOrder(id) : makePfanneOrder(id),
    );
    return { orders, offered: orders.length } satisfies Partial<KuecheRoundExtra>;
  },

  evaluate: () => ({ correct: false, points: 0 }),

  // The board and the tallies are public; what a player picked is theirs.
  // Another player's picks would hand over the right tiles before answering,
  // so each viewer gets only their own settled list. Once the round is over
  // the solutions may be revealed — the review shows them for every ticket,
  // including ones that were never served.
  extraForPlayer(extra, playerId, over) {
    const { settled, ...rest } = extra as Partial<KuecheRoundExtra> & Record<string, unknown>;
    const own = settled?.[playerId];
    const view: Record<string, unknown> = { ...rest, settled: own ? { [playerId]: own } : {} };
    if (over) {
      const { orders } = extra as unknown as KuecheRoundExtra;
      view.truth = Object.fromEntries(
        orders.map((order) => [order.id, order.slots.map((_, slot) => expectedTile(order, slot))]),
      );
    }
    return view;
  },

  onAction(data, payload, playerId) {
    if (payload.action !== "hits") return false;
    const batch = payload as { events?: unknown };
    if (!Array.isArray(batch.events) || batch.events.length > MAX_ORDER_BATCH) return false;

    const extra = data.extra as unknown as KuecheRoundExtra;
    const { orders } = extra;
    let changed = false;

    for (const event of batch.events) {
      const tally = liveTally(data, playerId);
      // Tickets are settled in order and exactly once: the next one a player
      // may report is the one after everything they have reported so far.
      const next = tally.hits + tally.misses;
      const report = event as Partial<KuecheEvent>;
      if (Number(report.id) !== next) continue;
      const order = orders[next];
      if (!order) continue;

      const picks = Array.isArray(report.picks) ? report.picks.map(Number) : [];
      // The right tile per slot — known here, and only here until the ticket
      // is settled; then it is written into the player's own settled entry,
      // where the flash and the round review read it back.
      const truth = order.slots.map((_, slot) => expectedTile(order, slot));
      const slotsRight = order.slots.map((slot, index) => {
        const pickIndex = picks[index];
        return Number.isInteger(pickIndex) && slot.tiles[pickIndex] === truth[index];
      });
      const right = picks.length === order.slots.length && slotsRight.every(Boolean);

      const ms = report.ms == null ? null : Number(report.ms);
      // No per-ticket clock anymore: the round's clock is the only timer, and
      // a ticket counts when the amounts are right — the time is kept only
      // for the round's average.
      const hit = right;

      recordLiveEvent(data, playerId, {
        correct: hit,
        points: hit ? 100 : 0,
        ms: hit && ms != null && isFinite(ms) && ms >= 0 ? ms : undefined,
      });
      const mine = (extra.settled ??= {});
      (mine[playerId] ??= []).push({ id: order.id, picks, truth, correct: hit });
      changed = true;
    }
    return changed;
  },

  // The round is over once everybody has settled every ticket — no waiting
  // for the clock with three tickets left. Until then the round's own clock
  // is the only timer: there is no per-ticket time bar.
  isFinished(data, players) {
    const { orders } = data.extra as unknown as KuecheRoundExtra;
    return players.every((player) => {
      const tally = liveTally(data, player.id);
      return tally.hits + tally.misses >= orders.length;
    });
  },

  scorePlayer: (data, playerId) => liveScore(data, playerId),
};

// ---------------------------------------------------------------------------
// vorschrift — the Zuordnungsvorschrift of a table or a graph, as a term
// ---------------------------------------------------------------------------

/** A number as LaTeX, German comma and all. */
function latexNumber(value: number): string {
  return zuordnungNumber(value).replace(",", "{,}");
}

/** Four Vorschriften: the right one and the three confusions near it. */
function vorschriftOptions(kind: VorschriftKind, k: number, d: number, p: number) {
  let correct: string;
  let distractors: string[];

  if (kind === "proportional") {
    correct = `y = ${latexNumber(k)} \\cdot x`;
    distractors = [
      `y = x + ${latexNumber(k)}`,
      `y = ${latexNumber(k)} : x`,
      `y = ${latexNumber(k)} \\cdot x + ${latexNumber(k)}`,
    ];
  } else if (kind === "antiproportional") {
    correct = `y = ${p} : x`;
    distractors = [`y = ${p} \\cdot x`, `y = ${p} - x`, `y = ${p} + x`];
  } else {
    correct = `y = ${latexNumber(k)} \\cdot x + ${latexNumber(d)}`;
    distractors = [
      `y = ${latexNumber(k)} \\cdot x`,
      `y = ${latexNumber(d)} \\cdot x + ${latexNumber(k)}`,
      `y = ${latexNumber(k)} \\cdot x - ${latexNumber(d)}`,
    ];
  }

  const options = shuffled([correct, ...distractors]);
  return { options, answerIndex: options.indexOf(correct) };
}

function makeVorschriftQuestion(
  id: number,
  sources: VorschriftSource[],
  kinds: VorschriftKind[],
): VorschriftQuestion {
  const kind = pick(kinds);
  const source = pick(sources);

  const shared = {
    id,
    source,
    kind,
  };

  if (kind === "proportional") {
    const context = pick(PROPORTIONAL);
    const xs = sample(context.xs, 3).sort((a, b) => a - b);
    const { options, answerIndex } = vorschriftOptions("proportional", context.k, 0, 0);
    return {
      ...shared,
      icon: context.icon,
      setupKey: context.setupKey,
      xLabelKey: context.xLabelKey,
      yLabelKey: context.yLabelKey,
      xUnit: context.xUnit,
      yUnit: context.yUnit,
      ...(source === "tabelle"
        ? { rows: xs.map((x) => ({ x, y: context.k * x })) }
        : {
            window: { xMax: xs[2] + 2, yMax: context.k * (xs[2] + 2) },
            curve: { type: "proportional", k: context.k },
            point: { x: xs[0], y: context.k * xs[0] },
          }),
      options,
      answerIndex,
    };
  }

  if (kind === "antiproportional") {
    const context = pick(ANTIPROPORTIONAL);
    const xs = sample(context.xs, 3).sort((a, b) => a - b);
    const { options, answerIndex } = vorschriftOptions("antiproportional", 0, 0, context.p);
    return {
      ...shared,
      icon: context.icon,
      setupKey: context.setupKey,
      xLabelKey: context.xLabelKey,
      yLabelKey: context.yLabelKey,
      xUnit: context.xUnit,
      yUnit: context.yUnit,
      ...(source === "tabelle"
        ? { rows: xs.map((x) => ({ x, y: context.p / x })) }
        : {
            window: { xMax: Math.max(xs[2] + 2, 12), yMax: Math.ceil((context.p / xs[0]) * 1.25) },
            curve: { type: "antiproportional", p: context.p },
            point: { x: xs[0], y: context.p / xs[0] },
          }),
      options,
      answerIndex,
    };
  }

  const context = pick(LINEAR);
  const xs = sample(context.xs, 3).sort((a, b) => a - b);
  const { options, answerIndex } = vorschriftOptions("linear", context.k, context.d, 0);
  return {
    ...shared,
    icon: context.icon,
    setupKey: context.setupKey,
    xLabelKey: context.xLabelKey,
    yLabelKey: context.yLabelKey,
    xUnit: context.xUnit,
    yUnit: context.yUnit,
    ...(source === "tabelle"
      ? { rows: xs.map((x) => ({ x, y: context.k * x + context.d })) }
      : {
          window: { xMax: xs[2] + 2, yMax: context.k * (xs[2] + 2) + context.d },
          curve: { type: "linear", k: context.k, d: context.d },
          point: { x: xs[0], y: context.k * xs[0] + context.d },
        }),
    options,
    answerIndex,
  };
}

const vorschriftStage: StageHandler<VorschriftQuestion> = {
  id: "vorschrift",
  // Options travel with the question; only the index of the right one is held back.
  forPlayer: (question) => ({ ...question, answerIndex: -1 }),

  createQuestions({ settings }) {
    const sources = readVorschriftSources(settings);
    const kinds = readVorschriftKinds(settings);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) =>
      makeVorschriftQuestion(id, sources, kinds),
    );
  },

  evaluate(question, answer, { questionMs }) {
    return evaluateChoice(question.answerIndex, answer, questionMs);
  },
};

export default createStageGame(zuordnungSpec, [
  modellStage,
  tabelleStage,
  kuecheStage,
  graphStage,
  vorschriftStage,
]);
