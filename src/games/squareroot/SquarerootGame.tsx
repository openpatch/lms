import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameProps } from "../../lib/game-registry";
import type { SquarerootGameData } from "../../../shared/types";
import MathTex from "../../components/Math";

function RadicalDisplay({ value, size = "text-5xl" }: { value: number; size?: string }) {
  return <MathTex tex={`\\sqrt{${value}}`} display className={size} />;
}

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

// Compute live score and current streak from answers
function useLiveStats(data: SquarerootGameData | null, playerId: string) {
  if (!data) return { score: 0, streak: 0, correctCount: 0, totalAnswered: 0 };
  const myAnswers = data.answers[playerId] ?? {};
  let score = 0;
  let streak = 0;
  let correctCount = 0;
  for (const q of data.questions) {
    const ans = myAnswers[q.id];
    if (!ans) continue;
    if (ans.points != null) score += ans.points;
    if (ans.correct) correctCount++;
    streak = ans.streak ?? 0;
  }
  return { score, streak, correctCount, totalAnswered: Object.keys(myAnswers).length };
}

// Feedback flash overlay shown after answering
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

// Streak badge
function StreakBadge({ streak, t }: { streak: number; t: (key: string) => string }) {
  if (streak < 2) return null;
  const bonusPercent = Math.round(Math.min(0.5, (streak - 1) * 0.1) * 100);
  return (
    <div className="animate-streak-pop flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
      <span className="text-lg">🔥</span>
      {streak} {t("games.squareroot.streak")}
      {streak >= 3 && <span className="text-xs ml-1">(+{bonusPercent}% {t("games.squareroot.bonus")})</span>}
    </div>
  );
}

// Hook to show feedback flash when an answer lands
function useAnswerFeedback(
  data: SquarerootGameData,
  playerId: string,
) {
  const myAnswers = data.answers[playerId] ?? {};
  const answeredCount = Object.keys(myAnswers).length;
  const currentQuestion = data.questions.find((q) => !myAnswers[q.id]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (answeredCount === 0) return;
    const recentQuestions = data.questions.slice(0, answeredCount);
    const lastQ = recentQuestions[recentQuestions.length - 1];
    if (lastQ) {
      const ans = myAnswers[lastQ.id];
      if (ans) {
        setFeedback(ans.correct ? "correct" : "wrong");
        const timer = setTimeout(() => setFeedback(null), 600);
        return () => clearTimeout(timer);
      }
    }
  }, [answeredCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return { feedback, currentQuestion, answeredCount };
}

// Round 1: Speed — type the natural number answer
function SpeedRound({
  data,
  playerId,
  sendMessage,
}: {
  data: SquarerootGameData;
  playerId: string;
  sendMessage: (payload: unknown) => void;
}) {
  const { t } = useTranslation();
  const { feedback, currentQuestion, answeredCount } = useAnswerFeedback(data, playerId);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput("");
    if (currentQuestion) inputRef.current?.focus();
  }, [currentQuestion?.id]);

  const handleSubmit = () => {
    if (!currentQuestion || !input.trim()) return;
    sendMessage({ action: "answer", questionId: currentQuestion.id, answer: input.trim() });
    setInput("");
  };

  if (!currentQuestion) {
    return (
      <>
        <FeedbackFlash feedback={feedback} />
        <div className="text-center text-gray-500 py-8 animate-fade-in">
          {t("games.squareroot.allAnswered")}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <FeedbackFlash feedback={feedback} />
      <div key={currentQuestion.id} className="animate-question-in">
        <RadicalDisplay value={currentQuestion.value} />
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <input
          ref={inputRef}
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={t("games.squareroot.typeAnswer")}
          className="flex-1 px-4 py-3 text-2xl text-center border-2 border-gray-200 rounded-xl focus:border-brand-400 focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="px-6 py-3 text-lg font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
        >
          {t("games.squareroot.submit")}
        </button>
      </div>
      <div className="text-sm text-gray-400">
        {t("games.squareroot.progress", { current: answeredCount + 1, total: data.questions.length })}
      </div>
    </div>
  );
}

// Round 2: Number Line — click on the line to estimate
function NumberLineRound({
  data,
  playerId,
  sendMessage,
}: {
  data: SquarerootGameData;
  playerId: string;
  sendMessage: (payload: unknown) => void;
}) {
  const { t } = useTranslation();
  const { feedback, currentQuestion, answeredCount } = useAnswerFeedback(data, playerId);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedValue(null);
  }, [currentQuestion?.id]);

  const lineMin = currentQuestion?.lineMin ?? 0;
  const lineMax = currentQuestion?.lineMax ?? 5;
  const range = lineMax - lineMin;

  const handleLineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lineRef.current) return;
    const rect = lineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const value = lineMin + ratio * range;
    setSelectedValue(Math.round(value * 100) / 100);
  };

  if (!currentQuestion) {
    return (
      <>
        <FeedbackFlash feedback={feedback} />
        <div className="text-center text-gray-500 py-8 animate-fade-in">
          {t("games.squareroot.allAnswered")}
        </div>
      </>
    );
  }

  const markerPercent =
    selectedValue != null ? ((selectedValue - lineMin) / range) * 100 : null;

  const ticks: number[] = [];
  for (let i = lineMin; i <= lineMax; i++) {
    ticks.push(i);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <FeedbackFlash feedback={feedback} />
      <div key={currentQuestion.id} className="animate-question-in">
        <RadicalDisplay value={currentQuestion.value} />
      </div>

      <div className="w-full max-w-2xl">
        <div className="text-sm text-gray-500 mb-2 text-center">
          {t("games.squareroot.clickOnLine")}
        </div>
        <div
          ref={lineRef}
          onClick={handleLineClick}
          className="relative h-16 bg-gray-100 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-brand-400 transition-colors"
        >
          {ticks.map((tick) => {
            const percent = ((tick - lineMin) / range) * 100;
            return (
              <div
                key={tick}
                className="absolute top-0 bottom-0 flex flex-col items-center"
                style={{ left: `${percent}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-0.5 h-full bg-gray-300" />
                <span className="absolute bottom-0 translate-y-full pt-1 text-sm font-medium text-gray-500">
                  {tick}
                </span>
              </div>
            );
          })}
          {markerPercent != null && (
            <div
              className="absolute -top-3 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-brand-500 animate-marker-drop"
              style={{ left: `${markerPercent}%`, transform: "translateX(-50%)" }}
            />
          )}
        </div>
        <div className="h-6" />
      </div>

      {selectedValue != null && (
        <div className="text-lg font-medium text-brand-600">
          {t("games.squareroot.yourAnswer")}: {selectedValue}
        </div>
      )}

      <button
        onClick={() => {
          if (selectedValue == null) return;
          sendMessage({
            action: "answer",
            questionId: currentQuestion.id,
            answer: String(selectedValue),
          });
        }}
        disabled={selectedValue == null}
        className="px-8 py-3 text-lg font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
      >
        {t("games.squareroot.submit")}
      </button>

      <div className="text-sm text-gray-400">
        {t("games.squareroot.progress", { current: answeredCount + 1, total: data.questions.length })}
      </div>
    </div>
  );
}

// Round 3: Classify — natural, rational, or irrational
function ClassifyRound({
  data,
  playerId,
  sendMessage,
}: {
  data: SquarerootGameData;
  playerId: string;
  sendMessage: (payload: unknown) => void;
}) {
  const { t } = useTranslation();
  const { feedback, currentQuestion, answeredCount } = useAnswerFeedback(data, playerId);

  if (!currentQuestion) {
    return (
      <>
        <FeedbackFlash feedback={feedback} />
        <div className="text-center text-gray-500 py-8 animate-fade-in">
          {t("games.squareroot.allAnswered")}
        </div>
      </>
    );
  }

  const options: { value: string; label: string; example: string; color: string }[] = [
    { value: "natural", label: t("games.squareroot.natural"), example: "\\sqrt{9}=3", color: "bg-green-500 hover:bg-green-600" },
    { value: "rational", label: t("games.squareroot.rational"), example: "\\sqrt{\\tfrac14}=\\tfrac12", color: "bg-blue-500 hover:bg-blue-600" },
    { value: "irrational", label: t("games.squareroot.irrational"), example: "\\sqrt{2}=1.41\\ldots", color: "bg-purple-500 hover:bg-purple-600" },
  ];

  return (
    <div className="flex flex-col items-center gap-8">
      <FeedbackFlash feedback={feedback} />
      <div key={currentQuestion.id} className="animate-question-in">
        <RadicalDisplay value={currentQuestion.value} />
      </div>

      <div className="text-gray-500 text-lg">{t("games.squareroot.classifyPrompt")}</div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() =>
              sendMessage({
                action: "answer",
                questionId: currentQuestion.id,
                answer: opt.value,
              })
            }
            className={`flex-1 py-4 px-6 text-lg font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 ${opt.color}`}
          >
            <div className="flex flex-col items-center gap-1">
              <span>{opt.label}</span>
              <MathTex tex={opt.example} />
            </div>
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-400">
        {t("games.squareroot.progress", { current: answeredCount + 1, total: data.questions.length })}
      </div>
    </div>
  );
}

// Host view — spectator showing player progress with live scores
function HostView({ data }: { data: SquarerootGameData }) {
  const { t } = useTranslation();
  const players = Object.keys(data.answers);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-gray-500">{t("games.squareroot.hostView")}</p>
      <div className="w-full max-w-md space-y-2">
        {players.length === 0 ? (
          <p className="text-gray-400 text-center py-4">{t("lobby.waiting")}</p>
        ) : (
          players.map((pid) => {
            const playerAnswers = data.answers[pid] ?? {};
            const count = Object.keys(playerAnswers).length;
            const percent = (count / data.questions.length) * 100;
            let score = 0;
            let streak = 0;
            for (const q of data.questions) {
              const ans = playerAnswers[q.id];
              if (ans?.points != null) score += ans.points;
              streak = ans?.streak ?? 0;
            }
            return (
              <div key={pid} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                <span className="font-medium text-gray-700 flex-1">{pid}</span>
                {streak >= 2 && (
                  <span className="text-sm font-bold text-orange-600">{streak}x</span>
                )}
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${percent}%` }} />
                </div>
                <span className="text-sm text-gray-500 tabular-nums">
                  {count}/{data.questions.length}
                </span>
                <span className="text-sm font-bold text-brand-600 tabular-nums min-w-12 text-right">
                  {score}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function SquarerootGame({ gameData, isHost, playerId, sendMessage }: GameProps) {
  const { t } = useTranslation();
  const data = gameData as SquarerootGameData;
  const timeLeft = useTimer(data?.startTime ?? 0, data?.duration ?? 0, !!data && !data.finished);
  const stats = useLiveStats(data, playerId);

  if (!data) {
    return <div className="text-center text-gray-500">{t("common.loading")}</div>;
  }

  const roundNames: Record<string, string> = {
    speed: t("games.squareroot.round1"),
    numberline: t("games.squareroot.round2"),
    classify: t("games.squareroot.round3"),
  };

  const isLowTime = timeLeft <= 10 && timeLeft > 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <div className="text-sm font-semibold uppercase text-brand-500">
          {roundNames[data.roundType] ?? data.roundType}
        </div>
        {!isHost && (
          <div className="flex items-center gap-4">
            {stats.streak >= 2 && <StreakBadge streak={stats.streak} t={t} />}
            <div className="text-lg font-bold text-gray-700 tabular-nums">
              {stats.score} <span className="text-sm font-normal text-gray-400">{t("games.squareroot.pts")}</span>
            </div>
          </div>
        )}
        <div className={`text-2xl font-semibold tabular-nums ${isLowTime ? "text-red-500 animate-timer-pulse" : "text-gray-600"}`}>
          {t("games.squareroot.timeLeft", { seconds: timeLeft })}
        </div>
      </div>

      {isHost ? (
        <HostView data={data} />
      ) : data.roundType === "speed" ? (
        <SpeedRound data={data} playerId={playerId} sendMessage={sendMessage} />
      ) : data.roundType === "numberline" ? (
        <NumberLineRound data={data} playerId={playerId} sendMessage={sendMessage} />
      ) : (
        <ClassifyRound data={data} playerId={playerId} sendMessage={sendMessage} />
      )}
    </div>
  );
}
