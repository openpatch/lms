import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { LobbyState } from "../../shared/types";
import type { StageRoundData } from "../../shared/framework";
import {
  answeredCount,
  comboMultiplier,
  currentStreak,
  playerRoundScore,
} from "../../shared/framework";
import { getStage, type GameDefinition, type StageProps } from "../lib/game-registry";

/** Where a stage's primary button goes: the bar pinned to the bottom edge. */
const ActionBarContext = createContext<HTMLElement | null>(null);

/**
 * Puts the stage's main action — usually "submit" — into the bar at the bottom
 * of the screen, so it stays reachable however far the stage scrolls.
 * Outside a stage (in a rules preview, say) it just renders where it stands.
 */
export function StageActionBar({ children }: { children: React.ReactNode }) {
  const target = useContext(ActionBarContext);
  if (!target) return <>{children}</>;
  return createPortal(<div className="flex items-center gap-3">{children}</div>, target);
}

/** Seconds left in the round, recomputed while the round is running. */
function useTimer(startTime: number, duration: number, active: boolean) {
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!active) return;
    const update = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setTimeLeft(Math.max(0, Math.ceil(duration - elapsed)));
    };
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [startTime, duration, active]);
  return timeLeft;
}

/** Green/red flash after an answer lands. */
function FeedbackFlash({ feedback }: { feedback: "correct" | "wrong" | null }) {
  if (!feedback) return null;
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-50 animate-feedback-flash ${
        feedback === "correct" ? "bg-green-400/20" : "bg-red-400/20"
      }`}
    />
  );
}

function StreakBadge({ streak }: { streak: number }) {
  const { t } = useTranslation();
  if (streak < 2) return null;
  const bonusPercent = Math.round((comboMultiplier(streak) - 1) * 100);
  return (
    <div className="animate-streak-pop flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
      <span className="text-lg">🔥</span>
      {streak} {t("game.streak")}
      {bonusPercent > 0 && (
        <span className="text-xs ml-1">
          (+{bonusPercent}% {t("game.bonus")})
        </span>
      )}
    </div>
  );
}

/** Flashes feedback whenever a new answer of this player shows up. */
function useAnswerFeedback(data: StageRoundData | null, playerId: string) {
  const answered = data ? answeredCount(data, playerId) : 0;
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (answered === 0) return;
    const answers = data?.answers[playerId] ?? {};
    const ids = Object.keys(answers)
      .map(Number)
      .sort((a, b) => a - b);
    const last = answers[ids[ids.length - 1]];
    if (!last) return;
    setFeedback(last.correct ? "correct" : "wrong");
    const timer = setTimeout(() => setFeedback(null), 600);
    return () => clearTimeout(timer);
  }, [answered]); // eslint-disable-line react-hooks/exhaustive-deps

  return feedback;
}

/** Default spectator view: one row per player with progress and live score. */
function ProgressList({
  data,
  players,
  scoreOf,
}: {
  data: StageRoundData;
  players: LobbyState["players"];
  scoreOf: (playerId: string) => number;
}) {
  const { t } = useTranslation();
  const guests = players.filter((p) => !p.isHost);

  if (guests.length === 0) {
    return <p className="text-gray-400 text-center py-4">{t("lobby.waiting")}</p>;
  }

  return (
    <div className="w-full max-w-md space-y-2">
      {guests.map((player) => {
        const answered = answeredCount(data, player.id);
        const total = data.questions.length;
        const percent = total > 0 ? (answered / total) * 100 : 0;
        const score = scoreOf(player.id);
        return (
          <div
            key={player.id}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3"
          >
            <span className="font-medium text-gray-700 flex-1">{player.name}</span>
            {total > 0 && (
              <>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 tabular-nums">
                  {answered}/{total}
                </span>
              </>
            )}
            <span className="text-sm font-bold text-brand-600 tabular-nums min-w-12 text-right">
              {score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface StageShellProps {
  game: GameDefinition;
  state: LobbyState;
  gameData: unknown;
  isHost: boolean;
  playerId: string;
  sendMessage: (payload: unknown) => void;
}

/**
 * Frame around the active stage: round header, timer, live score, host view,
 * answer feedback and progress. Stage components only render their question.
 */
export default function StageShell({
  game,
  state,
  gameData,
  isHost,
  playerId,
  sendMessage,
}: StageShellProps) {
  const { t } = useTranslation();
  const data = gameData as StageRoundData | null;
  const timeLeft = useTimer(data?.startTime ?? 0, data?.duration ?? 0, !!data && !data.finished);
  const feedback = useAnswerFeedback(data, playerId);
  // The bar at the bottom is a portal target, so it has to be an element first
  const [actionBar, setActionBar] = useState<HTMLDivElement | null>(null);

  if (!data) {
    return <div className="text-center text-gray-500">{t("common.loading")}</div>;
  }

  const stage = getStage(game, data.stageId);
  if (!stage) {
    return <div className="text-center text-gray-500">{t("common.error")}</div>;
  }

  const myAnswers = data.answers[playerId] ?? {};
  const question = data.questions.find((q) => !myAnswers[q.id]) ?? null;
  const answered = answeredCount(data, playerId);
  // Most stages score by answer points; a stage may compute its own (e.g. taps).
  const scoreOf = (id: string) => stage.scorePlayer?.(data, id) ?? playerRoundScore(data, id);
  const score = scoreOf(playerId);
  const streak = currentStreak(data, playerId);

  const stageProps: StageProps = {
    data,
    question,
    answeredCount: answered,
    submit: (answer: string) => {
      if (!question) return;
      sendMessage({ action: "answer", questionId: question.id, answer });
    },
    sendAction: sendMessage,
    settings: data.settings,
    isHost,
    playerId,
  };

  const StageComponent = stage.Component;
  const HostView = stage.HostView;
  const showsQuestion = question != null || stage.questionless;

  return (
    <div className="flex flex-col items-center gap-6 pt-14 pb-20">
      <FeedbackFlash feedback={feedback} />

      {/* Round, score and clock ride along under the app header … */}
      <div className="fixed top-16 inset-x-0 z-20 h-12 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-4">
          <div className="min-w-0 text-sm font-semibold uppercase text-brand-500 truncate">
            {t("game.round", { current: data.currentRound, total: data.totalRounds })}
            {" · "}
            {t(stage.nameKey)}
            {!isHost && showsQuestion && data.questions.length > 0 && (
              <span className="hidden sm:inline font-normal normal-case text-gray-400">
                {" · "}
                {t("game.progress", { current: answered + 1, total: data.questions.length })}
              </span>
            )}
          </div>
          {!isHost && (
            <div className="flex items-center gap-4">
              <StreakBadge streak={streak} />
              <div className="text-lg font-bold text-gray-700 tabular-nums">
                {score} <span className="text-sm font-normal text-gray-400">{t("game.pts")}</span>
              </div>
            </div>
          )}
          <div
            className={`text-2xl font-semibold tabular-nums ${
              timeLeft <= 10 && timeLeft > 0 ? "text-red-500 animate-timer-pulse" : "text-gray-600"
            }`}
          >
            {t("game.timeLeft", { seconds: timeLeft })}
          </div>
        </div>
      </div>

      {isHost ? (
        HostView ? (
          <HostView {...stageProps} />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-500">{t("game.hostView")}</p>
            <ProgressList data={data} players={state.players} scoreOf={scoreOf} />
          </div>
        )
      ) : showsQuestion ? (
        <ActionBarContext.Provider value={actionBar}>
          <StageComponent {...stageProps} />
        </ActionBarContext.Provider>
      ) : (
        <div className="text-center text-gray-500 py-8 animate-fade-in">
          {t("game.allAnswered")}
        </div>
      )}

      {/* … and the stage's action stays pinned to the bottom edge. The bar only
          shows once a stage has put something in it. */}
      <div
        ref={setActionBar}
        className="fixed bottom-0 inset-x-0 z-20 empty:hidden bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-center"
      />
    </div>
  );
}
