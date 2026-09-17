import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link } from "react-router";
import { getGame } from "../lib/game-registry";
import { useActiveGame } from "../lib/game-theme";
import Icon from "../components/icons";
import { createLobby, lobbyPath } from "../lib/lobby-api";

/** The lobby standing in the way of a new one, as the refusal describes it. */
interface Blocked {
  code: string;
  gameId: string;
  /** How many of the class are in it, the host not counted. */
  players: number;
  /** Whether the attempt that was turned away was a demo, so that saying
   *  "close it and start a new one" starts the same kind again. */
  demo: boolean;
}

export default function GameLanding() {
  const { t } = useTranslation();
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const game = gameId ? getGame(gameId) : undefined;
  useActiveGame(game);

  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{t("common.error")}: Game not found</p>
        <Link to="/arena" className="text-brand-600 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  // The server hands out the code, so two teachers can never land on the same
  // one and a teacher can only have one lobby open at a time.
  //
  // A demo is the same call and the same lobby, minus the class: see Demo.tsx.
  //
  // `replace` is the teacher answering the refusal below: close what is open
  // and start this instead. It is only ever sent from that refusal, never from
  // the ordinary button, so a lobby with a class in it cannot be lost to one
  // stray click — the first click always stops and says what is in the way.
  const handleCreateLobby = async (demo = false, replace = false) => {
    setPending(true);
    setNotice(null);
    if (!replace) setBlocked(null);

    const result = await createLobby({ gameId: game.id, demo, replace });
    setPending(false);

    switch (result.status) {
      case "ok":
        setBlocked(null);
        void navigate(lobbyPath(game.id, result.code, demo));
        return;
      case "blocked":
        setBlocked({ ...result, demo });
        return;
      case "unauthorised":
        void navigate("/login", { state: { next: `/arena/${game.id}` } });
        return;
      case "unreachable":
        setNotice(t("game.serverUnreachable"));
        return;
      default:
        setNotice(t("common.error"));
    }
  };

  const isLive = game.status === "live";

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/arena" className="text-sm text-gray-500 hover:text-game-ink mb-4 inline-block">
        {t("common.back")}
      </Link>
      <div className="overflow-hidden bg-white rounded-2xl border-2 border-game-200">
        <div className="bg-linear-to-br from-game-100 to-game-50 p-8">
          <div className="flex items-center gap-4">
            <span className="grid place-items-center w-20 h-20 rounded-2xl bg-white/80 shadow-sm text-5xl">
              <Icon name={game.icon} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-game-ink">{t(game.titleKey)}</h1>
              <span className="text-sm uppercase font-semibold text-game-ink/70">
                {t(`arena.${game.category}`)}
              </span>
            </div>
          </div>
        </div>
        <div className="p-8">
          <p className="text-gray-600 mb-6">{t(game.descriptionKey)}</p>
          <div className="flex gap-6 text-sm text-gray-500 mb-8">
            <span>{t("game.minPlayers", { count: game.minPlayers })}</span>
            <span>{t("game.maxPlayers", { count: game.maxPlayers })}</span>
          </div>
          <button
            onClick={() => void handleCreateLobby()}
            disabled={!isLive || pending}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${
              isLive && !pending
                ? "bg-game-solid text-white hover:bg-game-solid-hover"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {!isLive ? t("arena.soon") : pending ? t("game.creating") : t("game.createLobby")}
          </button>
          {/* Underneath, and quieter: trying the game out alone is what you do
              while preparing the lesson, not what you do in front of a class. */}
          <button
            onClick={() => void handleCreateLobby(true)}
            disabled={!isLive || pending}
            className="mt-3 w-full rounded-xl border-2 border-game-200 py-3 font-semibold text-game-ink transition-colors hover:border-game-solid disabled:border-gray-200 disabled:text-gray-400"
          >
            {t("demo.tryIt")}
          </button>
          <p className="mt-2 text-center text-sm text-gray-500">{t("demo.tryItHint")}</p>
          {notice && <p className="mt-4 text-sm text-center text-amber-700">{notice}</p>}

          {/* What is in the way, and the two things that can be done about it.
              The count is the whole point of this box: "close it and start a
              new one" is safe to offer only next to the number of people it
              would throw out. */}
          {blocked && (
            <div className="mt-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p>
                {t("game.activeLobbyFor", {
                  game: t(getGame(blocked.gameId)?.titleKey ?? game.titleKey),
                  code: blocked.code,
                })}
              </p>
              <p className="mt-1">
                {blocked.players > 0
                  ? t("game.activeLobbyPlayers", { count: blocked.players })
                  : t("game.activeLobbyEmpty")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={`/arena/${blocked.gameId}/host/${blocked.code}`}
                  className="rounded-lg border-2 border-amber-300 px-3 py-2 font-semibold hover:border-amber-500"
                >
                  {t("game.toLobby")}
                </Link>
                <button
                  onClick={() => void handleCreateLobby(blocked.demo, true)}
                  disabled={pending}
                  className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white transition-colors hover:bg-amber-700 disabled:bg-gray-300"
                >
                  {pending ? t("game.creating") : t("game.replaceLobby")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
