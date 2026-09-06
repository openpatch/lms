import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link } from "react-router";
import { getGame } from "../lib/game-registry";
import { generateLobbyCode } from "../lib/utils";

export default function GameLanding() {
  const { t } = useTranslation();
  const { gameId } = useParams();
  const navigate = useNavigate();
  const game = gameId ? getGame(gameId) : undefined;

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

  const handleCreateLobby = () => {
    const code = generateLobbyCode();
    navigate(`/arena/${game.id}/host/${code}`);
  };

  const isLive = game.status === "live";

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/arena" className="text-sm text-gray-500 hover:text-brand-600 mb-4 inline-block">
        {t("common.back")}
      </Link>
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-5xl">{game.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t(game.titleKey)}</h1>
            <span className="text-sm uppercase font-medium text-gray-400">
              {t(`arena.${game.category}`)}
            </span>
          </div>
        </div>
        <p className="text-gray-600 mb-6">{t(game.descriptionKey)}</p>
        <div className="flex gap-6 text-sm text-gray-500 mb-8">
          <span>{t("game.minPlayers", { count: game.minPlayers })}</span>
          <span>{t("game.maxPlayers", { count: game.maxPlayers })}</span>
        </div>
        <button
          onClick={handleCreateLobby}
          disabled={!isLive}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            isLive
              ? "bg-brand-500 text-white hover:bg-brand-600"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isLive ? t("game.createLobby") : t("arena.soon")}
        </button>
      </div>
    </div>
  );
}
