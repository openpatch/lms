import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SpeedQuestion } from "../../../../shared/games/squareroot";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";

/** Type the (natural) square root as fast as possible. */
export default function SpeedStage({ question, submit }: StageProps<SpeedQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [question?.id]);

  if (!question) return null;

  // Tagging the draft with its question keeps a stale answer from being sent
  const value = draft?.questionId === question.id ? draft.value : "";

  const send = () => {
    if (!value.trim()) return;
    submit(value.trim());
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div key={question.id} className="animate-question-in">
        <MathTex tex={`\\sqrt{${question.value}}`} display className="text-5xl" />
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => setDraft({ questionId: question.id, value: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("games.squareroot.typeAnswer")}
          className="flex-1 px-4 py-3 text-2xl text-center border-2 border-gray-200 rounded-xl focus:border-brand-400 focus:outline-none"
        />
        <StageActionBar>
          <GameButton onClick={send} disabled={!value.trim()}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      </div>
    </div>
  );
}

export function SpeedRulesExample() {
  return (
    <div className="flex items-center justify-center gap-3 text-2xl text-gray-500">
      <MathTex tex="\sqrt{16} = ?" />
      <span className="text-gray-400">&rarr;</span>
      <span className="font-bold text-gray-700">4</span>
    </div>
  );
}
