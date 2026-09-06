import { useState } from "react";
import { useTranslation } from "react-i18next";
import GameCard from "../components/GameCard";
import { getAllGames } from "../lib/game-registry";
import type { GameCategory } from "../../shared/types";

type Filter = "all" | GameCategory;

export default function Arena() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const games = getAllGames();

  const filtered = filter === "all" ? games : games.filter((g) => g.category === filter);

  const filterButtons: { key: Filter; label: string }[] = [
    { key: "all", label: t("arena.all") },
    { key: "math", label: t("arena.math") },
    { key: "cs", label: t("arena.cs") },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{t("arena.title")}</h1>
      <div className="flex gap-2 mb-8">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === btn.key
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
