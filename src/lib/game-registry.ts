import type { ComponentType } from "react";
import type {
  GameSpec,
  StageQuestion,
  StageRoundData,
  StageSettings,
  StageSpec,
} from "../../shared/framework";
import { gameSpecs } from "../../shared/games";
import type { GameMeta, PlayerAnswer } from "../../shared/types";

/**
 * Props every stage component receives. The shell (see StageShell) takes care of
 * the timer, the score header, the host view and the "all answered" state, so a
 * stage component only has to render the question it was handed.
 */
export interface StageProps<Q extends StageQuestion = StageQuestion> {
  /** The current round, as broadcast by the server. */
  data: StageRoundData<Q>;
  /** The question this player still has to answer, or null when there is none. */
  question: Q | null;
  /** How many questions this player has answered so far. */
  answeredCount: number;
  /**
   * True while the shell is holding the question that was just answered on
   * screen, so the stage can show the answer on it (see `revealMs`). `question`
   * is then that question rather than the next one, and `submit` does nothing.
   */
  revealed: boolean;
  /** Submits an answer for `question`. */
  submit: (answer: string) => void;
  /** Escape hatch for stages that are not question based. */
  sendAction: (payload: unknown) => void;
  /** Resolved settings of this stage. */
  settings: StageSettings;
  isHost: boolean;
  playerId: string;
}

/**
 * What a stage shows in the round review on a player's device: the question as
 * it was asked, what this player answered, and — when that was not right — what
 * would have been. The frame around it (number, tick, points) is the review's
 * own, see RoundReview.
 */
export interface StageReviewProps<Q extends StageQuestion = StageQuestion> {
  question: Q;
  /** What this player answered, or undefined when the round ran out first. */
  answer: PlayerAnswer | undefined;
  data: StageRoundData<Q>;
  playerId: string;
}

/**
 * One answer the class gave to one question, as the round debrief counts them
 * (`src/components/RoundDebrief.tsx`).
 */
export interface ClassAnswer {
  /** The answer as it was stored. */
  answer: string;
  /** What it means to read — `answerLabel` applied, or the answer itself. */
  label: string;
  /** How many players gave it. */
  count: number;
  correct: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyStageComponent = ComponentType<StageProps<any>>;

/** The React side of a stage. */
export interface StageComponents {
  /** Rendered while the stage is being played. */
  Component: AnyStageComponent;
  /** Optional illustration shown with the rules before the round starts. */
  RulesExample?: ComponentType;
  /**
   * How long the question just answered stays on screen before the next one
   * comes up, in milliseconds. Omit for none: the stage moves straight on, the
   * way most of them do.
   *
   * An answer is only worth giving if you find out what it was an answer to,
   * and a number in the round review ten questions later is not that. Where a
   * station can show it — the root on the line the guess was placed on, the
   * curve next to the one that was drawn — a beat here is the moment the
   * learning actually happens. The shell owns it because the shell owns the
   * clock and the question the player is on; a stage only draws itself with
   * `revealed` set (the number line is the worked example).
   */
  revealMs?: number;
  /** Stages without questions (a tap round, say) render even without a question. */
  questionless?: boolean;
  /**
   * Lends the player a scratch calculator while the stage is being played
   * (`src/components/Calculator.tsx`), in the bar at the bottom of the screen.
   *
   * For the stations whose questions do real arithmetic — a Java listing that
   * prints `1273 / 17`, a Python one that prints `12 ** 4`. What those ask is
   * whether the reader can follow the program; long division against a clock
   * is a second, unrelated exam sat at the same time, and the weaker the
   * arithmetic the more of the mark it takes. The calculator never sees the
   * question, so knowing that Java answers `7 / 2` with 3 and not 3.5 is still
   * the player's to know.
   */
  calculator?: boolean;
  /** Replaces the default progress list the host sees. */
  HostView?: AnyStageComponent;
  /** Live score of a player, when the stage does not score by answer points.
   *  Mirror of the server-side StageHandler.scorePlayer. */
  scorePlayer?: (data: StageRoundData<any>, playerId: string) => number;
  /** One row of the round review. Without it the review still shows what the
   *  player answered and what it scored, just not the question itself. */
  Review?: ComponentType<StageReviewProps<any>>;
  /** Replaces the whole round review. A live stage has no list of questions to
   *  walk through afterwards — what it has is a tally — so it brings one of
   *  these instead of a `Review`. */
  RoundSummary?: AnyStageComponent;
  /**
   * The right answer on its own, for the host talking a question through with
   * the class afterwards (`RoundDebrief`).
   *
   * Optional, and the debrief is useful without it: the question is drawn by
   * the stage's own component and how many got it right needs no help. This is
   * for the case that matters most and that the data cannot cover — the
   * question *nobody* got, where the answer appears nowhere on the board.
   */
  Solution?: ComponentType<{ question: any }>;
  /**
   * What one raw answer means, for the same screen. A stage that takes typed
   * text needs nothing here; one whose answers are "2" or a line number does,
   * or the class's answers read as a column of indices.
   */
  answerLabel?: (question: any, answer: string) => string;
  /**
   * The class's answers to one question, drawn the way the question was.
   *
   * The debrief's default is the question as asked with the answers listed
   * under it, which is right for a station whose answers are words or terms.
   * It is wrong for one whose answers are positions: twenty decimals in a
   * column say nothing that the same twenty marks on a number line say at a
   * glance. A stage that brings one of these replaces both halves — it draws
   * the question *and* the answers, so the class's marks land on the same line
   * the class put them on.
   *
   * It gets the round as well as the question, since how an answer is to be
   * read can depend on the settings the round was played at (whether a curve
   * was drawn freehand or placed point by point, say).
   */
  ClassAnswers?: ComponentType<{
    question: any;
    answers: ClassAnswer[];
    data: StageRoundData<any>;
  }>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface ClientStage extends StageSpec, StageComponents {}

export interface GameDefinition extends Omit<GameSpec, "stages"> {
  stages: ClientStage[];
}

/**
 * Joins a game spec with the React components of its stages.
 * Throws when the two disagree, so a typo shows up on the first render
 * instead of halfway through a lesson.
 */
export function defineGame(
  spec: GameSpec,
  components: Record<string, StageComponents>,
): GameDefinition {
  const stages: ClientStage[] = spec.stages.map((stage) => {
    const parts = components[stage.id];
    if (!parts) {
      throw new Error(`Game "${spec.id}": stage "${stage.id}" has no components`);
    }
    return { ...stage, ...parts };
  });

  for (const id of Object.keys(components)) {
    if (!spec.stages.some((stage) => stage.id === id)) {
      throw new Error(`Game "${spec.id}": components for unknown stage "${id}"`);
    }
  }

  return { ...spec, stages };
}

/**
 * Client-side game registry.
 * To add a game, create a spec in shared/games/, a directory in src/games/ and
 * register it here — see documentation.md.
 */
import exampleGame from "../games/example";
import squarerootGame from "../games/squareroot";
import analysisGame from "../games/analysis";
import rationalGame from "../games/rational";
import chanceGame from "../games/chance";
import extremumGame from "../games/extremum";
import termeGame from "../games/terme";
import pythonGame from "../games/python";
import javaGame from "../games/java";
import intuitionGame from "../games/intuition";

export const games: Record<string, GameDefinition> = {
  example: exampleGame,
  squareroot: squarerootGame,
  analysis: analysisGame,
  rational: rationalGame,
  chance: chanceGame,
  extremum: extremumGame,
  terme: termeGame,
  python: pythonGame,
  java: javaGame,
  intuition: intuitionGame,
};

// Every spec needs a client definition, and vice versa.
for (const id of Object.keys(gameSpecs)) {
  if (!games[id]) throw new Error(`Game spec "${id}" has no client definition`);
}
for (const id of Object.keys(games)) {
  if (!gameSpecs[id]) throw new Error(`Client game "${id}" has no spec`);
}

export function getGame(id: string): GameDefinition | undefined {
  return games[id];
}

export function getAllGames(): GameDefinition[] {
  return Object.values(games);
}

export function getGamesByCategory(category: GameMeta["category"]): GameDefinition[] {
  return getAllGames().filter((g) => g.category === category);
}

export function getLiveGames(): GameDefinition[] {
  return getAllGames().filter((g) => g.status === "live");
}

export function getStage(game: GameDefinition, stageId: string): ClientStage | undefined {
  return game.stages.find((stage) => stage.id === stageId);
}
