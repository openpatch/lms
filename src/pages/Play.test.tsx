import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { exampleSpec } from "../../shared/games/example";
import { getGame } from "../lib/game-registry";
import { useLobbySession } from "../lib/lobby-session";
import Play from "./Play";
import "../i18n";

vi.mock("../lib/lobby-session", () => ({ useLobbySession: vi.fn() }));
vi.mock("../lib/game-registry", () => ({ getGame: vi.fn(), getStage: vi.fn() }));
vi.mock("../lib/game-theme", () => ({ useActiveGame: vi.fn() }));
vi.mock("../components/StageShell", () => ({
  default: ({ playerId }: { playerId: string }) => <div data-testid="player-id">{playerId}</div>,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

it("uses the returning student's saved identity when another student has the same name", () => {
  localStorage.setItem("lms:player:ABC123", "Alex");
  localStorage.setItem("lms:clientId:ABC123", "returning-student");
  vi.mocked(getGame).mockReturnValue({ ...exampleSpec, stages: [] });
  vi.mocked(useLobbySession).mockReturnValue({
    conn: {
      socket: null,
      lobbyState: {
        code: "ABC123",
        gameId: "example",
        hostId: "host",
        phase: "playing",
        players: [
          { id: "other-student", name: "Alex", isHost: false, score: 0, crowns: 0, connected: true },
          { id: "returning-student", name: "Alex", isHost: false, score: 10, crowns: 1, connected: true },
        ],
        gameData: null,
        settings: null,
        countdownEndsAt: null,
      },
      error: null,
      closed: null,
      sendMessage: vi.fn(),
      sendGameAction: vi.fn(),
      connected: true,
    },
    gameData: null,
    gameStarted: true,
    countdownEndsAt: null,
    roundResults: [],
    finalResults: [],
  });

  render(
    <MemoryRouter initialEntries={["/play/ABC123"]}>
      <Routes>
        <Route path="/play/:code" element={<Play />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getByTestId("player-id").textContent).toBe("returning-student");
  expect(vi.mocked(useLobbySession).mock.results[0].value.conn.sendMessage).toHaveBeenCalledWith({
    type: "join", name: "Alex",
  });
});
