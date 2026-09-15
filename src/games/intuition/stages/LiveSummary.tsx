import { useTranslation } from "react-i18next";
import type { StageProps } from "../../../lib/game-registry";
import { liveAverageMs, liveTally } from "../../../../shared/framework";

/**
 * What a live round came to.
 *
 * There is no list of questions to walk back through — the round was a minute
 * of tapping — so the review is the tally: what you hit, what got away, the
 * longest run and how quick you were on average.
 */
export default function LiveSummary({ data, playerId }: StageProps) {
  const { t } = useTranslation();
  const tally = liveTally(data, playerId);
  const average = liveAverageMs(tally);

  const rows: { label: string; value: string; tone: string }[] = [
    { label: t("games.intuition.summary.hits"), value: String(tally.hits), tone: "text-emerald-600" },
    { label: t("games.intuition.summary.misses"), value: String(tally.misses), tone: "text-gray-400" },
    {
      label: t("games.intuition.summary.streak"),
      value: String(tally.bestStreak),
      tone: "text-game-ink",
    },
    ...(average != null
      ? [
          {
            label: t("games.intuition.summary.average"),
            value: `${average} ms`,
            tone: "text-game-ink",
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-center"
        >
          <div className={`text-2xl font-bold tabular-nums ${row.tone}`}>{row.value}</div>
          <div className="text-xs text-gray-500">{row.label}</div>
        </div>
      ))}
    </div>
  );
}
