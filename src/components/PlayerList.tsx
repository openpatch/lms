import { useTranslation } from "react-i18next";
import type { Player } from "../../shared/types";

export default function PlayerList({
  players,
  onKick,
}: {
  players: Player[];
  onKick?: (playerId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {players.length === 0 ? (
        <p className="text-gray-400 text-center py-8">{t("lobby.waiting")}</p>
      ) : (
        players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${player.connected ? "bg-green-400" : "bg-gray-300"}`}
              />
              <span className="font-medium text-gray-700">{player.name}</span>
              {player.isHost && (
                <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                  Host
                </span>
              )}
            </div>
            {onKick && !player.isHost && (
              <button
                onClick={() => onKick(player.id)}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                {t("lobby.kick")}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
