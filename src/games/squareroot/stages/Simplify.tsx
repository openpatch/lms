import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SimplifyQuestion } from "../../../../shared/games/squareroot";
import { encodeRootAnswer, parseRootAnswer } from "../../../../shared/root-math";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";

const INPUT_CLASS =
  "px-3 py-2 text-2xl text-center border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none";

/** Write a root as simply as possible: √72 = 6√2. */
export default function SimplifyStage({ question, submit }: StageProps<SimplifyQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{
    questionId: number;
    factor: string;
    radicand: string;
  } | null>(null);
  const factorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    factorRef.current?.focus();
  }, [question?.id]);

  if (!question) return null;

  const current =
    draft && draft.questionId === question.id
      ? draft
      : { questionId: question.id, factor: "", radicand: "" };

  const send = () => {
    const parsed = parseRootAnswer(current.factor || "1", current.radicand);
    if (!parsed) return;
    submit(encodeRootAnswer(parsed));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") send();
  };

  // Both fields empty means nothing has been entered yet
  const ready = current.factor.trim() !== "" || current.radicand.trim() !== "";

  return (
    <div className="flex flex-col items-center gap-8">
      <div key={question.id} className="animate-question-in">
        <MathTex tex={`${question.promptLatex} = \\; ?`} display className="text-4xl" />
      </div>

      <div className="flex items-end gap-3">
        <div className="flex flex-col items-center">
          <label className="text-sm text-gray-400 mb-1">{t("games.squareroot.factor")}</label>
          <input
            ref={factorRef}
            type="text"
            inputMode="numeric"
            value={current.factor}
            onChange={(e) => setDraft({ ...current, factor: e.target.value })}
            onKeyDown={onKeyDown}
            placeholder="1"
            className={`w-24 ${INPUT_CLASS}`}
          />
        </div>
        <span className="text-4xl text-gray-500 pb-2">
          <MathTex tex="\sqrt{\phantom{x}}" />
        </span>
        <div className="flex flex-col items-center">
          <label className="text-sm text-gray-400 mb-1">{t("games.squareroot.radicand")}</label>
          <input
            type="text"
            inputMode="numeric"
            value={current.radicand}
            onChange={(e) => setDraft({ ...current, radicand: e.target.value })}
            onKeyDown={onKeyDown}
            placeholder="1"
            className={`w-24 ${INPUT_CLASS}`}
          />
        </div>
        <StageActionBar>
          <GameButton onClick={send} disabled={!ready}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      </div>

      <p className="text-sm text-gray-400 text-center max-w-md">
        {t("games.squareroot.simplifyHint")}
      </p>
    </div>
  );
}

export function SimplifyRulesExample() {
  const examples = [
    ["\\sqrt{72}", "6\\sqrt{2}"],
    ["\\sqrt{2} \\cdot \\sqrt{8}", "4"],
    ["\\frac{6}{\\sqrt{3}}", "2\\sqrt{3}"],
  ];
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      {examples.map(([term, result]) => (
        <div key={term} className="flex items-center gap-3 text-xl">
          <MathTex tex={term} />
          <span className="text-gray-400">&rarr;</span>
          <span className="font-bold text-gray-700">
            <MathTex tex={result} />
          </span>
        </div>
      ))}
    </div>
  );
}
