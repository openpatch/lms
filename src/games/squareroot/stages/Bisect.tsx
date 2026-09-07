import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BisectQuestion } from "../../../../shared/games/squareroot";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import NumberLine from "../../../components/NumberLine";

interface Draft {
  questionId: number;
  min: number;
  max: number;
  steps: number;
  /** Halves picked that did not contain the root. */
  mistakes: number;
  /** Set while a wrong half is being shown. */
  wrong: "left" | "right" | null;
}

/** Rounds for display without turning 4.25 into "4.2500". */
function show(value: number): string {
  return String(Math.round(value * 1e4) / 1e4);
}

/** Trap a root by halving the interval again and again (EdM 1.3). */
export default function BisectStage({ question, submit }: StageProps<BisectQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);

  if (!question) return null;

  const current: Draft =
    draft && draft.questionId === question.id
      ? draft
      : {
          questionId: question.id,
          min: question.startMin,
          max: question.startMax,
          steps: 0,
          mistakes: 0,
          wrong: null,
        };

  const mid = (current.min + current.max) / 2;
  const width = current.max - current.min;
  const root = Math.sqrt(question.value);
  const done = width <= question.target + 1e-9;

  const choose = (side: "left" | "right") => {
    if (done) return;
    const [min, max] = side === "left" ? [current.min, mid] : [mid, current.max];
    // The root has to stay inside — a half without it costs points instead of narrowing
    if (root < min || root > max) {
      setDraft({ ...current, mistakes: current.mistakes + 1, wrong: side });
      return;
    }
    setDraft({ ...current, min, max, steps: current.steps + 1, wrong: null });
  };

  const send = () =>
    submit(
      JSON.stringify({
        min: current.min,
        max: current.max,
        steps: current.steps,
        mistakes: current.mistakes,
      }),
    );

  const half = (side: "left" | "right") => {
    const [min, max] = side === "left" ? [current.min, mid] : [mid, current.max];
    const isWrong = current.wrong === side;
    return (
      <button
        key={side}
        onClick={() => choose(side)}
        disabled={done}
        className={`flex-1 py-5 px-4 rounded-xl border-2 text-lg font-medium transition-all ${
          isWrong
            ? "border-red-400 bg-red-50 text-red-600"
            : done
              ? "border-gray-200 bg-gray-50 text-gray-300"
              : "border-gray-300 bg-white text-gray-700 hover:border-brand-400 hover:bg-brand-50 active:scale-95"
        }`}
      >
        <div className="text-sm text-gray-400 mb-1">
          {t(side === "left" ? "games.squareroot.leftHalf" : "games.squareroot.rightHalf")}
        </div>
        <MathTex tex={`[${show(min)};\\, ${show(max)}]`} />
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center w-full gap-6">
      <div key={question.id} className="animate-question-in text-center">
        <MathTex tex={`\\sqrt{${question.value}}`} display className="text-5xl" />
      </div>

      <div className="text-gray-500 text-center">
        {done
          ? t("games.squareroot.bisectDone", { target: question.target })
          : t("games.squareroot.bisectPrompt", { mid: show(mid), value: question.value })}
      </div>

      <div className="w-full max-w-2xl">
        <NumberLine
          min={current.min}
          max={current.max}
          majorStep={width / 2}
          heightClass="h-16"
          markers={[{ value: mid, latex: show(mid), active: true }]}
        />
      </div>

      <div className="flex gap-4 w-full max-w-2xl">{[half("left"), half("right")]}</div>

      <div className="text-sm text-gray-400">
        {t("games.squareroot.bisectStatus", {
          width: show(width),
          target: question.target,
          count: current.steps,
        })}
      </div>

      <StageActionBar>
        <GameButton onClick={send} disabled={!done}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function BisectRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <div className="flex items-center gap-3 text-xl">
        <MathTex tex="\sqrt{17}" />
        <span className="text-gray-400">&rarr;</span>
        <MathTex tex="[4;\, 5]" />
        <span className="text-gray-400">&rarr;</span>
        <MathTex tex="[4;\, 4.5]" />
        <span className="text-gray-400">&rarr;</span>
        <MathTex tex="[4;\, 4.25]" />
      </div>
      <p className="text-sm text-gray-400">{t("games.squareroot.stages.bisect.summary")}</p>
    </div>
  );
}
