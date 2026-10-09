import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { LobbyState } from "../../shared/types";
import { useGameConnection } from "./connection";
import { useLobbySession } from "./lobby-session";

vi.mock("./connection", () => ({ useGameConnection: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const state: LobbyState = {
  code: "ABC123",
  gameId: "example",
  hostId: "host",
  phase: "finished",
  players: [
    { id: "host", name: "Host", isHost: true, score: 0, crowns: 0, connected: true },
    { id: "late", name: "Late", isHost: false, score: 2, crowns: 0, connected: true },
    { id: "returning", name: "Returning", isHost: false, score: 10, crowns: 1, connected: true },
  ],
  gameData: { startTime: 123, duration: 30 },
  settings: null,
  countdownEndsAt: null,
};

function connect(lobbyState: LobbyState) {
  vi.mocked(useGameConnection).mockReturnValue({
    socket: null,
    lobbyState,
    error: null,
    closed: null,
    sendMessage: vi.fn(),
    sendGameAction: vi.fn(),
    connected: true,
  });
}

it("restores final standings and crowns after reopening without a finished message", () => {
  connect(state);
  const { result } = renderHook(() => useLobbySession(state.code));

  expect(result.current.finalResults).toEqual([
    { playerId: "returning", playerName: "Returning", score: 10, crowns: 1 },
    { playerId: "late", playerName: "Late", score: 2, crowns: 0 },
  ]);
});

it("starts a late arrival in the existing round using its original clock", () => {
  connect({ ...state, phase: "playing" });
  const { result } = renderHook(() => useLobbySession(state.code));

  expect(result.current.gameStarted).toBe(true);
  expect(result.current.gameData).toEqual(state.gameData);
});
