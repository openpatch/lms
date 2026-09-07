import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { NumberLineQuestion } from "../../../../shared/games/squareroot";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import NumberLine from "../../../components/NumberLine";

/** Estimate an irrational root by clicking on the number line. */
export default function NumberLineStage({ question, submit }: StageProps<NumberLineQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: number } | null>(null);

  if (!question) return null;

  const selected = draft?.questionId === question.id ? draft.value : null;

  return (
    <div className="flex flex-col items-center w-full gap-8">
      <div key={question.id} className="animate-question-in">
        <MathTex tex={`\\sqrt{${question.value}}`} display className="text-5xl" />
      </div>

      <div className="w-full max-w-2xl">
        <div className="text-sm text-gray-500 mb-2 text-center">
          {t("games.squareroot.clickOnLine")}
        </div>
        <NumberLine
          min={question.lineMin}
          max={question.lineMax}
          heightClass="h-16"
          precision={2}
          onPick={(value) => setDraft({ questionId: question.id, value })}
          markers={selected == null ? [] : [{ value: selected }]}
        />
      </div>

      {selected != null && (
        <div className="text-lg font-medium text-brand-600">
          {t("games.squareroot.yourAnswer")}: {selected}
        </div>
      )}

      <StageActionBar>
        <GameButton
          onClick={() => selected != null && submit(String(selected))}
          disabled={selected == null}
        >
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function NumberLineRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <div className="flex items-center gap-3 text-2xl">
        <MathTex tex="\sqrt{2} \approx ?" />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-gray-700">1.41</span>
      </div>
      <p className="text-sm text-gray-400">{t("games.squareroot.clickOnLine")}</p>
    </div>
  );
}
