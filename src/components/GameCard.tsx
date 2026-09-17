import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { gameThemeVars } from "../lib/game-theme";
import type { GameDefinition } from "../lib/game-registry";
import Icon from "./icons";

export default function GameCard({ game }: { game: GameDefinition }) {
  const { t } = useTranslation();
  const isLive = game.status === "live";

  return (
    <Link
      to={`/arena/${game.id}`}
      style={gameThemeVars(game.color)}
      className="group block overflow-hidden rounded-2xl bg-white border-2 border-game-200 shadow-sm hover:border-game-solid hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
    >
      {/* The colour band carries the game's identity before a word is read. */}
      <div className="relative bg-linear-to-br from-game-100 to-game-50 px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid place-items-center w-16 h-16 rounded-2xl bg-white/80 shadow-sm text-4xl group-hover:animate-icon-wobble">
            <Icon name={game.icon} />
          </span>
          <span
            className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
              isLive ? "bg-game-solid text-white" : "bg-white/70 text-gray-500"
            }`}
          >
            {isLive ? t("arena.live") : t("arena.soon")}
          </span>
        </div>
        <h3 className="mt-4 text-lg font-bold text-game-ink">{t(game.titleKey)}</h3>
      </div>
      <div className="px-6 pt-4 pb-5">
        <p className="text-sm text-gray-500 mb-4">{t(game.descriptionKey)}</p>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
          <span>{t(`arena.${game.category}`)}</span>
          {game.grades.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-game-100 text-game-ink normal-case">
              {t("arena.grades", { grades: game.grades.join(", ") })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
