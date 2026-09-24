import { useTranslation } from "react-i18next";
import { scoreOf, type FlowExtra } from "../../../../shared/bitflow-progress";
import type { StageRoundData } from "../../../../shared/framework";
import type { Player } from "../../../../shared/types";
import type { StageProps } from "../../../lib/game-registry";

/**
 * The class, as the teacher sees it: a row per player with where they are in
 * the flow and, once something has been marked, how it is going.
 *
 * Laid out by name, not ranked. It is on the teacher's screen, which may well
 * be on the projector, and a flow is not a race — the order of the rows says
 * nothing about who is ahead.
 */
export function ClassBoard({ data, players }: { data: StageRoundData; players: Player[] }) {
  const { t } = useTranslation();
  const progress = (data.extra as unknown as FlowExtra).progress ?? {};
  const rows = players
    .filter((player) => !player.isHost)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (rows.length === 0) {
    return <p className="text-gray-400 text-center py-4">{t("lobby.waiting")}</p>;
  }

  return (
    <table className="w-full max-w-2xl text-left">
      <caption className="sr-only">{t("games.bitflow.boardCaption")}</caption>
      <thead>
        <tr className="text-xs uppercase text-gray-500">
          <th scope="col" className="py-2 font-semibold">{t("games.bitflow.name")}</th>
          <th scope="col" className="py-2 font-semibold">{t("games.bitflow.progress")}</th>
          <th scope="col" className="py-2 font-semibold text-right">{t("games.bitflow.score")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((player) => {
          const entry = progress[player.id];
          const score = scoreOf(entry);
          const ratio = entry && entry.total > 0 ? entry.visited / entry.total : 0;
          const status = !entry
            ? t("games.bitflow.notStarted")
            : entry.status === "completed"
              ? t("games.bitflow.completed")
              : t("games.bitflow.step", { visited: entry.visited, total: entry.total || "?" });
          return (
            <tr key={player.id} className="border-t border-gray-200">
              <th scope="row" className="py-2 pr-3 font-medium text-gray-700">
                {player.name}
                {!player.connected && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{t("games.bitflow.away")}</span>
                )}
              </th>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-24 overflow-hidden rounded-full bg-game-100 sm:w-40"
                    role="progressbar"
                    aria-label={t("games.bitflow.progressOf", { name: player.name })}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(ratio * 100)}
                  >
                    <div
                      className="h-full bg-game-solid transition-all duration-300"
                      style={{ width: `${entry?.status === "completed" ? 100 : ratio * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500">{status}</span>
                </div>
              </td>
              <td className="py-2 text-right tabular-nums text-gray-700">
                {score ? `${score.earned} / ${score.possible}` : "–"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** The board while the flow is running, on the host's screen. */
export function HostBoard({ data, players = [] }: StageProps) {
  return <ClassBoard data={data} players={players} />;
}

/** What the round came to on a player's own device: their score, if any. */
export function OwnSummary({ data, playerId }: StageProps) {
  const { t } = useTranslation();
  const entry = (data.extra as unknown as FlowExtra).progress?.[playerId];
  const score = scoreOf(entry);
  return (
    <p className="text-center text-gray-600">
      {score
        ? t("games.bitflow.ownScore", { earned: score.earned, possible: score.possible })
        : entry?.status === "completed"
          ? t("games.bitflow.completed")
          : t("games.bitflow.notFinished")}
    </p>
  );
}
