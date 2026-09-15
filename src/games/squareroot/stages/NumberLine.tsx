import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { NumberLineQuestion } from "../../../../shared/games/squareroot";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import NumberLine from "../../../components/NumberLine";

/** Rounded to what a line of this width can honestly show. */
const shown = (value: number) => Math.round(value * 100) / 100;

/**
 * Estimate an irrational root by clicking on the number line.
 *
 * Answering is half of it. The other half is the beat afterwards, where the
 * root drops onto the line beside the guess — the shell holds this question on
 * screen for it (`revealMs` in the game's definition) and says so with
 * `revealed`; all this has to do is draw it.
 */
export default function NumberLineStage({
  question,
  data,
  playerId,
  revealed,
  submit,
}: StageProps<NumberLineQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: number } | null>(null);

  if (!question) return null;

  // While revealing, what is on the line is what the round recorded, not what
  // this device happens to remember.
  const sent = revealed ? Number(data.answers[playerId]?.[question.id]?.answer) : NaN;
  const selected = revealed
    ? isFinite(sent)
      ? sent
      : null
    : draft?.questionId === question.id
      ? draft.value
      : null;

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
          disabled={revealed}
          onPick={(value) => setDraft({ questionId: question.id, value })}
          markers={[
            ...(selected == null ? [] : [{ value: selected, tally: true } as const]),
            ...(revealed
              ? [
                  {
                    value: question.numericAnswer,
                    tone: "correct" as const,
                    latex: String(shown(question.numericAnswer)),
                  },
                ]
              : []),
          ]}
        />
      </div>

      {selected != null && (
        <div className="text-lg font-medium text-game-ink">
          {t("games.squareroot.yourAnswer")}: {selected}
          {revealed && (
            <span className="ml-3 font-normal text-gray-500">
              {t("games.squareroot.offBy", {
                amount: shown(Math.abs(selected - question.numericAnswer)),
              })}
            </span>
          )}
        </div>
      )}

      <StageActionBar>
        <GameButton
          onClick={() => selected != null && submit(String(selected))}
          disabled={selected == null || revealed}
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
