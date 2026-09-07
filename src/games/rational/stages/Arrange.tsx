import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ArrangeQuestion } from "../../../../shared/games/rational";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import NumberLine from "../../../components/NumberLine";

interface Draft {
  questionId: number;
  /** Placed value per item, null while the item is still waiting. */
  placements: (number | null)[];
  selected: number | null;
}

/** Place every number of the set at the right spot on the number line. */
export default function ArrangeStage({ question, submit }: StageProps<ArrangeQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);

  if (!question) return null;

  const items = question.items;
  // Deriving the draft from the question id keeps placements from leaking into
  // the next question, even for a click that lands between two renders.
  const current: Draft =
    draft && draft.questionId === question.id
      ? draft
      : { questionId: question.id, placements: items.map(() => null), selected: 0 };
  const { placements, selected } = current;

  const handlePick = (value: number) => {
    if (selected == null) return;
    const next = [...placements];
    next[selected] = value;
    // Move on to the next item that still needs a spot
    const nextOpen = next.findIndex((p) => p == null);
    setDraft({ ...current, placements: next, selected: nextOpen === -1 ? null : nextOpen });
  };

  const allPlaced = items.length > 0 && placements.every((p) => p != null);

  return (
    <div className="flex flex-col items-center w-full gap-6">
      <div className="text-gray-500 text-center">
        {selected != null
          ? t("games.rational.arrangePromptSelected")
          : t("games.rational.arrangePrompt")}
      </div>

      <div key={question.id} className="flex flex-wrap justify-center gap-3 animate-question-in">
        {items.map((item, index) => {
          const placed = placements[index] != null;
          const isSelected = selected === index;
          return (
            <button
              key={index}
              onClick={() => setDraft({ ...current, selected: isSelected ? null : index })}
              className={`px-4 py-3 text-2xl rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-brand-500 bg-brand-50 scale-105"
                  : placed
                    ? "border-gray-200 bg-gray-50 text-gray-400"
                    : "border-gray-300 bg-white hover:border-brand-300"
              }`}
            >
              <MathTex tex={item.latex} />
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-2xl">
        <NumberLine
          min={question.lineMin}
          max={question.lineMax}
          minorStep={0.25}
          disabled={selected == null}
          onPick={handlePick}
          markers={placements.flatMap((placed, index) =>
            placed == null
              ? []
              : [
                  {
                    value: placed,
                    latex: items[index].latex,
                    active: selected === index,
                    onClick: () => setDraft({ ...current, selected: index }),
                  },
                ],
          )}
        />
      </div>

      <StageActionBar>
        <GameButton
          onClick={() => allPlaced && submit(JSON.stringify(placements))}
          disabled={!allPlaced}
        >
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function ArrangeRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <div className="flex items-center gap-4 text-2xl">
        <MathTex tex="\tfrac{1}{4}" />
        <MathTex tex="0.5" />
        <MathTex tex="-\tfrac{2}{3}" />
      </div>
      <div className="relative w-64 h-8 bg-gray-100 rounded-lg border-2 border-gray-300">
        {[0, 25, 50, 75, 100].map((percent) => (
          <div
            key={percent}
            className="absolute top-0 bottom-0 w-px bg-gray-300"
            style={{ left: `${percent}%` }}
          />
        ))}
        <div className="absolute -top-1 w-0.5 h-10 bg-brand-500" style={{ left: "62%" }} />
      </div>
      <p className="text-sm text-gray-400">{t("games.rational.stages.arrange.summary")}</p>
    </div>
  );
}
