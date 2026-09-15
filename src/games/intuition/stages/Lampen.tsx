import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LampQuestion } from "../../../../shared/games/intuition";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";

/**
 * Switch lamps on until they add up to the number asked for.
 *
 * The lamps are worth 1, 2, 4, 8 … or 1, 2, 5, 10, 20 — place value in one
 * case and change from a till in the other — and the station never says which
 * or why. What it does say, the whole time, is the running total, because the
 * feedback is where the learning is.
 */
export default function LampenStage({ question, submit }: StageProps<LampQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; on: boolean[] } | null>(null);

  if (!question) return null;

  const on =
    draft?.questionId === question.id ? draft.on : question.values.map(() => false);
  const total = question.values.reduce((sum, value, index) => (on[index] ? sum + value : sum), 0);
  const hit = total === question.target;

  const toggle = (index: number) => {
    const next = [...on];
    next[index] = !next[index];
    setDraft({ questionId: question.id, on: next });
  };

  return (
    <div
      key={question.id}
      className="animate-question-in flex w-full max-w-xl flex-col items-center gap-5"
    >
      <div className="text-center">
        <p className="text-gray-500">{t("games.intuition.lampPrompt")}</p>
        <p className="text-6xl font-bold text-game-ink tabular-nums">{question.target}</p>
      </div>

      <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-3">
        {question.values.map((value, index) => (
          <button
            key={index}
            onClick={() => toggle(index)}
            aria-pressed={on[index]}
            className={`flex h-20 w-14 flex-col items-center justify-center gap-1 rounded-xl border-2 text-lg font-bold transition-all active:scale-95 sm:h-24 sm:w-16 sm:text-xl ${
              on[index]
                ? "border-game-solid bg-game-solid text-white shadow-lg"
                : "border-gray-200 bg-white text-gray-400 hover:border-game-300"
            }`}
          >
            <span className="text-2xl leading-none">{on[index] ? "💡" : "○"}</span>
            <span className="tabular-nums">{value}</span>
          </button>
        ))}
      </div>

      <p
        className={`text-2xl font-bold tabular-nums transition-colors ${
          hit ? "text-emerald-600" : total > question.target ? "text-rose-500" : "text-gray-400"
        }`}
      >
        {total}
      </p>

      <StageActionBar>
        <GameButton onClick={() => submit(String(total))}>{t("game.submit")}</GameButton>
      </StageActionBar>
    </div>
  );
}

export function LampenRulesExample() {
  const lamps = [
    { value: 1, on: true },
    { value: 2, on: false },
    { value: 4, on: true },
    { value: 8, on: false },
  ];
  return (
    <div className="flex items-center gap-3">
      {lamps.map((lamp, index) => (
        <div
          key={index}
          className={`flex h-16 w-11 flex-col items-center justify-center gap-0.5 rounded-lg border-2 font-bold ${
            lamp.on ? "border-game-solid bg-game-solid text-white" : "border-gray-200 text-gray-400"
          }`}
        >
          <span className="text-lg leading-none">{lamp.on ? "💡" : "○"}</span>
          <span className="text-sm">{lamp.value}</span>
        </div>
      ))}
      <span className="text-gray-400">=</span>
      <span className="text-2xl font-bold text-game-ink">5</span>
    </div>
  );
}
