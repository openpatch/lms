import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParsonsQuestion } from "../../shared/parsons";
import type { StageProps } from "../lib/game-registry";
import GameButton from "./GameButton";
import { StageActionBar } from "./StageShell";

const MAX_INDENT = 3;

/** How far a pointer travels before it is carrying a line rather than tapping
 *  one. A finger never comes down and up on the same pixel. */
const DRAG_THRESHOLD = 6;

/** A line in hand, between picking it up and letting it go. */
interface Drag {
  /** Which of the offered lines is being carried. */
  line: number;
  /** Where it was picked up: its place in the program, or the pool below. */
  from: number | "pool";
  startX: number;
  startY: number;
  x: number;
  y: number;
  /** Where it would land: a place in the program, or back in the pool. */
  over: number | "pool" | null;
  moved: boolean;
}

/** What the pointer is over: a position in the program, the program's empty
 *  space, or the pool. */
function targetAt(x: number, y: number): number | "pool" | null {
  const el = document.elementFromPoint(x, y);
  if (!(el instanceof Element)) return null;
  const slot = el.closest("[data-parsons-slot]");
  if (slot instanceof HTMLElement) {
    const at = Number(slot.dataset.parsonsSlot);
    return Number.isInteger(at) ? at : null;
  }
  const zone = el.closest("[data-parsons-zone]");
  if (zone instanceof HTMLElement) {
    return zone.dataset.parsonsZone === "pool" ? "pool" : Number.MAX_SAFE_INTEGER;
  }
  return null;
}

interface Draft {
  questionId: number;
  /** Offered lines, in the order the player put them. */
  order: number[];
  /** The indent chosen for each placed line. */
  indents: number[];
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7 shrink-0 rounded-md border border-gray-200 bg-white text-xs text-gray-500 transition-colors hover:border-game-solid hover:text-game-ink disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
    >
      {children}
    </button>
  );
}

/**
 * A Parsons puzzle: the lines of a working program, shuffled. Tap a line to add
 * it to the program, and move it with the arrows.
 *
 * With `withIndent` on, the lines arrive flush left and the player sets the
 * indentation as well — which is the harder and the more Python half of the
 * exercise, because indentation is what decides where a block ends.
 */
export interface ParsonsPuzzleProps extends StageProps<ParsonsQuestion> {
  /** The game's own line renderer — Java lines highlighted as Java, Python as
   *  Python. The puzzle is the same either way; only the colours are not. */
  CodeLine: React.ComponentType<{ text: string }>;
}

export default function ParsonsPuzzle({ question, submit, CodeLine }: ParsonsPuzzleProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);
  /**
   * The drag lives in a ref and is mirrored into state only to be drawn.
   *
   * A pointer handler that reads the drag out of its render closure is reading
   * what was true when the component last rendered, and a fast drag delivers
   * `pointerdown` and its first `pointermove` inside one frame — before React
   * has re-rendered, so the move sees no drag and the whole gesture is dropped
   * on the floor without a word. The ref is written synchronously and is always
   * what is actually happening.
   */
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const show = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };
  /** Set when a drag ends, so the click it produces does not also place the
   *  line that was just carried somewhere on purpose. */
  const swallowClick = useRef(false);

  if (!question) return null;

  const freeIndent = question.indents == null;
  const current: Draft =
    draft && draft.questionId === question.id
      ? draft
      : { questionId: question.id, order: [], indents: [] };
  const { order, indents } = current;

  const update = (next: Partial<Draft>) => setDraft({ ...current, ...next });
  const pool = question.lines.map((_, index) => index).filter((index) => !order.includes(index));

  const place = (line: number) => {
    // A new line starts at the indent of the one above it — the usual next guess.
    const indent = freeIndent ? (indents.at(-1) ?? 0) : (question.indents?.[line] ?? 0);
    update({ order: [...order, line], indents: [...indents, indent] });
  };

  const remove = (position: number) => {
    update({
      order: order.filter((_, index) => index !== position),
      indents: indents.filter((_, index) => index !== position),
    });
  };

  const move = (position: number, by: number) => {
    const target = position + by;
    if (target < 0 || target >= order.length) return;
    const nextOrder = [...order];
    const nextIndents = [...indents];
    [nextOrder[position], nextOrder[target]] = [nextOrder[target], nextOrder[position]];
    [nextIndents[position], nextIndents[target]] = [nextIndents[target], nextIndents[position]];
    update({ order: nextOrder, indents: nextIndents });
  };

  const setIndent = (position: number, by: number) => {
    const next = [...indents];
    next[position] = Math.min(MAX_INDENT, Math.max(0, next[position] + by));
    update({ indents: next });
  };

  /** Drops the carried line where the pointer left it. */
  const drop = (line: number, target: number | "pool" | null) => {
    const at = order.indexOf(line);
    const without = order.filter((l) => l !== line);
    const keptIndents = indents.filter((_, i) => i !== at);

    if (target == null || target === "pool") {
      update({ order: without, indents: keptIndents });
      return;
    }
    const to = Math.max(0, Math.min(target, without.length));
    // A line keeps the indent it had; one arriving from the pool takes the one
    // above it, which is the guess the tapping path has always made.
    const indent =
      at !== -1
        ? indents[at]
        : freeIndent
          ? (keptIndents[to - 1] ?? 0)
          : (question.indents?.[line] ?? 0);
    update({
      order: [...without.slice(0, to), line, ...without.slice(to)],
      indents: [...keptIndents.slice(0, to), indent, ...keptIndents.slice(to)],
    });
  };

  /**
   * Picking a line up.
   *
   * The handlers sit on the row and on the pool button, and neither goes away
   * while it is being carried — the row is only faded. Taking the element that
   * holds the pointer capture out of the page mid-drag means the release never
   * reaches anything and the line stays stuck in hand, which is exactly what
   * happened the first time this was built for another station.
   */
  const startDrag = (line: number, from: number | "pool", e: React.PointerEvent) => {
    // The arrows and the ✕ are buttons in their own right
    if (e.target instanceof Element && e.target.closest("button[aria-label]")) return;
    // A drag whose click never arrived must not eat the next one instead. The
    // click a drag produces lands before any new press, so clearing here can
    // only ever throw away a flag nobody is waiting on — and a line dragged out
    // of the pool leaves no button behind for its own click to land on.
    swallowClick.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    show({ line, from, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, over: null, moved: false });
  };

  const moveDrag = (e: React.PointerEvent) => {
    const held = dragRef.current;
    if (!held) return;
    const far =
      held.moved || Math.hypot(e.clientX - held.startX, e.clientY - held.startY) >= DRAG_THRESHOLD;
    if (!far) return;
    show({ ...held, moved: true, x: e.clientX, y: e.clientY, over: targetAt(e.clientX, e.clientY) });
  };

  const endDrag = () => {
    const held = dragRef.current;
    if (!held) return;
    show(null);
    if (held.moved) {
      swallowClick.current = true;
      drop(held.line, held.over);
    }
  };

  /** The handlers every line carries, wherever it is drawn. */
  const grip = (line: number, from: number | "pool") => ({
    onPointerDown: (e: React.PointerEvent) => startDrag(line, from, e),
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: () => show(null),
  });

  const carried = drag?.moved ? drag.line : null;
  const complete = pool.length === 0;

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col gap-4">
      {/* What the program is for, before how to assemble it. Without the first
          sentence the puzzle can be done by the shape of the lines alone —
          this one opens a block, that one must sit inside it — and then it is
          a jigsaw rather than a reading exercise. */}
      <div className="text-center">
        <p className="font-medium text-gray-700">{t(question.purposeKey)}</p>
        <p className="mt-1 text-sm text-gray-500">
          {t(question.captionKey)} — {t(freeIndent ? "parsons.withIndent" : "parsons.plain")}
        </p>
      </div>

      {/* The program being built */}
      <div
        data-parsons-zone="program"
        className={`min-h-[5rem] rounded-xl border-2 border-dashed p-2 transition-colors ${
          drag?.moved && drag.over !== "pool" && drag.over != null
            ? "border-game-solid bg-game-100"
            : "border-game-200 bg-game-50"
        }`}
      >
        {order.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">{t("parsons.empty")}</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {order.map((line, position) => (
              <li
                key={position}
                data-parsons-slot={position}
                {...grip(line, position)}
                className={`flex touch-none items-center gap-1 rounded-lg border bg-white px-2 py-1 select-none ${
                  drag?.moved && drag.over === position
                    ? "border-game-solid ring-2 ring-game-200"
                    : "border-game-200"
                } ${carried === line ? "opacity-40" : ""} cursor-grab active:cursor-grabbing`}
              >
                {freeIndent && (
                  <>
                    <IconButton
                      label={t("parsons.outdent")}
                      onClick={() => setIndent(position, -1)}
                      disabled={indents[position] === 0}
                    >
                      ◀
                    </IconButton>
                    <IconButton
                      label={t("parsons.indent")}
                      onClick={() => setIndent(position, 1)}
                      disabled={indents[position] === MAX_INDENT}
                    >
                      ▶
                    </IconButton>
                  </>
                )}
                <code className="flex-1 overflow-x-auto whitespace-pre font-mono text-sm text-slate-800 sm:text-base">
                  {"    ".repeat(indents[position])}
                  <CodeLine text={question.lines[line]} />
                </code>
                <IconButton label={t("parsons.up")} onClick={() => move(position, -1)} disabled={position === 0}>
                  ↑
                </IconButton>
                <IconButton
                  label={t("parsons.down")}
                  onClick={() => move(position, 1)}
                  disabled={position === order.length - 1}
                >
                  ↓
                </IconButton>
                <IconButton label={t("parsons.back")} onClick={() => remove(position)}>
                  ✕
                </IconButton>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* The lines still waiting. Also where a line is dropped to take it back. */}
      <div
        data-parsons-zone="pool"
        className={`flex min-h-[3rem] flex-col gap-1 rounded-xl p-1 transition-colors ${
          drag?.moved && drag.over === "pool" ? "bg-gray-200" : ""
        }`}
      >
        {pool.map((line) => (
          <button
            key={line}
            {...grip(line, "pool")}
            onClick={() => {
              if (swallowClick.current) {
                swallowClick.current = false;
                return;
              }
              place(line);
            }}
            className={`touch-none overflow-x-auto rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-left font-mono text-sm whitespace-pre text-slate-800 transition-colors select-none hover:border-game-solid hover:bg-game-50 sm:text-base ${
              carried === line ? "opacity-40" : ""
            } cursor-grab active:cursor-grabbing`}
          >
            {!freeIndent && "    ".repeat(question.indents?.[line] ?? 0)}
            <CodeLine text={question.lines[line]} />
          </button>
        ))}
      </div>

      <StageActionBar>
        <GameButton
          onClick={() => complete && submit(JSON.stringify({ order, indents }))}
          disabled={!complete}
        >
          {t("game.submit")}
        </GameButton>
      </StageActionBar>

      {/* The line under the finger, deaf to the pointer so it never hides the
          row it is being carried to. */}
      {drag?.moved && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-game-solid bg-white px-3 py-2 font-mono text-sm whitespace-pre shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          <CodeLine text={question.lines[drag.line]} />
        </div>
      )}
    </div>
  );
}
