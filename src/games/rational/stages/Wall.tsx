import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WallQuestion } from "../../../../shared/games/rational";
import { wallIndex } from "../../../../shared/games/rational";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";

const BRICK_CLASS =
  "flex items-center justify-center h-12 border-2 rounded-lg text-xl overflow-hidden";

/**
 * A wall drawn the way the book draws it: the bottom row widest, every brick
 * sitting on the two it is the product of. What goes into a brick is up to the
 * caller — a number, an input, a number marked right or wrong.
 */
export function WallBricks({
  size,
  renderBrick,
  compact = false,
}: {
  size: number;
  renderBrick: (index: number, className: string) => React.ReactNode;
  compact?: boolean;
}) {
  const width = compact ? "w-14" : size === 4 ? "w-[4.5rem] sm:w-20" : "w-20 sm:w-24";
  const rows = Array.from({ length: size }, (_, i) => size - 1 - i);
  return (
    <div className="flex flex-col items-center gap-1">
      {rows.map((row) => (
        <div key={row} className="flex gap-1">
          {Array.from({ length: size - row }, (_, col) => {
            const index = wallIndex(size, row, col);
            return (
              <div key={index} className={width}>
                {renderBrick(index, `${BRICK_CLASS} w-full ${compact ? "h-9 text-base" : ""}`)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Fill in a multiplication wall: every brick is the product of the two below. */
export default function WallStage({ question, submit }: StageProps<WallQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; values: string[] } | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, [question?.id]);

  if (!question) return null;

  const values =
    draft?.questionId === question.id ? draft.values : question.hidden.map(() => "");
  const complete = values.every((value) => value.trim() !== "");

  const send = () => {
    if (!complete) return;
    submit(JSON.stringify(values.map((value) => value.trim())));
  };

  const onKeyDown = (slot: number) => (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    // Enter walks on to the next empty brick, and sends the wall once it is full
    const next = values.findIndex((value, i) => i !== slot && value.trim() === "");
    if (next >= 0) inputs.current[next]?.focus();
    else send();
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full px-2">
      <p className="text-gray-500 text-center">{t("games.rational.wallPrompt")}</p>

      <div key={question.id} className="animate-question-in">
        <WallBricks
          size={question.size}
          renderBrick={(index, className) => {
            const slot = question.hidden.indexOf(index);
            if (slot < 0) {
              return (
                <div className={`${className} bg-gray-100 border-gray-200 text-gray-700`}>
                  <MathTex tex={question.bricks[index].latex} />
                </div>
              );
            }
            return (
              <input
                ref={(element) => {
                  inputs.current[slot] = element;
                }}
                type="text"
                inputMode="numeric"
                value={values[slot]}
                onChange={(e) => {
                  const next = [...values];
                  next[slot] = e.target.value;
                  setDraft({ questionId: question.id, values: next });
                }}
                onKeyDown={onKeyDown(slot)}
                aria-label={t("games.rational.wallBrick")}
                className={`${className} px-1 text-center bg-white border-gray-200 focus:border-game-solid focus:outline-none`}
              />
            );
          }}
        />
      </div>

      <p className="text-sm text-gray-400 text-center max-w-md">{t("games.rational.wallHint")}</p>

      <StageActionBar>
        <GameButton onClick={send} disabled={!complete}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function WallRulesExample() {
  // The book's first wall: -2, 3, -1 at the bottom
  const bricks = ["-2", "3", "-1", "-6", "-3", "18"];
  return (
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <WallBricks
        size={3}
        compact
        renderBrick={(index, className) => (
          <div
            className={`${className} ${
              index < 3
                ? "bg-gray-100 border-gray-200 text-gray-700"
                : "bg-game-50 border-game-300 text-game-ink font-medium"
            }`}
          >
            <MathTex tex={bricks[index]} />
          </div>
        )}
      />
      <MathTex tex="(-2) \cdot 3 = -6" className="text-sm" />
    </div>
  );
}
