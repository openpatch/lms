import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DeriveQuestion } from "../../../../shared/games/extremum";
import { parsePolynomial, toLatex } from "../../../../shared/polynomial";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";

/** Differentiate a polynomial and type the result — no calculator. */
export default function DeriveStage({ question, submit }: StageProps<DeriveQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [question?.id]);

  if (!question) return null;

  const current =
    draft && draft.questionId === question.id ? draft : { questionId: question.id, value: "" };
  // Showing how the input was understood beats guessing at the notation
  const preview = current.value.trim() === "" ? null : parsePolynomial(current.value);

  const send = () => {
    if (!current.value.trim()) return;
    submit(current.value.trim());
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div key={question.id} className="animate-question-in text-center">
        <p className="text-gray-500 mb-2">{t("games.extremum.derivePrompt")}</p>
        <MathTex tex={`f(x) = ${question.functionLatex}`} display className="text-4xl" />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-2xl text-gray-500">
          <MathTex tex="f'(x) =" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={current.value}
          onChange={(e) => setDraft({ questionId: question.id, value: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="3x^2-4x+1"
          className="w-64 px-3 py-2 text-2xl text-center border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none"
        />
        <StageActionBar>
          <GameButton onClick={send} disabled={!current.value.trim()}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      </div>

      <div className="h-8 text-xl text-gray-500">
        {preview ? (
          <MathTex tex={toLatex(preview)} />
        ) : current.value.trim() === "" ? (
          <span className="text-sm text-gray-400">{t("games.extremum.deriveHint")}</span>
        ) : (
          <span className="text-sm text-orange-500">{t("games.extremum.deriveUnreadable")}</span>
        )}
      </div>
    </div>
  );
}

export function DeriveRulesExample() {
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <div className="flex items-center gap-3 text-xl">
        <MathTex tex="f(x) = 2x^3 - 5x + 4" />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-gray-700">
          <MathTex tex="f'(x) = 6x^2 - 5" />
        </span>
      </div>
    </div>
  );
}
