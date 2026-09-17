import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "../components/icons";
import { Link } from "react-router";
import { serverUrl } from "../lib/connection";
import { getGame } from "../lib/game-registry";

interface SessionSummary {
  /** One game. A lobby played twice is two of these. */
  sessionId: string;
  /** The lobby it was played in; sessions of the same lobby share it. */
  code: string;
  gameId: string;
  /** Which game of that lobby this was, counting from 1. */
  run: number;
  finishedAt: number;
  rounds: number;
}

/** A date a teacher can place a lesson by, rather than a timestamp. */
function When({ at }: { at: number }) {
  const { i18n } = useTranslation();
  const date = new Date(at);
  return (
    <span className="tabular-nums">
      {date.toLocaleDateString(i18n.language, {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}
      {", "}
      {date.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

/**
 * Every lesson this teacher has played, newest first.
 *
 * The rounds outlive the lobby on purpose. A lobby is gone two hours after it
 * opened and often sooner, but what the class answered is the one thing worth
 * carrying into the next lesson, so it is written as each round ends and read
 * back from here.
 */
export default function Review() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(serverUrl("/parties/sessions"));
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { sessions: SessionSummary[] };
        if (!cancelled) setSessions(body.sessions);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className="py-12 text-center text-gray-500">{t("game.serverUnreachable")}</div>
    );
  }

  if (!sessions) {
    return <div className="py-12 text-center text-gray-500">{t("common.loading")}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-800">{t("review.title")}</h1>
      <p className="mb-6 text-gray-500">{t("review.subtitle")}</p>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 px-6 py-12 text-center">
          <p className="mb-4 text-gray-500">{t("review.empty")}</p>
          <Link to="/arena" className="font-semibold text-brand-600 hover:underline">
            {t("common.enterArena")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => {
            const game = getGame(session.gameId);
            return (
              <li key={session.sessionId}>
                <Link
                  to={`/review/${session.sessionId}`}
                  className="flex items-center gap-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-colors hover:border-brand-400"
                >
                  <Icon name={game?.icon ?? "?"} className="text-2xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-gray-800">
                      {game ? t(game.titleKey) : session.gameId}
                    </span>
                    <span className="block text-sm text-gray-500">
                      <When at={session.finishedAt} />
                      {/* Several games can come out of one lobby — the teacher
                          pressed "nochmal" — so say which of them this is,
                          otherwise two rows differ only by their timestamp. */}
                      {session.run > 1 && (
                        <> · {t("review.run", { count: session.run })}</>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-gray-500">
                    {t("review.roundCount", { count: session.rounds })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
