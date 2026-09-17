import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { gameHandlers } from "../../server/games";
import { defaultGameSettings } from "../../shared/framework";
import type { LobbyState } from "../../shared/types";
import { getAllGames, getGame, getStage } from "../lib/game-registry";
import { useActiveGame } from "../lib/game-theme";
import StageShell from "../components/StageShell";
import RoundReview from "../components/RoundReview";
import RoundDebrief from "../components/RoundDebrief";
import type { StageRoundData } from "../../shared/framework";
import Icon from "../components/icons";
import { ICON_NAMES } from "../../shared/icons";

/**
 * One stage, played on its own, with no server and no lobby.
 *
 * Development only — App.tsx only mounts it under `import.meta.env.DEV`, so it
 * is not in the production bundle and neither is the question generator it
 * imports. It exists because `pnpm dev` alone could not show a stage at all:
 * everything else goes through a teacher account, a lobby created over HTTP
 * and a WebSocket, which is a lot of ceremony for "does this keypad sit in the
 * right place".
 *
 * The round is built and graded in the tab by the game's own handler out of
 * `server/games/`, not by a stand-in written for the preview. A rehearsal
 * against a mock would be worth nothing: the questions a station generates are
 * half of what there is to look at.
 *
 * The other half is what the station says once the round is over, which is why
 * "Rückblick" is here too: the player's review rows and the host's debrief for
 * the round as it stands. Those screens otherwise need a round played out in a
 * lobby before anybody sees them, and they are where a stage most often turns
 * out to be wrong — a review that shows a tick and not the answer behind it is
 * only ever found by looking at one.
 */
export default function Preview() {
  const { gameId, stageId } = useParams();
  if (!gameId || !stageId) return <PreviewIndex />;
  return <StagePreview key={`${gameId}/${stageId}`} gameId={gameId} stageId={stageId} />;
}

/** The lobby a round is built against: one host, one player, default settings. */
function lobbyFor(gameId: string, stageId: string): LobbyState | null {
  const game = getGame(gameId);
  if (!game) return null;
  const settings = defaultGameSettings(game);
  return {
    code: "PREVIEW",
    gameId,
    hostId: "host",
    players: [
      { id: "host", name: "Host", isHost: true, score: 0, crowns: 0, connected: true },
      { id: "player", name: "Preview", isHost: false, score: 0, crowns: 0, connected: true },
    ],
    phase: "playing",
    gameData: null,
    // One stage, so the round the handler builds is the one asked for.
    settings: { ...settings, stages: [stageId] },
    countdownEndsAt: null,
  };
}

/** A round, built the way the server builds one, ready to be played. */
function newSession(gameId: string, stageId: string): LobbyState | null {
  const state = lobbyFor(gameId, stageId);
  const handler = gameHandlers[gameId];
  if (!state || !handler?.onStart) return null;
  state.gameData = handler.onStart(state);
  // The server builds a round when the rules go up and begins it when play
  // starts; with no rules screen in the way the two happen in one breath.
  state.gameData = handler.onRoundBegin?.(state, Date.now()) ?? state.gameData;
  return state;
}

function StagePreview({ gameId, stageId }: { gameId: string; stageId: string }) {
  const game = getGame(gameId);
  useActiveGame(game);
  // Built once per mount; the parent keys this component on the stage, so
  // picking another one starts a fresh round on its own.
  const [session, setSession] = useState(() => newSession(gameId, stageId));
  // Which take this is, and so the shell's key. A fresh round wants a fresh
  // screen: a stage holds its draft answer against the question's id, and the
  // first question of the new round carries the same id as the old one's.
  const [take, setTake] = useState(0);
  // The other half of a station: what it says once the round is over.
  const [reviewing, setReviewing] = useState(false);

  const reroll = () => {
    setSession(newSession(gameId, stageId));
    setTake((n) => n + 1);
    setReviewing(false);
  };

  const stage = game ? getStage(game, stageId) : undefined;
  if (!game || !stage || !session) return <Missing what={`${gameId}/${stageId}`} />;

  // The same call the WebSocket would carry, handed straight to the grader.
  // The lobby it is graded against is replaced rather than written into: the
  // server keeps one and mutates it, a React page must not.
  const sendMessage = (payload: unknown) => {
    const next = gameHandlers[gameId].onMessage?.(session, payload, { id: "player" });
    if (next) setSession({ ...session, gameData: next });
  };

  const round = session.gameData as StageRoundData | null;

  return (
    <>
      <Banner
        game={game.id}
        stage={stage.id}
        onReroll={reroll}
        reviewing={reviewing}
        onReview={() => {
          setReviewing((on) => !on);
          // The banner is at the bottom of a page that has just been scrolled
          // through; without this the screen it switches to opens halfway down.
          window.scrollTo({ top: 0 });
        }}
      />
      {reviewing && round ? (
        // The pair a round really ends on (see Demo): what the player gets
        // back, then what the host would talk the round through with. Whatever
        // has been answered is in it and the rest reads as unanswered, which is
        // the case worth looking at anyway — a review row that says nothing
        // when the clock ran out on its question is a row to fix.
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 pb-16">
          <RoundReview game={game} data={round} playerId="player" />
          <RoundDebrief game={game} data={round} players={session.players} />
        </div>
      ) : (
        <StageShell
          key={take}
          game={game}
          state={session}
          gameData={session.gameData}
          isHost={false}
          playerId="player"
          sendMessage={sendMessage}
        />
      )}
    </>
  );
}

function Banner({
  game,
  stage,
  onReroll,
  reviewing,
  onReview,
}: {
  game: string;
  stage: string;
  onReroll: () => void;
  reviewing: boolean;
  onReview: () => void;
}) {
  return (
    // Bottom left: the shell's own bars own the top of the screen, and the
    // bottom one keeps its buttons centred, so the corner is the one place
    // nothing else wants.
    <div className="fixed bottom-3 left-3 z-40 flex items-center gap-3 rounded-lg bg-yellow-100 px-3 py-1 text-xs text-yellow-900 shadow">
      <Link to="/preview" className="underline">
        preview
      </Link>
      <span className="font-mono">
        {game}/{stage}
      </span>
      <button onClick={onReroll} className="underline">
        neue Aufgaben
      </button>
      <button onClick={onReview} className="underline">
        {reviewing ? "zurück zur Station" : "Rückblick"}
      </button>
    </div>
  );
}

function Missing({ what }: { what: string }) {
  return (
    <div className="py-12 text-center text-gray-500">
      <p className="mb-4 font-mono">{what}</p>
      <Link to="/preview" className="text-brand-600 hover:underline">
        preview
      </Link>
    </div>
  );
}

/** Every stage of every game, one link each. */
function PreviewIndex() {
  useActiveGame(undefined);
  const games = useMemo(() => getAllGames(), []);
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-800">Stage-Vorschau</h1>
      <p className="mb-6 text-sm text-gray-500">
        Eine Station allein, ohne Server und ohne Lobby. Nur im Dev-Build.
      </p>
      {games.map((game) => (
        <section key={game.id} className="mb-6">
          <h2 className="mb-2 font-semibold text-gray-700">
            <Icon name={game.icon} /> {game.id}
          </h2>
          <div className="flex flex-wrap gap-2">
            {game.stages.map((stage) => (
              <Link
                key={stage.id}
                to={`/preview/${game.id}/${stage.id}`}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-sm text-gray-600 hover:border-brand-400 hover:text-brand-600"
              >
                {stage.id}
                {stage.calculator && <Icon name="calculator" className="ml-1" />}
              </Link>
            ))}
          </div>
        </section>
      ))}
      <IconSheet />
    </div>
  );
}

/**
 * Every icon at once, at the sizes the site actually uses them at.
 *
 * A drawing that is fine at 36px and a smudge at 16 is a drawing that is
 * wrong, and there is no other screen where they can be seen side by side —
 * they are scattered over ten games, and some only show up on a screen that
 * takes a whole round to reach.
 */
function IconSheet() {
  return (
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="mb-3 font-semibold text-gray-700">Icons</h2>
      <div className="flex flex-wrap gap-2">
        {ICON_NAMES.map((name) => (
          <div
            key={name}
            className="flex w-28 flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white py-2 text-gray-700"
          >
            <div className="flex items-end gap-2">
              <Icon name={name} className="text-4xl" />
              <Icon name={name} className="text-2xl" />
              <Icon name={name} className="text-base" />
            </div>
            <span className="font-mono text-[11px] text-gray-500">{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
