import { chanceSpec, readReplacement } from "../../shared/games/chance";
import type {
  LaplaceQuestion,
  TreeAnswer,
  TreeQuestion,
} from "../../shared/games/chance";
import { speedPoints } from "../../shared/framework";
import type { Fraction } from "../../shared/rational-math";
import { equals, makeValue, parseFraction, reduce } from "../../shared/rational-math";
import type { TreeEvent, TreeModel } from "../../shared/chance-model";
import { ALL_PATHS, eventPaths, eventProbability, repeatedModel, urnModel } from "../../shared/chance-model";
import { assignmentPoints, cardsBySlot, parseAssignment } from "../../shared/matching";
import type { StageHandler } from "../framework";
import { createStageGame } from "../framework";

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// laplace — one-stage experiments (EdM 1.1-1.3)
// ---------------------------------------------------------------------------

const KEY = "games.chance";

/** One Laplace question: a setup, an event, and how many outcomes favour it. */
function makeLaplaceQuestion(id: number): LaplaceQuestion {
  switch (randomInt(0, 3)) {
    case 0: {
      // Urn with two colours
      const red = randomInt(2, 6);
      const blue = randomInt(2, 6);
      const wantsRed = Math.random() < 0.5;
      return {
        id,
        icon: "🔴",
        setupKey: `${KEY}.setups.urn`,
        eventKey: wantsRed ? `${KEY}.events.red` : `${KEY}.events.blue`,
        params: { red, blue },
        favourable: wantsRed ? red : blue,
        outcomes: red + blue,
      };
    }
    case 1: {
      // Wheel of fortune with equal sectors
      const sectors = pick([4, 5, 6, 8, 10, 12]);
      const winning = randomInt(1, sectors - 1);
      return {
        id,
        icon: "🎡",
        setupKey: `${KEY}.setups.wheel`,
        eventKey: `${KEY}.events.win`,
        params: { sectors, winning },
        favourable: winning,
        outcomes: sectors,
      };
    }
    case 2: {
      // A card from a 32 card deck
      const events = [
        { key: `${KEY}.events.hearts`, favourable: 8 },
        { key: `${KEY}.events.ace`, favourable: 4 },
        { key: `${KEY}.events.redCard`, favourable: 16 },
      ];
      const event = pick(events);
      return {
        id,
        icon: "🃏",
        setupKey: `${KEY}.setups.cards`,
        eventKey: event.key,
        params: {},
        favourable: event.favourable,
        outcomes: 32,
      };
    }
    default: {
      // A die
      const events = [
        { key: `${KEY}.events.even`, favourable: 3 },
        { key: `${KEY}.events.prime`, favourable: 3 },
        { key: `${KEY}.events.six`, favourable: 1 },
        { key: `${KEY}.events.greaterThanFour`, favourable: 2 },
      ];
      const event = pick(events);
      return {
        id,
        icon: "🎲",
        setupKey: `${KEY}.setups.die`,
        eventKey: event.key,
        params: {},
        favourable: event.favourable,
        outcomes: 6,
      };
    }
  }
}

const laplaceStage: StageHandler<LaplaceQuestion> = {
  id: "laplace",

  createQuestions({ settings }) {
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) =>
      makeLaplaceQuestion(id),
    );
  },

  evaluate(question, answer, { questionMs }) {
    const parsed = parseFraction(answer);
    // Equivalent notations all count: 3/6, 1/2, 0.5 and 50 % are the same chance
    if (!parsed || !equals(parsed, { n: question.favourable, d: question.outcomes })) {
      return { correct: false, points: 0 };
    }
    return { correct: true, points: speedPoints(questionMs / 1000, 2, 20) };
  },
};

// ---------------------------------------------------------------------------
// tree — two-stage experiments and the path rules (EdM 1.5, 1.6)
// ---------------------------------------------------------------------------

/** Share of the points that comes from the branches; the rest from the event. */
const TREE_BRANCH_SHARE = 0.5;
const TREE_EVENTS: TreeEvent[] = [
  "both-first",
  "both-second",
  "exactly-one-first",
  "at-least-one-first",
];

/** The four second-stage probabilities in slot order. */
function slotFractions(model: TreeModel): Fraction[] {
  return ALL_PATHS.map(([first, second]) => model.second[first][second]);
}

/** Wrong-but-tempting branch probabilities: the numbers of the first stage,
 *  and the neighbouring counts a student mixes up. */
function distractors(model: TreeModel, taken: Fraction[]): Fraction[] {
  const candidates = [
    model.first[0],
    model.first[1],
    reduce({ n: model.first[0].n + 1, d: model.first[0].d }),
    reduce({ n: model.first[1].n, d: model.first[1].d + 1 }),
  ];
  return candidates.filter(
    (candidate) =>
      candidate.n > 0 &&
      candidate.n < candidate.d &&
      !taken.some((used) => equals(used, candidate)),
  );
}

function makeTreeQuestion(id: number, mode: "with" | "without"): TreeQuestion {
  const useUrn = mode === "without" || Math.random() < 0.6;

  let model: TreeModel;
  let icon: string;
  let setupKey: string;
  let params: Record<string, number>;
  let outcomeKeys: [string, string];

  if (useUrn) {
    const red = randomInt(2, 5);
    const blue = randomInt(2, 5);
    model = urnModel(red, blue, mode === "with");
    icon = "🔴";
    setupKey = mode === "with" ? `${KEY}.setups.urnTwiceWith` : `${KEY}.setups.urnTwiceWithout`;
    params = { red, blue };
    outcomeKeys = [`${KEY}.outcomes.red`, `${KEY}.outcomes.blue`];
  } else {
    const sectors = pick([4, 5, 6, 8]);
    const winning = randomInt(1, sectors - 1);
    model = repeatedModel(reduce({ n: winning, d: sectors }));
    icon = "🎡";
    setupKey = `${KEY}.setups.wheelTwice`;
    params = { sectors, winning };
    outcomeKeys = [`${KEY}.outcomes.win`, `${KEY}.outcomes.lose`];
  }

  const slots = slotFractions(model);
  const event = pick(TREE_EVENTS);
  const cards = shuffle([...slots, ...distractors(model, slots).slice(0, 2)]);

  return {
    id,
    icon,
    setupKey,
    params,
    outcomeKeys,
    first: [makeValue(model.first[0]), makeValue(model.first[1])],
    slotAnswers: slots.map((fraction) => makeValue(fraction)),
    cards: cards.map((fraction) => makeValue(fraction)),
    event,
    eventKey: `${KEY}.treeEvents.${event}`,
    eventAnswer: makeValue(eventProbability(model, eventPaths(event))),
  };
}

const treeStage: StageHandler<TreeQuestion> = {
  id: "tree",

  createQuestions({ settings }) {
    const replacement = readReplacement(settings);
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const mode =
        replacement === "mixed" ? (Math.random() < 0.5 ? "with" : "without") : replacement;
      return makeTreeQuestion(id, mode);
    });
  },

  evaluate(question, answer) {
    let parsed: TreeAnswer;
    try {
      parsed = JSON.parse(answer) as TreeAnswer;
    } catch {
      return { correct: false, points: 0 };
    }

    const assignment = parseAssignment(
      JSON.stringify(parsed.assignment ?? []),
      question.cards.length,
      question.slotAnswers.length,
    );
    if (!assignment) return { correct: false, points: 0 };

    // A slot is right when it holds a card of the right probability — which of
    // two equal cards it is does not matter.
    const bySlot = cardsBySlot(assignment, question.slotAnswers.length);
    const matches = bySlot.map((card, slot) =>
      card == null ? false : equals(question.cards[card], question.slotAnswers[slot]),
    );

    const typed = typeof parsed.event === "string" ? parseFraction(parsed.event) : null;
    const eventCorrect = typed != null && equals(typed, question.eventAnswer);

    const branchPoints = assignmentPoints(matches) * TREE_BRANCH_SHARE;
    const eventPoints = eventCorrect ? 100 * (1 - TREE_BRANCH_SHARE) : 0;
    return {
      correct: matches.every(Boolean) && eventCorrect,
      points: Math.round(branchPoints + eventPoints),
    };
  },
};

export default createStageGame(chanceSpec, [laplaceStage, treeStage]);
