import type { GameMeta, LobbyState, ServerMessage } from "../../shared/types";

// Props passed to a game's React component
export interface GameProps {
  state: LobbyState;
  gameData: unknown;
  isHost: boolean;
  playerId: string;
  sendMessage: (payload: unknown) => void;
}

// Props passed to a game's settings component (shown in lobby for the host)
export interface GameSettingsProps {
  settings: unknown;
  onChange: (settings: unknown) => void;
}

export interface GameDefinition extends GameMeta {
  // React component rendered during the game phase
  Component: React.ComponentType<GameProps>;
  // Optional: settings UI shown in the lobby for the host
  SettingsComponent?: React.ComponentType<GameSettingsProps>;
  // Optional: explanation shown during the countdown before each game/round
  ExplanationComponent?: React.ComponentType<GameProps>;
}

/**
 * Client-side game registry.
 * To add a new game, create a directory in src/games/ and register it here.
 */
import exampleGame from "../games/example";
import squarerootGame from "../games/squareroot";
import analysisGame from "../games/analysis";

export const games: Record<string, GameDefinition> = {
  example: exampleGame,
  squareroot: squarerootGame,
  analysis: analysisGame,
};

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

export type { ServerMessage };
