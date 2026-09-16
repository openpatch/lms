import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OrderQuestion } from "../../../../shared/games/rational";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";

interface Draft {
  questionId: number;
  /** Item indices, in the order they were tapped. */
  order: number[];
}

/**
 * Put the numbers in order of size by tapping them in that order.
 *
 * Tapping rather than dragging, because the class plays this on phones and a
 * row of fraction tiles is about the worst thing there is to drag with a thumb.
 * Tapping also builds the line the exercise is really about — the chain grows
 * under the numbers as it is tapped, with the relation sign between the links,
 * so what the player ends up looking at is the line they would have written in
 * their book.
 */
export default function OrderStage({ question, submit }: StageProps<OrderQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);

  if (!question) return null;

  const items = question.items;
  // Deriving the draft from the question id keeps taps from leaking into the
  // next question, even for one that lands between two renders.
  const current: Draft =
    draft && draft.questionId === question.id ? draft : { questionId: question.id, order: [] };
  const order = current.order;

  const toggle = (index: number) => {
    const at = order.indexOf(index);
    setDraft({
      questionId: question.id,
      // Tapping a number that is already in the line takes it back out and the
      // rest close up, so a misread costs one tap rather than the question.
      order: at === -1 ? [...order, index] : order.filter((i) => i !== index),
    });
  };

  const complete = order.length === items.length;
  const relation = question.direction === "asc" ? "<" : ">";

  return (
    <div className="flex flex-col items-center w-full gap-6">
      <div className="text-gray-500 text-center">
        {t(
          question.direction === "asc"
            ? "games.rational.orderPromptAsc"
            : "games.rational.orderPromptDesc",
        )}
      </div>

      <div key={question.id} className="flex flex-wrap justify-center gap-3 animate-question-in">
        {items.map((item, index) => {
          const at = order.indexOf(index);
          return (
            <button
              key={index}
              onClick={() => toggle(index)}
              className={`relative px-4 py-3 text-2xl rounded-xl border-2 transition-all ${
                at === -1
                  ? "border-gray-300 bg-white hover:border-game-300"
                  : "border-game-solid bg-game-50 text-gray-400"
              }`}
            >
              <MathTex tex={item.latex} />
              {at !== -1 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-game-solid text-white text-xs font-bold">
                  {at + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-2xl">
        {items.map((_, slot) => {
          const picked = order[slot];
          return (
            <span key={slot} className="flex items-center gap-2">
              {slot > 0 && <span className="text-gray-300">{relation}</span>}
              {picked == null ? (
                <span className="inline-block w-12 h-10 rounded-lg border-2 border-dashed border-gray-200" />
              ) : (
                <MathTex tex={items[picked].latex} className="text-gray-800" />
              )}
            </span>
          );
        })}
      </div>

      <StageActionBar>
        <GameButton onClick={() => complete && submit(JSON.stringify(order))} disabled={!complete}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function OrderRulesExample() {
  const { t } = useTranslation();
  // The chain is the point, and so is the number that does not sort where it
  // looks like it should: |-3/4| stands between -0.5 and 2, not out at the left.
  const chain = ["-\\tfrac{3}{2}", "-0.5", "\\left|-\\tfrac{3}{4}\\right|", "2"];
  return (
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <div className="flex flex-wrap items-center justify-center gap-3 text-2xl">
        {chain.map((tex, index) => (
          <span key={tex} className="flex items-center gap-3">
            {index > 0 && <span className="text-gray-300">&lt;</span>}
            <MathTex tex={tex} />
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-400">{t("games.rational.stages.order.summary")}</p>
    </div>
  );
}
