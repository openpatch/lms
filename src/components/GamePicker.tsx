import { useTranslation } from "react-i18next";
import { getAllGames } from "../lib/game-registry";
import { gameThemeVars } from "../lib/game-theme";
import Icon from "./icons";

/**
 * Every game a lobby can switch to, each in its own colour.
 *
 * A lobby outlives a game, and the class sitting in it is the expensive part
 * of a lesson to assemble: thirty people typing a code. So the next game is
 * picked here, in the same room, rather than by opening another one and
 * reading out a new code.
 */
export default function GamePicker({
  current,
  onPick,
}: {
  /** The game the lobby is on now, marked rather than left out. */
  current: string;
  onPick: (gameId: string) => void;
}) {
  const { t } = useTranslation();
  const games = getAllGames().filter((game) => !game.hidden && game.status === "live");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {games.map((game) => {
        const isCurrent = game.id === current;
        return (
          <button
            key={game.id}
            type="button"
            onClick={() => onPick(game.id)}
            style={gameThemeVars(game.color)}
            aria-current={isCurrent || undefined}
            className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors bg-linear-to-br from-game-100 to-game-50 hover:border-game-solid ${
              isCurrent ? "border-game-solid" : "border-game-200"
            }`}
          >
            <span className="grid place-items-center w-10 h-10 shrink-0 rounded-lg bg-white/80 text-2xl">
              <Icon name={game.icon} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-game-ink truncate">
                {t(game.titleKey)}
              </span>
              {isCurrent && (
                <span className="block text-xs text-game-ink/70">{t("lobby.currentGame")}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
