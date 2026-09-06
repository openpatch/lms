import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameProps } from "../../lib/game-registry";
import type { AnalysisGameData, AnalysisQuestion } from "../../../shared/types";
import { evaluateFunction, evaluateDerivative } from "../../../shared/analysis-functions";
import MathTex from "../../components/Math";
import DrawCanvas, { type Point } from "./DrawCanvas";

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

function useLiveStats(data: AnalysisGameData | null, playerId: string) {
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

function StreakBadge({ streak, t }: { streak: number; t: (key: string) => string }) {
  if (streak < 2) return null;
  const bonusPercent = Math.round(Math.min(0.5, (streak - 1) * 0.1) * 100);
  return (
    <div className="animate-streak-pop flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
      <span className="text-lg">🔥</span>
      {streak} {t("games.analysis.streak")}
      {streak >= 3 && <span className="text-xs ml-1">(+{bonusPercent}% {t("games.analysis.bonus")})</span>}
    </div>
  );
}

function useAnswerFeedback(data: AnalysisGameData, playerId: string) {
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

// Round 1: Multiple Choice — show f(x), select f'(x) from 4 options
function MultipleChoiceRound({
  data,
  playerId,
  sendMessage,
}: {
  data: AnalysisGameData;
  playerId: string;
  sendMessage: (payload: unknown) => void;
}) {
  const { t } = useTranslation();
  const { feedback, currentQuestion, answeredCount } = useAnswerFeedback(data, playerId);

  if (!currentQuestion || !currentQuestion.options) {
    return (
      <>
        <FeedbackFlash feedback={feedback} />
        <div className="text-center text-gray-500 py-8 animate-fade-in">
          {t("games.analysis.allAnswered")}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <FeedbackFlash feedback={feedback} />
      <div key={currentQuestion.id} className="animate-question-in text-center">
        <p className="text-gray-500 mb-3">{t("games.analysis.findDerivative")}</p>
        <div className="text-4xl">
          <MathTex tex={`f(x) = ${currentQuestion.functionLatex}`} display />
        </div>
      </div>

      <div className="text-gray-500 text-lg">{t("games.analysis.whichIsDerivative")}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {currentQuestion.options.map((opt, i) => (
          <button
            key={i}
            onClick={() =>
              sendMessage({
                action: "answer",
                questionId: currentQuestion.id,
                answer: String(i),
              })
            }
            className="py-6 px-6 text-xl font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-all active:scale-95"
          >
            <MathTex tex={`f'(x) = ${opt}`} display />
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-400">
        {t("games.analysis.progress", { current: answeredCount + 1, total: data.questions.length })}
      </div>
    </div>
  );
}

// Round 2: Draw the graph of f(x)
function DrawGraphRound({
  data,
  playerId,
  sendMessage,
}: {
  data: AnalysisGameData;
  playerId: string;
  sendMessage: (payload: unknown) => void;
}) {
  const { t } = useTranslation();
  const { feedback, currentQuestion, answeredCount } = useAnswerFeedback(data, playerId);
  const [drawnPoints, setDrawnPoints] = useState<Point[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [submittedQuestion, setSubmittedQuestion] = useState<AnalysisQuestion | null>(null);

  useEffect(() => {
    if (submittedQuestion) return;
    setDrawnPoints([]);
    setClearSignal((s) => s + 1);
  }, [currentQuestion?.id, submittedQuestion]);

  const displayQuestion = submittedQuestion ?? currentQuestion;
  const isInReveal = submittedQuestion !== null;
  const submittedAnswer = submittedQuestion
    ? data.answers[playerId]?.[submittedQuestion.id]
    : null;

  if (!displayQuestion || displayQuestion.xMin == null) {
    return (
      <>
        <FeedbackFlash feedback={feedback} />
        <div className="text-center text-gray-500 py-8 animate-fade-in">
          {t("games.analysis.allAnswered")}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <FeedbackFlash feedback={feedback} />
      <div key={displayQuestion.id} className="animate-question-in text-center">
        <p className="text-gray-500 mb-2">{t("games.analysis.drawGraphPrompt")}</p>
        <div className="text-3xl">
          <MathTex tex={`f(x) = ${displayQuestion.functionLatex}`} display />
        </div>
      </div>

      {isInReveal && submittedAnswer && (
        <div className="flex items-center gap-4 animate-fade-in">
          <div className={`px-4 py-2 rounded-full font-bold text-sm ${submittedAnswer.correct ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
            {submittedAnswer.points} {t("games.analysis.pts")}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-gray-400 rounded" />
              {t("games.analysis.yourDrawing")}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-blue-600 rounded" />
              {t("games.analysis.solution")}
            </span>
          </div>
        </div>
      )}

      <DrawCanvas
        xMin={displayQuestion.xMin!}
        xMax={displayQuestion.xMax!}
        yMin={displayQuestion.yMin!}
        yMax={displayQuestion.yMax!}
        solutionFn={isInReveal ? (x) => evaluateFunction(displayQuestion.functionId, x) : undefined}
        readOnly={isInReveal}
        onPointsChange={setDrawnPoints}
        clearSignal={clearSignal}
      />

      {isInReveal ? (
        <button
          onClick={() => {
            setSubmittedQuestion(null);
            setDrawnPoints([]);
            setClearSignal((s) => s + 1);
          }}
          className="px-8 py-3 text-lg font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors"
        >
          {t("games.analysis.next")}
        </button>
      ) : (
        <button
          onClick={() => {
            if (drawnPoints.length < 2 || !currentQuestion) return;
            setSubmittedQuestion(currentQuestion);
            sendMessage({
              action: "answer",
              questionId: currentQuestion.id,
              answer: JSON.stringify(drawnPoints),
            });
          }}
          disabled={drawnPoints.length < 2}
          className="px-8 py-3 text-lg font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
        >
          {t("games.analysis.submit")}
        </button>
      )}

      <div className="text-sm text-gray-400">
        {t("games.analysis.progress", { current: answeredCount + 1, total: data.questions.length })}
      </div>
    </div>
  );
}

// Round 3: Draw the derivative f'(x) given the graph of f(x)
function DrawDerivativeRound({
  data,
  playerId,
  sendMessage,
}: {
  data: AnalysisGameData;
  playerId: string;
  sendMessage: (payload: unknown) => void;
}) {
  const { t } = useTranslation();
  const { feedback, currentQuestion, answeredCount } = useAnswerFeedback(data, playerId);
  const [drawnPoints, setDrawnPoints] = useState<Point[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [submittedQuestion, setSubmittedQuestion] = useState<AnalysisQuestion | null>(null);

  useEffect(() => {
    if (submittedQuestion) return;
    setDrawnPoints([]);
    setClearSignal((s) => s + 1);
  }, [currentQuestion?.id, submittedQuestion]);

  const displayQuestion = submittedQuestion ?? currentQuestion;
  const isInReveal = submittedQuestion !== null;
  const submittedAnswer = submittedQuestion
    ? data.answers[playerId]?.[submittedQuestion.id]
    : null;

  if (!displayQuestion || displayQuestion.xMin == null) {
    return (
      <>
        <FeedbackFlash feedback={feedback} />
        <div className="text-center text-gray-500 py-8 animate-fade-in">
          {t("games.analysis.allAnswered")}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <FeedbackFlash feedback={feedback} />
      <div key={displayQuestion.id} className="animate-question-in text-center">
        <p className="text-gray-500 mb-2">{t("games.analysis.drawDerivativePrompt")}</p>
        <div className="text-2xl text-gray-400">
          <MathTex tex={`f(x) = ${displayQuestion.functionLatex}`} display />
        </div>
        <p className="text-sm text-gray-400 mt-1">{t("games.analysis.dashedIsFunction")}</p>
      </div>

      {isInReveal && submittedAnswer && (
        <div className="flex items-center gap-4 animate-fade-in">
          <div className={`px-4 py-2 rounded-full font-bold text-sm ${submittedAnswer.correct ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
            {submittedAnswer.points} {t("games.analysis.pts")}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-gray-400 rounded" />
              {t("games.analysis.yourDrawing")}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-blue-600 rounded" />
              {t("games.analysis.solution")}
            </span>
          </div>
        </div>
      )}

      <DrawCanvas
        xMin={displayQuestion.xMin!}
        xMax={displayQuestion.xMax!}
        yMin={displayQuestion.yMin!}
        yMax={displayQuestion.yMax!}
        referenceFn={(x) => evaluateFunction(displayQuestion.functionId, x)}
        solutionFn={isInReveal ? (x) => evaluateDerivative(displayQuestion.functionId, x) : undefined}
        readOnly={isInReveal}
        onPointsChange={setDrawnPoints}
        clearSignal={clearSignal}
      />

      {isInReveal ? (
        <button
          onClick={() => {
            setSubmittedQuestion(null);
            setDrawnPoints([]);
            setClearSignal((s) => s + 1);
          }}
          className="px-8 py-3 text-lg font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors"
        >
          {t("games.analysis.next")}
        </button>
      ) : (
        <button
          onClick={() => {
            if (drawnPoints.length < 2 || !currentQuestion) return;
            setSubmittedQuestion(currentQuestion);
            sendMessage({
              action: "answer",
              questionId: currentQuestion.id,
              answer: JSON.stringify(drawnPoints),
            });
          }}
          disabled={drawnPoints.length < 2}
          className="px-8 py-3 text-lg font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
        >
          {t("games.analysis.submit")}
        </button>
      )}

      <div className="text-sm text-gray-400">
        {t("games.analysis.progress", { current: answeredCount + 1, total: data.questions.length })}
      </div>
    </div>
  );
}

// Host view — spectator showing player progress with live scores
function HostView({ data }: { data: AnalysisGameData }) {
  const { t } = useTranslation();
  const players = Object.keys(data.answers);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-gray-500">{t("games.analysis.hostView")}</p>
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

export default function AnalysisGame({ gameData, isHost, playerId, sendMessage }: GameProps) {
  const { t } = useTranslation();
  const data = gameData as AnalysisGameData;
  const timeLeft = useTimer(data?.startTime ?? 0, data?.duration ?? 0, !!data && !data.finished);
  const stats = useLiveStats(data, playerId);

  if (!data) {
    return <div className="text-center text-gray-500">{t("common.loading")}</div>;
  }

  const roundNames: Record<string, string> = {
    "multiple-choice": t("games.analysis.round1"),
    "draw-graph": t("games.analysis.round2"),
    "draw-derivative": t("games.analysis.round3"),
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
              {stats.score} <span className="text-sm font-normal text-gray-400">{t("games.analysis.pts")}</span>
            </div>
          </div>
        )}
        <div className={`text-2xl font-semibold tabular-nums ${isLowTime ? "text-red-500 animate-timer-pulse" : "text-gray-600"}`}>
          {t("games.analysis.timeLeft", { seconds: timeLeft })}
        </div>
      </div>

      {isHost ? (
        <HostView data={data} />
      ) : data.roundType === "multiple-choice" ? (
        <MultipleChoiceRound data={data} playerId={playerId} sendMessage={sendMessage} />
      ) : data.roundType === "draw-graph" ? (
        <DrawGraphRound data={data} playerId={playerId} sendMessage={sendMessage} />
      ) : (
        <DrawDerivativeRound data={data} playerId={playerId} sendMessage={sendMessage} />
      )}
    </div>
  );
}
