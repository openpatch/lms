import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link } from "react-router";
import { getGame } from "../lib/game-registry";
import { useActiveGame } from "../lib/game-theme";
import { serverUrl } from "../lib/connection";

export default function GameLanding() {
  const { t } = useTranslation();
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [existingCode, setExistingCode] = useState<string | null>(null);
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
  const handleCreateLobby = async (demo = false) => {
    setPending(true);
    setNotice(null);
    setExistingCode(null);
    try {
      const response = await fetch(serverUrl("/parties/lobbies"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId: game.id, demo }),
      });

      if (response.status === 401) {
        void navigate("/login", { state: { next: `/arena/${game.id}` } });
        return;
      }

      const data = (await response.json()) as { code?: string; error?: string };

      if (response.status === 409 && data.code) {
        setNotice(t("game.activeLobby", { code: data.code }));
        setExistingCode(data.code);
        return;
      }
      if (!response.ok || !data.code) {
        setNotice(t("common.error"));
        return;
      }
      navigate(`/arena/${game.id}/${demo ? "demo" : "host"}/${data.code}`);
    } catch {
      setNotice(t("game.serverUnreachable"));
    } finally {
      setPending(false);
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
              {game.icon}
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
          {notice && (
            <div className="mt-4 text-sm text-center text-amber-700">
              <p>{notice}</p>
              {existingCode && (
                <Link
                  to={`/arena/${game.id}/host/${existingCode}`}
                  className="inline-block mt-2 font-semibold underline"
                >
                  {t("game.toLobby")}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
