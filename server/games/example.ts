import type * as Party from "partykit/server";
import type { GameHandler } from "../types";
import type { LobbyState, GameResult, ExampleSettings } from "../../shared/types";
import { defaultExampleSettings } from "../../shared/types";

interface ExampleGameData {
  currentRound: number;
  totalRounds: number;
  duration: number;
  targetScore: number;
  clicks: Record<string, number>; // playerId -> clicks this round
  startTime: number;
  finished: boolean;
}

function getSettings(state: LobbyState): ExampleSettings {
  return { ...defaultExampleSettings, ...((state.settings ?? {}) as Partial<ExampleSettings>) };
}

function buildRoundData(state: LobbyState, round: number): ExampleGameData {
  const settings = getSettings(state);
  return {
    currentRound: round,
    totalRounds: settings.rounds,
    duration: settings.duration,
    targetScore: settings.targetScore,
    clicks: {},
    startTime: Date.now(),
    finished: false,
  };
}

function getRoundResults(state: LobbyState): GameResult[] {
  const gameData = state.gameData as ExampleGameData;
  return state.players
    .filter((p) => !p.isHost)
    .map((p) => ({
      playerId: p.id,
      playerName: p.name,
      score: gameData.clicks[p.id] ?? 0,
    }))
    .sort((a, b) => b.score - a.score);
}

const exampleHandler: GameHandler = {
  onStart(state: LobbyState): ExampleGameData {
    return buildRoundData(state, 1);
  },

  onRoundStart(state: LobbyState): ExampleGameData {
    const prev = state.gameData as ExampleGameData;
    return buildRoundData(state, (prev?.currentRound ?? 0) + 1);
  },

  onMessage(state: LobbyState, payload: unknown, sender: Party.Connection): ExampleGameData | undefined {
    const gameData = state.gameData as ExampleGameData;
    if (!gameData || gameData.finished) return undefined;

    const action = payload as { action: string };
    if (action?.action === "click") {
      gameData.clicks[sender.id] = (gameData.clicks[sender.id] ?? 0) + 1;
      return { ...gameData };
    }

    return undefined;
  },

  checkRoundFinished(state: LobbyState): GameResult[] | undefined {
    const gameData = state.gameData as ExampleGameData;
    if (!gameData) return undefined;

    const elapsed = (Date.now() - gameData.startTime) / 1000;
    if (elapsed >= gameData.duration || gameData.finished) {
      return getRoundResults(state);
    }

    return undefined;
  },

  isLastRound(state: LobbyState): boolean {
    const gameData = state.gameData as ExampleGameData;
    return (gameData?.currentRound ?? 1) >= (gameData?.totalRounds ?? 1);
  },

  getDurationMs(state: LobbyState): number {
    const gameData = state.gameData as ExampleGameData;
    return (gameData?.duration ?? defaultExampleSettings.duration) * 1000;
  },
};

export default exampleHandler;
