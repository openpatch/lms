import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CalculateQuestion } from "../../../../shared/games/rational";
import { readNotation } from "../../../../shared/games/rational";
import { operatorLatex } from "../../../../shared/rational-math";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import TermInput from "../../../components/TermInput";

function termLatex(question: CalculateQuestion): string {
  const operator = operatorLatex(question.operator);
  // Wrap a negative right operand so "1/2 + -3/4" reads as "1/2 + (-3/4)"
  const right =
    question.right.n < 0 ? `\\left(${question.right.latex}\\right)` : question.right.latex;
  return `${question.left.latex} ${operator} ${right} = \\; ?`;
}

/**
 * Add, subtract, multiply or divide two rational numbers. The result goes into
 * a math field, so a fraction is written as a fraction — "/" builds one, and
 * the tablet keyboard has a key for it — rather than spelled out as "3/4".
 */
export default function CalculateStage({
  question,
  submit,
  settings,
}: StageProps<CalculateQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; latex: string } | null>(null);

  if (!question) return null;

  const notation = readNotation(settings);
  // Tagged with its question so the next one always starts from an empty field
  const latex = draft?.questionId === question.id ? draft.latex : "";

  const send = () => {
    if (latex.trim() === "") return;
    submit(latex);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4">
      <div key={question.id} className="animate-question-in w-full">
        <MathTex tex={termLatex(question)} display className="text-4xl" />
      </div>

      <div className="flex items-center gap-2 w-full max-w-md">
        <MathTex tex="=" className="text-3xl text-gray-400" />
        <TermInput
          key={question.id}
          value={latex}
          onChange={(next) => setDraft({ questionId: question.id, latex: next })}
          onSubmit={send}
          ariaLabel={t("games.rational.result")}
        />
      </div>

      <p className="text-sm text-gray-400 text-center max-w-md">
        {t(`games.rational.answerHint.${notation}`)}
      </p>

      <StageActionBar>
        <GameButton onClick={send} disabled={latex.trim() === ""}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
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
