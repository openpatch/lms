import type { ComponentType } from "react";
import type {
  GameSpec,
  StageQuestion,
  StageRoundData,
  StageSettings,
  StageSpec,
} from "../../shared/framework";
import { gameSpecs } from "../../shared/games";
import type { GameMeta } from "../../shared/types";

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
  /** Submits an answer for `question`. */
  submit: (answer: string) => void;
  /** Escape hatch for stages that are not question based. */
  sendAction: (payload: unknown) => void;
  /** Resolved settings of this stage. */
  settings: StageSettings;
  isHost: boolean;
  playerId: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyStageComponent = ComponentType<StageProps<any>>;

/** The React side of a stage. */
export interface StageComponents {
  /** Rendered while the stage is being played. */
  Component: AnyStageComponent;
  /** Optional illustration shown with the rules before the round starts. */
  RulesExample?: ComponentType;
  /** Stages without questions (a tap round, say) render even without a question. */
  questionless?: boolean;
  /** Replaces the default progress list the host sees. */
  HostView?: AnyStageComponent;
  /** Live score of a player, when the stage does not score by answer points.
   *  Mirror of the server-side StageHandler.scorePlayer. */
  scorePlayer?: (data: StageRoundData<any>, playerId: string) => number;
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

export const games: Record<string, GameDefinition> = {
  example: exampleGame,
  squareroot: squarerootGame,
  analysis: analysisGame,
  rational: rationalGame,
  chance: chanceGame,
  extremum: extremumGame,
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
