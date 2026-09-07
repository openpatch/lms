import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CalculateQuestion } from "../../../../shared/games/rational";
import { readNotation } from "../../../../shared/games/rational";
import { operatorLatex } from "../../../../shared/rational-math";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";

function termLatex(question: CalculateQuestion): string {
  const operator = operatorLatex(question.operator);
  // Wrap a negative right operand so "1/2 + -3/4" reads as "1/2 + (-3/4)"
  const right =
    question.right.n < 0 ? `\\left(${question.right.latex}\\right)` : question.right.latex;
  return `${question.left.latex} ${operator} ${right} = \\; ?`;
}

const INPUT_CLASS =
  "px-3 py-2 text-2xl text-center border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none";

/** Add, subtract, multiply or divide two rational numbers. */
export default function CalculateStage({
  question,
  submit,
  settings,
}: StageProps<CalculateQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{
    questionId: number;
    numerator: string;
    denominator: string;
  } | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, [question?.id]);

  if (!question) return null;

  // A fractions-only round is entered as numerator over denominator; as soon as
  // decimals are allowed a single field takes both notations.
  const notation = readNotation(settings);
  const asFraction = notation === "fraction";

  // Tagged with its question so the next one always starts from empty inputs
  const current =
    draft && draft.questionId === question.id
      ? draft
      : { questionId: question.id, numerator: "", denominator: "" };

  const send = () => {
    if (!current.numerator.trim()) return;
    // The server takes "n/d", "n" and decimals alike
    submit(
      asFraction
        ? `${current.numerator.trim()}/${current.denominator.trim() || "1"}`
        : current.numerator.trim(),
    );
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") send();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div key={question.id} className="animate-question-in">
        <MathTex tex={termLatex(question)} display className="text-4xl" />
      </div>

      <div className="flex items-center gap-3">
        {asFraction ? (
          <div className="flex flex-col items-center">
            <input
              ref={firstInputRef}
              type="text"
              inputMode="numeric"
              value={current.numerator}
              onChange={(e) => setDraft({ ...current, numerator: e.target.value })}
              onKeyDown={onKeyDown}
              placeholder={t("games.rational.numerator")}
              className={`w-32 ${INPUT_CLASS}`}
            />
            <div className="w-32 h-0.5 bg-gray-400 my-2" />
            <input
              type="text"
              inputMode="numeric"
              value={current.denominator}
              onChange={(e) => setDraft({ ...current, denominator: e.target.value })}
              onKeyDown={onKeyDown}
              placeholder={t("games.rational.denominator")}
              className={`w-32 ${INPUT_CLASS}`}
            />
          </div>
        ) : (
          <input
            ref={firstInputRef}
            type="text"
            inputMode={notation === "decimal" ? "decimal" : "text"}
            value={current.numerator}
            onChange={(e) => setDraft({ ...current, numerator: e.target.value })}
            onKeyDown={onKeyDown}
            placeholder={t("games.rational.result")}
            className={`w-44 ${INPUT_CLASS}`}
          />
        )}
        <StageActionBar>
          <GameButton onClick={send} disabled={!current.numerator.trim()}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      </div>

      <p className="text-sm text-gray-400">{t(`games.rational.answerHint.${notation}`)}</p>
    </div>
  );
}

export function CalculateRulesExample() {
  return (
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <div className="flex items-center gap-3 text-2xl">
        <MathTex tex="\tfrac{1}{2} + \tfrac{1}{3}" />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-gray-700">
          <MathTex tex="\tfrac{5}{6}" />
        </span>
      </div>
      <div className="flex items-center gap-3 text-2xl">
        <MathTex tex="\tfrac{3}{4} : \tfrac{1}{2}" />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-gray-700">
          <MathTex tex="\tfrac{3}{2}" />
        </span>
      </div>
    </div>
  );
}
