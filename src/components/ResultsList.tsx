import { useTranslation } from "react-i18next";
import type { GameResult } from "../../shared/types";

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_STYLES = [
  "border-yellow-300 bg-gradient-to-r from-yellow-50 to-white animate-medal-glow",
  "border-gray-300 bg-gradient-to-r from-gray-50 to-white",
  "border-orange-200 bg-gradient-to-r from-orange-50 to-white",
  "border-gray-200 bg-white",
];

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  const colors = ["#007864", "#b5e3d8", "#004c45", "#fbbf24", "#4aa594", "#7fc7ba"];
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {pieces.map((i) => {
        const left = (i * 2.5 + (i % 3) * 5) % 100;
        const delay = (i * 0.08) % 2;
        const duration = 2.5 + (i % 3) * 0.5;
        const color = colors[i % colors.length];
        const size = 6 + (i % 4) * 3;
        return (
          <div
            key={i}
            className="absolute top-0 animate-confetti"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              borderRadius: i % 2 === 0 ? "50%" : "2px",
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function ResultsList({
  results,
  title,
}: {
  results: GameResult[];
  title?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-4">
      {results.length > 0 && results[0] && results[0].score > 0 && <Confetti />}
      {title && (
        <h2 className="text-2xl font-bold animate-celebrate">
          {results.length > 0 && results[0] ? `${MEDALS[0]} ` : ""}{title}
        </h2>
      )}
      <div className="w-full max-w-md space-y-2">
        {results.length === 0 ? (
          <p className="text-gray-400 text-center py-4">{t("lobby.waiting")}</p>
        ) : (
          results.map((r, i) => (
            <div
              key={r.playerId}
              className={`flex items-center justify-between rounded-lg p-3 shadow border-2 ${RANK_STYLES[i] ?? RANK_STYLES[3]}`}
              style={{ animation: `fade-in 0.4s ease-out ${i * 0.1}s both` }}
            >
              <span className="font-medium flex items-center gap-2">
                {i < 3 ? (
                  <span className="text-2xl">{MEDALS[i]}</span>
                ) : (
                  <span className="text-lg font-bold text-gray-400 w-8 text-center">{i + 1}</span>
                )}
                {r.playerName}
              </span>
              <span className="text-brand-600 font-bold text-lg tabular-nums">{r.score}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
