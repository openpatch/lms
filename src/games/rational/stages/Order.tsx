import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OrderQuestion } from "../../../../shared/games/rational";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";

interface Draft {
  questionId: number;
  /** Item indices, in the order they were put into the line. */
  order: number[];
}

/** A number in hand, between picking it up and letting it go. */
interface Drag {
  /** The item being carried. */
  item: number;
  /** Where the pointer went down, so a tap can be told from a drag. */
  startX: number;
  startY: number;
  /** Where it is now, for the copy that follows the finger. */
  x: number;
  y: number;
  /** The gap in the line the pointer is over, if any. */
  over: number | null;
  /** False until the pointer has travelled far enough to mean it. */
  moved: boolean;
}

/** How far a pointer travels before it is carrying a number rather than
 *  tapping one. A finger never comes down and up on the same pixel. */
const DRAG_THRESHOLD = 6;

/** The gap of the line under this point, or null for anywhere else. */
function slotAt(x: number, y: number): number | null {
  const hit = document.elementFromPoint(x, y)?.closest("[data-slot]");
  if (!(hit instanceof HTMLElement)) return null;
  const slot = Number(hit.dataset.slot);
  return Number.isInteger(slot) ? slot : null;
}

/**
 * Put the numbers in order of size.
 *
 * Tapping was the whole of it to begin with — tap the numbers in order and the
 * line builds itself underneath, which is one gesture per number and survives
 * being done with a thumb. But a row of numbers over a row of empty boxes is an
 * invitation to drag, and classes took it, so dragging works too: carry a
 * number into a gap, carry it to another gap to move it along the line, or
 * carry it off the line to take it back out. Neither gesture is the real one.
 *
 * Pointer events rather than HTML5 drag-and-drop, which does not exist on a
 * tablet — a touch there never raises `dragstart`, so the class that prompted
 * this would have got nothing at all.
 */
export default function OrderStage({ question, submit }: StageProps<OrderQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  if (!question) return null;

  const items = question.items;
  // Deriving the draft from the question id keeps taps from leaking into the
  // next question, even for one that lands between two renders.
  const current: Draft =
    draft && draft.questionId === question.id ? draft : { questionId: question.id, order: [] };
  const order = current.order;

  const put = (next: number[]) => setDraft({ questionId: question.id, order: next });

  const toggle = (index: number) => {
    const at = order.indexOf(index);
    // Tapping a number that is already in the line takes it back out and the
    // rest close up, so a misread costs one tap rather than the question.
    put(at === -1 ? [...order, index] : order.filter((i) => i !== index));
  };

  /** Drops the carried number into a gap. Everything after it shifts along;
   *  a gap past the end of the line means "on the end", since a line with a
   *  hole in it is not an ordering of anything. */
  const drop = (item: number, slot: number | null) => {
    const without = order.filter((i) => i !== item);
    if (slot == null) {
      // Let go of it away from the line: that is putting it back in the row
      put(without);
      return;
    }
    const at = Math.max(0, Math.min(slot, without.length));
    put([...without.slice(0, at), item, ...without.slice(at)]);
  };

  const startDrag = (item: number, e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      item,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      over: null,
      moved: false,
    });
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    const far =
      drag.moved || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) >= DRAG_THRESHOLD;
    // Under the threshold this is still a tap that has not finished happening
    if (!far) return;
    // Read the gap out here rather than inside the updater: an updater has to
    // be pure, and this one would be asking the DOM where the finger is.
    const over = slotAt(e.clientX, e.clientY);
    setDrag({ ...drag, moved: true, x: e.clientX, y: e.clientY, over });
  };

  const endDrag = () => {
    if (!drag) return;
    // Under the threshold nothing was carried anywhere: it was a tap, and a tap
    // on a number is what puts it in the line or takes it out again.
    if (!drag.moved) toggle(drag.item);
    else drop(drag.item, drag.over);
    setDrag(null);
  };

  const complete = order.length === items.length;
  const relation = question.direction === "asc" ? "<" : ">";
  /** Carried numbers are drawn in hand, not in the place they came from. */
  const carried = drag?.moved ? drag.item : null;

  /** The handlers every number carries, wherever it is drawn. */
  const grip = (item: number) => ({
    onPointerDown: (e: React.PointerEvent) => startDrag(item, e),
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: () => setDrag(null),
    // Or the tablet scrolls the page instead of moving the number
    className: "touch-none select-none",
  });

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
          const { className: grab, ...handlers } = grip(index);
          return (
            <button
              key={index}
              {...handlers}
              className={`relative px-4 py-3 text-2xl rounded-xl border-2 transition-all ${grab} ${
                carried === index ? "opacity-30" : ""
              } ${
                at === -1
                  ? "border-gray-300 bg-white hover:border-game-300 cursor-grab active:cursor-grabbing"
                  : "border-game-solid bg-game-50 text-gray-400 cursor-grab active:cursor-grabbing"
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
          const target = drag?.moved && drag.over === slot;
          return (
            <span key={slot} className="flex items-center gap-2">
              {slot > 0 && <span className="text-gray-300">{relation}</span>}
              <span
                data-slot={slot}
                className={`inline-flex items-center justify-center min-w-12 h-10 rounded-lg transition-colors ${
                  picked == null || picked === carried
                    ? `border-2 border-dashed ${target ? "border-game-solid bg-game-50" : "border-gray-200"}`
                    : target
                      ? "border-2 border-game-solid bg-game-50"
                      : "border-2 border-transparent"
                }`}
              >
                {picked == null || picked === carried ? null : (
                  <span {...grip(picked)}>
                    <MathTex tex={items[picked].latex} className="text-gray-800" />
                  </span>
                )}
              </span>
            </span>
          );
        })}
      </div>

      <StageActionBar>
        <GameButton onClick={() => complete && submit(JSON.stringify(order))} disabled={!complete}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>

      {/* The number in hand, drawn under the finger and deaf to the pointer so
          it never hides the gap it is being carried to. */}
      {drag?.moved && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 px-4 py-3 text-2xl rounded-xl border-2 border-game-solid bg-white shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          <MathTex tex={items[drag.item].latex} />
        </div>
      )}
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
