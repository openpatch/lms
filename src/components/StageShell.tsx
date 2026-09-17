import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ActionBarContext } from "./action-bar";
import Calculator from "./Calculator";
import Icon from "./icons";
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
import { serverTime } from "../lib/server-time";



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
      const elapsed = (serverTime() - startTime) / 1000;
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
      <Icon name="flame" className="text-lg text-orange-500" />
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

/**
 * Holds the question that was just answered on screen for a moment.
 *
 * The trigger is the answer coming back from the server rather than the press
 * that sent it: until the round carries the answer there is nothing to show on
 * the question, and once it does the stage would otherwise have moved on to the
 * next one. So the shell keeps serving the answered question — `revealed` — and
 * lets go after `revealMs`.
 *
 * Nothing about the round pauses with it. The clock runs, the answer is already
 * scored, and a player who is happy to wait loses nothing but the seconds they
 * chose to spend looking.
 */
function useReveal(data: StageRoundData | null, playerId: string, revealMs: number) {
  const answered = data ? answeredCount(data, playerId) : 0;
  const [held, setHeld] = useState<number | null>(null);

  useEffect(() => {
    if (!revealMs) return;
    // A round this player has not answered anything in yet has nothing to hold.
    // Saying so rather than returning matters for the round *after* one that
    // ended mid-reveal: the shell is remounted between rounds today, and this
    // is what keeps that from being load-bearing.
    if (answered === 0) {
      setHeld(null);
      return;
    }
    const answers = data?.answers[playerId] ?? {};
    // The one that landed last, by the round's own clock rather than by id.
    const latest = Object.entries(answers).sort((a, b) => a[1].timeMs - b[1].timeMs).pop();
    if (!latest) return;
    setHeld(Number(latest[0]));
    const timer = setTimeout(() => setHeld(null), revealMs);
    return () => clearTimeout(timer);
  }, [answered]); // eslint-disable-line react-hooks/exhaustive-deps

  return revealMs ? held : null;
}

/** Default spectator view: one row per player with progress and live score. */
/** Height of one row and the gap under it, in pixels. */
const ROW_STRIDE = 60;

/**
 * Who is where, while the round is being played.
 *
 * Ranked by **this round** and nothing else. The running total is deliberately
 * not here: a player who is out of the running overall can still win the round
 * they are in, and seeing that they are second in it right now is the thing
 * that keeps them playing. The totals come back the moment the round ends,
 * which is when they mean something again.
 *
 * The rows are placed rather than stacked, so a change in the order slides
 * instead of jumping. On a projector that is the difference between a
 * scoreboard and a list of names: you see the overtake happen rather than
 * noticing afterwards that it has.
 */
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
  const questions = data.questions.length;

  const rows = players
    .filter((p) => !p.isHost)
    .map((player) => ({
      player,
      round: scoreOf(player.id),
      answered: answeredCount(data, player.id),
    }))
    // Level pegging early on, so the name keeps the order from shuffling about
    // while everyone is still on nothing.
    .sort((a, b) => b.round - a.round || a.player.name.localeCompare(b.player.name));

  if (rows.length === 0) {
    return <p className="text-gray-400 text-center py-4">{t("lobby.waiting")}</p>;
  }

  return (
    <div className="relative w-full max-w-md" style={{ height: rows.length * ROW_STRIDE }}>
      {rows.map((row, rank) => (
        <div
          key={row.player.id}
          className="absolute inset-x-0 top-0 flex h-13 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 transition-transform duration-500 ease-out"
          style={{ transform: `translateY(${rank * ROW_STRIDE}px)` }}
        >
          <span className="w-5 shrink-0 text-sm font-bold text-gray-400 tabular-nums">
            {rank + 1}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium text-gray-700">
            {row.player.name}
          </span>
          {questions > 0 && (
            <>
              <div className="h-2 w-20 overflow-hidden rounded-full bg-game-100 sm:w-28">
                <div
                  className="h-full bg-game-solid transition-all duration-300"
                  style={{ width: `${(row.answered / questions) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-sm text-gray-500 tabular-nums">
                {row.answered}/{questions}
              </span>
            </>
          )}
          <span className="min-w-10 shrink-0 text-right text-sm font-bold text-game-ink tabular-nums">
            {row.round}
          </span>
        </div>
      ))}
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
  /** Put in the bottom bar for the host. The stage's own action goes there for
   *  a player, and the host never has one — the two never collide. */
  hostAction?: React.ReactNode;
  /**
   * Put in the bottom bar beside whatever is already in it. For the demo,
   * where one person holds both seats and so needs the host's way out of a
   * round next to the player's way through it.
   */
  sideAction?: React.ReactNode;
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
  hostAction,
  sideAction,
}: StageShellProps) {
  const { t } = useTranslation();
  const data = gameData as StageRoundData | null;
  const timeLeft = useTimer(data?.startTime ?? 0, data?.duration ?? 0, !!data && !data.finished);
  const feedback = useAnswerFeedback(data, playerId);
  const revealing = useReveal(data, playerId, getStage(game, data?.stageId ?? "")?.revealMs ?? 0);
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
  const held = data.questions.find((q) => q.id === revealing) ?? null;
  // While a question is being revealed it is the one the stage is on; otherwise
  // the stage is on the first question this player has not answered.
  const question = held ?? data.questions.find((q) => !myAnswers[q.id]) ?? null;
  const answered = answeredCount(data, playerId);
  // Most stages score by answer points; a stage may compute its own (e.g. taps).
  const scoreOf = (id: string) => stage.scorePlayer?.(data, id) ?? playerRoundScore(data, id);
  const score = scoreOf(playerId);
  const streak = currentStreak(data, playerId);

  const stageProps: StageProps = {
    data,
    question,
    answeredCount: answered,
    revealed: held != null,
    submit: (answer: string) => {
      // The question on screen during a reveal has already been answered.
      if (!question || held) return;
      sendMessage({ action: "answer", questionId: question.id, answer });
    },
    sendAction: sendMessage,
    settings: data.settings,
    isHost,
    playerId,
  };

  const questionNumber = question
    ? data.questions.findIndex((q) => q.id === question.id) + 1
    : data.questions.length;

  const StageComponent = stage.Component;
  const HostView = stage.HostView;
  const showsQuestion = question != null || stage.questionless;

  return (
    <div className="flex flex-col items-center gap-6 pt-14 pb-20">
      <FeedbackFlash feedback={feedback} />

      {/* Round, score and clock ride along under the app header … */}
      <div className="fixed top-16 inset-x-0 z-20 h-12 bg-game-50/95 backdrop-blur border-b-2 border-game-200">
        <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 text-sm font-semibold uppercase text-game-ink truncate">
            {t("game.round", { current: data.currentRound, total: data.totalRounds })}
            {" · "}
            {t(stage.nameKey)}
            {!isHost && showsQuestion && data.questions.length > 0 && (
              <span className="hidden sm:inline font-normal normal-case text-game-ink/60">
                {" · "}
                {t("game.progress", {
                  // Which question is actually on screen — during a reveal that
                  // is the one just answered, not the one after it.
                  current: questionNumber,
                  total: data.questions.length,
                })}
              </span>
            )}
          </div>
          {!isHost && (
            <div className="shrink-0 flex items-center gap-2 sm:gap-4">
              <StreakBadge streak={streak} />
              <div className="text-lg font-bold text-gray-700 tabular-nums whitespace-nowrap">
                {score} <span className="text-sm font-normal text-gray-400">{t("game.pts")}</span>
              </div>
            </div>
          )}
          {/* Never let the clock wrap: on a phone it is the one thing that must
              stay readable, so it shrinks instead. */}
          <div
            className={`shrink-0 text-lg sm:text-2xl font-semibold tabular-nums whitespace-nowrap ${
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
          {/* Before the stage, so the keypad sits left of the stage's own
              button rather than after it in the bar. */}
          {stage.calculator && <Calculator />}
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
        // A stage with a math field raises --virtual-keyboard-height while the
        // virtual keyboard is up, so the bar stays above it instead of under it.
        style={{ bottom: "var(--virtual-keyboard-height, 0px)" }}
        className="fixed inset-x-0 z-20 empty:hidden bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-wrap items-center justify-center gap-3"
      >
        {isHost ? hostAction : null}
        {sideAction}
      </div>
    </div>
  );
}
