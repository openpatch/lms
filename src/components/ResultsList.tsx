import { useTranslation } from "react-i18next";
import type { ResultRow } from "./results";

const MEDALS = ["🥇", "🥈", "🥉"];
const CROWN = "👑";

/**
 * Rounds won, kept apart from the points on purpose.
 *
 * The medal beside a name is this session's standing; the crown is what the
 * player took on the way. They are different honours and someone who is fourth
 * overall may well have two crowns — which is the whole reason for having
 * them, so they are not allowed to look like the same thing.
 */
function Crowns({ count, fresh }: { count: number; fresh: boolean }) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  return (
    <span
      title={t("game.crownsWon", { count })}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-700 ${
        fresh ? "animate-streak-pop ring-2 ring-amber-300" : ""
      }`}
    >
      <span aria-hidden>{CROWN}</span>
      {count > 1 && <span className="tabular-nums">{count}</span>}
      <span className="sr-only">{t("game.crownsWon", { count })}</span>
    </span>
  );
}
const RANK_STYLES = [
  "border-yellow-300 bg-gradient-to-r from-yellow-50 to-white animate-medal-glow",
  "border-gray-300 bg-gradient-to-r from-gray-50 to-white",
  "border-orange-200 bg-gradient-to-r from-orange-50 to-white",
  "border-gray-200 bg-white",
];

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  // The active game's own shades, so even the confetti says which game this was.
  const colors = [
    "var(--game-500)",
    "var(--game-300)",
    "var(--game-700)",
    "var(--game-200)",
    "var(--game-solid)",
    "#fbbf24",
  ];
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

/**
 * Who took the most rounds, when that is not the person who took the session.
 *
 * Said out loud at the end, because it is the whole point of counting them: a
 * game where one player is simply better than everyone else still has a second
 * thing that somebody else won. Silent when the winner also collected the most
 * crowns — there is nothing to add there — and silent on a tie, which would
 * need a sentence rather than a line.
 */
function MostRounds({ results }: { results: ResultRow[] }) {
  const { t } = useTranslation();
  const most = Math.max(0, ...results.map((r) => r.crowns ?? 0));
  if (most === 0) return null;
  const holders = results.filter((r) => (r.crowns ?? 0) === most);
  if (holders.length !== 1 || holders[0].playerId === results[0]?.playerId) return null;
  return (
    // The count is on the chip in their row already; saying it again here only
    // makes the line longer.
    <p className="text-sm text-gray-500">
      {CROWN} {t("game.mostRounds", { name: holders[0].playerName })}
    </p>
  );
}

export default function ResultsList({
  results,
  title,
  honourRounds = false,
}: {
  results: ResultRow[];
  title?: string;
  /** Name whoever won the most rounds — for the end of a session, not a round. */
  honourRounds?: boolean;
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
              {/* The name gives way, not the score: a class has a Maximilian in
                  it and the number is what everyone is looking at. */}
              <span className="font-medium flex min-w-0 flex-1 items-center gap-2">
                {i < 3 ? (
                  <span className="shrink-0 text-2xl">{MEDALS[i]}</span>
                ) : (
                  <span className="w-8 shrink-0 text-center text-lg font-bold text-gray-400">
                    {i + 1}
                  </span>
                )}
                <span className="truncate">{r.playerName}</span>
                <Crowns count={r.crowns ?? 0} fresh={r.wonRound === true} />
              </span>
              <span className="flex shrink-0 items-baseline gap-2 pl-2">
                {r.gained != null && (
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      r.gained > 0 ? "text-emerald-600" : "text-gray-400"
                    }`}
                  >
                    {t("game.gained", { points: r.gained })}
                  </span>
                )}
                <span className="text-game-ink font-bold text-lg tabular-nums">{r.score}</span>
              </span>
            </div>
          ))
        )}
      </div>
      {honourRounds && <MostRounds results={results} />}
    </div>
  );
}
