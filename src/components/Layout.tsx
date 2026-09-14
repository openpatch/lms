import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import type { GameMeta } from "../../shared/types";
import { ActiveGameContext, gameThemeVars } from "../lib/game-theme";
import { signOut, useSession } from "../lib/auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { data: session } = useSession();
  // The game the current page is about, announced with useActiveGame. Its colour
  // paints the whole shell, so host and players can see at a glance that they
  // are looking at the same game.
  const [game, setGame] = useState<GameMeta | null>(null);
  // While a round is running the stage brings its own bars; the page must not
  // scroll away from them, and nothing should invite a player to leave.
  const playing = location.pathname.startsWith("/play/");

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "de" ? "en" : "de");
  };

  // Stable, so the effect in useActiveGame does not re-run on every render.
  const announce = useCallback((next: GameMeta | null) => setGame(next), []);

  return (
    <ActiveGameContext.Provider value={announce}>
      <div
        className="min-h-screen flex flex-col bg-gray-50"
        style={gameThemeVars(game?.color)}
      >
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          {/* The game's colour, full width: the loudest "we are in this game" cue. */}
          <div className={`h-1.5 bg-game-solid ${game ? "" : "opacity-0"}`} />
          {/* 6px strip + 58px bar = the 4rem StageShell pins its round bar under. */}
          <div className="max-w-6xl mx-auto h-[3.625rem] px-4 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src="/logo.svg" alt="" className="w-8 h-8" />
              <span className="hidden sm:inline text-xl font-bold text-brand-600">
                {t("common.appName")}
              </span>
            </Link>
            {game && (
              <div className="animate-game-chip-in min-w-0 flex items-center gap-2 rounded-full bg-game-50 border border-game-200 px-3 py-1.5">
                <span className="text-xl leading-none">{game.icon}</span>
                <span className="truncate text-sm font-bold text-game-ink">
                  {t(game.titleKey)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={toggleLang}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {i18n.language === "de" ? "EN" : "DE"}
              </button>
              {location.pathname !== "/arena" && !playing && (
                <Link
                  to="/arena"
                  className="hidden sm:inline text-sm text-gray-600 hover:text-game-ink transition-colors"
                >
                  {t("common.enterArena")}
                </Link>
              )}
              {!playing && (
                <Link
                  to="/join"
                  className="text-sm text-gray-600 hover:text-game-ink transition-colors"
                >
                  {t("common.join")}
                </Link>
              )}
              {!playing &&
                (session ? (
                  <button
                    onClick={() => void signOut()}
                    title={session.user.email}
                    className="text-sm text-gray-600 hover:text-game-ink transition-colors"
                  >
                    {t("auth.signOut")}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="text-sm text-gray-600 hover:text-game-ink transition-colors"
                  >
                    {t("auth.signIn")}
                  </Link>
                ))}
            </div>
          </div>
        </header>
        <main className={`flex-1 max-w-6xl mx-auto w-full px-4 ${playing ? "py-4" : "py-8"}`}>
          {children}
        </main>
        <footer className={`bg-white border-t border-gray-200 ${playing ? "hidden" : ""}`}>
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center gap-2 text-sm text-gray-400">
            <div>
              {t("common.appName")} — {t("common.tagline")}
            </div>
            <div className="flex items-center gap-2">
              <span>
                {t("common.builtBy")} <span className="text-red-500">&#10084;</span> {t("common.byOpenPatch")}
              </span>
              <span className="text-gray-300">&bull;</span>
              <a
                href="https://github.com/openpatch/lms"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-600 transition-colors"
              >
                {t("common.github")}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </ActiveGameContext.Provider>
  );
}
