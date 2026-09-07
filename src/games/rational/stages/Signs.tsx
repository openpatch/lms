import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SignsQuestion } from "../../../../shared/games/rational";
import { readAnswerMode } from "../../../../shared/games/rational";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";

/** Work out a term of signed numbers — or just its sign. */
export default function SignsStage({ question, submit, settings }: StageProps<SignsQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mode = readAnswerMode(settings);

  useEffect(() => {
    if (mode === "value") inputRef.current?.focus();
  }, [question?.id, mode]);

  if (!question) return null;

  const current =
    draft && draft.questionId === question.id ? draft : { questionId: question.id, value: "" };

  const send = () => {
    if (!current.value.trim()) return;
    submit(current.value.trim());
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div key={question.id} className="animate-question-in">
        <MathTex tex={`${question.termLatex} = \\; ?`} display className="text-4xl" />
      </div>

      {mode === "sign" ? (
        <>
          <div className="text-gray-500 text-lg">{t("games.rational.signPrompt")}</div>
          <div className="flex gap-4 w-full max-w-md">
            {(["+", "-"] as const).map((sign) => (
              <button
                key={sign}
                onClick={() => submit(sign)}
                className={`flex-1 py-8 text-5xl font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 ${
                  sign === "+" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {sign === "+" ? "+" : "−"}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={current.value}
            onChange={(e) => setDraft({ questionId: question.id, value: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t("games.rational.result")}
            className="w-44 px-3 py-2 text-2xl text-center border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none"
          />
          <StageActionBar>
            <GameButton onClick={send} disabled={!current.value.trim()}>
              {t("game.submit")}
            </GameButton>
          </StageActionBar>
        </div>
      )}
    </div>
  );
}

export function SignsRulesExample() {
  // The sign rules are meant to be derived, so the example shows the pattern
  const examples = [
    ["(-3) \\cdot (+4)", "-12"],
    ["(-3) \\cdot (-4)", "+12"],
    ["-5 - (-7)", "+2"],
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
