import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { EvaluateQuestion } from "../../../../shared/games/terme";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import TermInput from "../../../components/TermInput";

/**
 * Terme und ihre Berechnung, wertgleiche Terme (EdM 2.1/2.2). Either numbers go
 * into a term and the value comes out, or two terms are held against each other
 * and the question is whether they agree for *every* substitution.
 */
export default function EvaluateStage({ question, submit }: StageProps<EvaluateQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; latex: string } | null>(null);

  if (!question) return null;

  if (question.ask === "equivalent") {
    return (
      <div key={question.id} className="animate-question-in flex flex-col items-center gap-6 px-4">
        <p className="text-gray-500 text-center">{t("games.terme.prompts.equivalent")}</p>

        <div className="flex flex-col items-center gap-3">
          <MathTex tex={question.termLatex} display className="text-3xl" />
          <span className="text-gray-300 text-2xl">≟</span>
          <MathTex tex={question.otherLatex} display className="text-3xl" />
        </div>

        <div className="flex gap-4 w-full max-w-md">
          <button
            onClick={() => submit("true")}
            className="flex-1 py-6 text-lg font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 active:scale-95 transition-all"
          >
            {t("games.terme.evaluate.yes")}
          </button>
          <button
            onClick={() => submit("false")}
            className="flex-1 py-6 text-lg font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 active:scale-95 transition-all"
          >
            {t("games.terme.evaluate.no")}
          </button>
        </div>

        <p className="text-sm text-gray-400 text-center max-w-md">
          {t("games.terme.hints.equivalent")}
        </p>
      </div>
    );
  }

  const latex = draft?.questionId === question.id ? draft.latex : "";
  const send = () => {
    if (latex.trim() === "") return;
    submit(latex);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4">
      <p className="text-gray-500 text-center">{t("games.terme.prompts.value")}</p>

      <div key={question.id} className="animate-question-in flex flex-col items-center gap-3">
        <MathTex tex={question.termLatex} display className="text-4xl" />
        <div className="flex flex-wrap justify-center gap-4 text-2xl text-game-ink">
          {question.assignments.map((assignment) => (
            <MathTex key={assignment.name} tex={`${assignment.name} = ${assignment.latex}`} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full max-w-md">
        <MathTex tex="=" className="text-3xl text-gray-400" />
        <TermInput
          key={question.id}
          value={latex}
          onChange={(next) => setDraft({ questionId: question.id, latex: next })}
          onSubmit={send}
          ariaLabel={t("games.terme.prompts.value")}
        />
      </div>

      <p className="text-sm text-gray-400 text-center max-w-md">{t("games.terme.hints.value")}</p>

      <StageActionBar>
        <GameButton onClick={send} disabled={latex.trim() === ""}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function EvaluateRulesExample() {
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <MathTex tex="4 \cdot \left(x + y^{2}\right)" className="text-xl" />
      <MathTex tex="x = -3, \; y = 5" className="text-lg text-game-ink" />
      <span className="text-gray-400">&darr;</span>
      <span className="font-bold text-gray-700">
        <MathTex tex="4 \cdot \left(-3 + 25\right) = 88" className="text-xl" />
      </span>
    </div>
  );
}
