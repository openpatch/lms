import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { GameDefinition } from "../lib/game-registry";

const STATUS_STYLES: Record<string, string> = {
  live: "bg-green-100 text-green-700",
  "coming-soon": "bg-gray-100 text-gray-500",
};

export default function GameCard({ game }: { game: GameDefinition }) {
  const { t } = useTranslation();
  const isLive = game.status === "live";

  return (
    <Link
      to={`/arena/${game.id}`}
      className="block rounded-xl bg-white border border-gray-200 p-6 hover:border-brand-300 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-4xl">{game.icon}</span>
        <span
          className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${STATUS_STYLES[game.status]}`}
        >
          {isLive ? t("arena.live") : t("arena.soon")}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{t(game.titleKey)}</h3>
      <p className="text-sm text-gray-500 mb-3">{t(game.descriptionKey)}</p>
      <div className="flex items-center gap-2 text-xs text-gray-400 uppercase font-medium">
        <span>{t(`arena.${game.category}`)}</span>
        {game.grades.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 normal-case">
            {t("arena.grades", { grades: game.grades.join(", ") })}
          </span>
        )}
      </div>
    </Link>
  );
}
