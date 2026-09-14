import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ZeroQuestion } from "../../../../shared/games/terme";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";

const INPUT_CLASS =
  "w-28 px-3 py-2 text-2xl text-center border-2 border-gray-200 rounded-lg focus:border-game-solid focus:outline-none";

/**
 * Satz vom Nullprodukt (EdM 2.9): a product is zero exactly when one of its
 * factors is — so there is one field per solution, and both have to be filled.
 */
export default function ZeroStage({ question, submit }: StageProps<ZeroQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; values: string[] } | null>(null);

  if (!question) return null;

  const values =
    draft?.questionId === question.id
      ? draft.values
      : question.solutions.map(() => "");

  const complete = values.every((value) => value.trim() !== "");
  const send = () => {
    if (!complete) return;
    submit(values.map((value) => value.trim()).join("; "));
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4">
      <p className="text-gray-500 text-center">
        {t(question.needsFactoring ? "games.terme.prompts.zeroFactor" : "games.terme.prompts.zero")}
      </p>

      <div key={question.id} className="animate-question-in w-full">
        <MathTex tex={`${question.termLatex} = 0`} display className="text-4xl" />
      </div>

      {/* Keyed by the question, so every new equation starts on the first field */}
      <div key={question.id} className="flex flex-wrap items-center justify-center gap-4">
        {values.map((value, index) => (
          <label key={index} className="flex items-center gap-2">
            <MathTex
              tex={`${question.variable}_{${index + 1}} =`}
              className="text-2xl text-gray-500"
            />
            <input
              type="text"
              inputMode="text"
              value={value}
              autoFocus={index === 0}
              onChange={(event) =>
                setDraft({
                  questionId: question.id,
                  values: values.map((old, at) => (at === index ? event.target.value : old)),
                })
              }
              onKeyDown={(event) => event.key === "Enter" && send()}
              className={INPUT_CLASS}
            />
          </label>
        ))}
      </div>

      <p className="text-sm text-gray-400 text-center max-w-md">{t("games.terme.hints.zero")}</p>

      <StageActionBar>
        <GameButton onClick={send} disabled={!complete}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function ZeroRulesExample() {
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <MathTex tex="\left(x - 3\right)\left(x + 5\right) = 0" className="text-xl" />
      <span className="text-gray-400">&darr;</span>
      <span className="font-bold text-gray-700">
        <MathTex tex="x_1 = 3 \quad x_2 = -5" className="text-xl" />
      </span>
    </div>
  );
}
