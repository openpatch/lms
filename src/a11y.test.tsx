/**
 * Every stage of every game, as a player sees it, checked with axe.
 *
 * The round is built by the game's own server handler, the way `/preview`
 * builds one, and drawn inside the same `StageShell` a lesson uses — so what
 * is checked is what a class gets. jsdom has no layout, so the rules that need
 * one (contrast, target size) are off and still need a real browser; what is
 * left is names, roles and structure: an unlabelled button, a field with no
 * name, an image with no alternative. `pnpm check:games` says whether a stage
 * works; this says whether everybody can work it.
 */
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gameHandlers } from "../server/games";
import { defaultGameSettings, type StageRoundData } from "../shared/framework";
import type { LobbyState } from "../shared/types";
import StageShell from "./components/StageShell";
import "./i18n";
import { getAllGames } from "./lib/game-registry";

// MathLive defines its custom element with a connectedCallback that throws
// under jsdom, from inside a callback nothing here can catch.
// Stood in for by an inert element that takes the properties the math input
// sets: what is checked here is the page around the field, not MathLive.
vi.mock("mathlive", () => {
  class MathfieldElement extends HTMLElement {
    value = "";
    mathVirtualKeyboardPolicy = "manual";
    smartFence = false;
    menuItems = [];
    getValue() {
      return this.value;
    }
    setValue(value: string) {
      this.value = value;
    }
  }
  if (!customElements.get("math-field")) customElements.define("math-field", MathfieldElement);
  return { MathfieldElement, renderMathInElement: () => {} };
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  onchange: null,
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

afterEach(cleanup);

const lobbyFor = (gameId: string, stageId: string): LobbyState => {
  const game = getAllGames().find((candidate) => candidate.id === gameId)!;
  const settings = defaultGameSettings(game);
  return {
    code: "A11Y",
    gameId,
    hostId: "host",
    players: [
      { id: "host", name: "Host", isHost: true, score: 0, crowns: 0, connected: true },
      { id: "player", name: "Player", isHost: false, score: 0, crowns: 0, connected: true },
    ],
    phase: "playing",
    gameData: null,
    settings: { ...settings, stages: [stageId] },
    countdownEndsAt: null,
  };
};

const stages = getAllGames().flatMap((game) =>
  game.stages.map((stage) => [`${game.id}/${stage.id}`, game.id, stage.id] as const),
);

describe("every stage, as a player sees it", () => {
  it.each(stages)("%s has no accessibility violations", async (_name, gameId, stageId) => {
    const game = getAllGames().find((candidate) => candidate.id === gameId)!;
    const state = lobbyFor(gameId, stageId);
    const handler = gameHandlers[gameId];
    state.gameData = handler.onStart!(state);
    state.gameData = handler.onRoundBegin?.(state, Date.now()) ?? state.gameData;
    // What a player's device is sent, not the round as the server holds it.
    const gameData = handler.forViewer ? handler.forViewer(state, "player") : state.gameData;

    const { container } = render(
      <StageShell
        game={game}
        state={{ ...state, gameData: gameData as StageRoundData }}
        gameData={gameData as StageRoundData}
        isHost={false}
        playerId="player"
        sendMessage={() => {}}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const results = await axe.run(container, {
      rules: {
        // Need layout, which jsdom does not have.
        "color-contrast": { enabled: false },
        "target-size": { enabled: false },
        // The shell is checked on its own, not as a whole page.
        region: { enabled: false },
      },
    });
    // A button whose only content is a formula is named by the formula's
    // MathML, which KaTeX writes beside its drawing and every browser exposes.
    // axe under jsdom does not always find it, so a `button-name` finding on
    // a button holding MathML is dropped here; anything else still counts.
    const namedByMath = (target: string) =>
      container.querySelector(target)?.querySelector(".katex-mathml math") != null;
    const real = results.violations
      .map((violation) =>
        violation.id === "button-name"
          ? { ...violation, nodes: violation.nodes.filter((node) => !namedByMath(String(node.target[0]))) }
          : violation,
      )
      .filter((violation) => violation.nodes.length > 0);
    const violations = real.map(
      (violation) =>
        `${violation.id}: ${violation.help} — ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join(", ")}`,
    );
    expect(violations).toEqual([]);
  });
});
