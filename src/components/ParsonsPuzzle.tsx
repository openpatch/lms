import { useRef, useState } from "react";
import { useAutoScroll } from "../lib/useAutoScroll";
import { usePointerDrag } from "../lib/usePointerDrag";
import { useTranslation } from "react-i18next";
import type { ParsonsQuestion } from "../../shared/parsons";
import type { StageProps } from "../lib/game-registry";
import GameButton from "./GameButton";
import { StageActionBar } from "./StageShell";

const MAX_INDENT = 3;

/** How far one indentation step is drawn, when the player sets it. */
const STEP_REM = 1.5;

/** How far a pointer travels before it is carrying a line rather than tapping
 *  one. A finger never comes down and up on the same pixel. */
const DRAG_THRESHOLD = 6;

/** A line in hand, and what the program would look like if it were let go. */
interface Drag {
  /** Which of the offered lines is being carried. */
  line: number;
  /** Where inside the line the pointer took hold, so it does not jump. */
  grabX: number;
  grabY: number;
  /** Where the drag began, which is what tells a drag from a tap. */
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * The program as it would be if released now. A line carried over the pool
   * is simply absent from it — which is what makes dragging one back out of
   * the program work without a second mechanism.
   */
  order: number[];
  indents: number[];
  /** Whether the pointer is over the pool, where letting go puts it back. */
  overPool: boolean;
  moved: boolean;
}

/** Whether a point is inside an element, for hit-testing a drop. */
function within(element: HTMLElement | null, x: number, y: number): boolean {
  if (!element) return false;
  const box = element.getBoundingClientRect();
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

/**
 * Where a finger takes hold of a line. The rest of a line is left to the
 * browser, so a swipe that starts on the program scrolls the page — the lines
 * fill the width, and taking every touch on them for a drag would leave a
 * phone nowhere to scroll from. A mouse still drags from anywhere.
 */
function Grip() {
  return (
    <span
      data-parsons-grip
      aria-hidden="true"
      className="flex w-6 shrink-0 cursor-grab touch-none items-center justify-center self-stretch text-gray-400 select-none"
    >
      ⠿
    </span>
  );
}

/** A touch or a pen: a pointer whose drag the browser would take for a scroll. */
function isFinger(e: React.PointerEvent): boolean {
  return e.pointerType === "touch" || e.pointerType === "pen";
}

interface Draft {
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

export default function ParsonsPuzzle({ question, ...rest }: ParsonsPuzzleProps) {
  if (!question) return null;
  // Keyed by the question, so a new puzzle starts with an empty program.
  return <Board key={question.id} question={question} {...rest} />;
}

function Board({
  question,
  submit,
  CodeLine,
}: ParsonsPuzzleProps & { question: ParsonsQuestion }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>({ order: [], indents: [] });
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
  const programRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const poolRef = useRef<HTMLDivElement>(null);

  const freeIndent = question.indents == null;
  const { order, indents } = draft;

  const update = (next: Partial<Draft>) => setDraft({ ...draft, ...next });

  /** The program as it stands, or as the drag in hand would leave it. */
  const shownOrder = drag?.moved ? drag.order : order;
  const shownIndents = drag?.moved ? drag.indents : indents;
  const pool = question.lines
    .map((_, index) => index)
    .filter((index) => !shownOrder.includes(index));

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

  /** One indentation step, in pixels, from whatever the root font size is. */
  const stepPixels = () =>
    STEP_REM * parseFloat(getComputedStyle(document.documentElement).fontSize || "16");

  /**
   * Where a placed line is drawn. With the indentation up to the player the row
   * itself moves right — shifted, not widened — so that dragging a line right
   * and the line sitting further right are the same thing. A fixed indentation
   * is only shown, as spaces in the code.
   */
  const shift = (indent: number): React.CSSProperties | undefined =>
    freeIndent
      ? { marginInlineStart: `${indent * STEP_REM}rem`, width: `calc(100% - ${indent * STEP_REM}rem)` }
      : undefined;

  /**
   * Picking a line up.
   *
   * Nothing is captured: the drag is followed on the window, which sees the
   * pointer wherever it goes — capture on a row is lost the moment React
   * replaces the row, and then the release never arrives and the line stays
   * stuck in hand.
   */
  const startDrag = (line: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // The arrows and the ✕ are buttons in their own right
    if (e.target instanceof Element && e.target.closest("button[aria-label]")) return;
    if (isFinger(e) && !(e.target instanceof Element && e.target.closest("[data-parsons-grip]"))) return;
    // A drag whose click never arrived must not eat the next one instead. The
    // click a drag produces lands before any new press, so clearing here can
    // only ever throw away a flag nobody is waiting on — and a line dragged out
    // of the pool leaves no button behind for its own click to land on.
    swallowClick.current = false;
    const box = e.currentTarget.getBoundingClientRect();
    show({
      line,
      grabX: e.clientX - box.left,
      grabY: e.clientY - box.top,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      width: box.width,
      height: box.height,
      order,
      indents,
      overPool: !order.includes(line),
      moved: false,
    });
  };

  const moveDrag = (e: Pick<PointerEvent, "clientX" | "clientY">) => {
    const held = dragRef.current;
    if (!held) return;
    const moved =
      held.moved ||
      Math.hypot(e.clientX - held.startX, e.clientY - held.startY) >= DRAG_THRESHOLD;
    if (!moved) return;

    // The program without the carried line.
    const at = order.indexOf(held.line);
    const without = order.filter((l) => l !== held.line);
    const keptIndents = indents.filter((_, i) => i !== at);

    /*
     * The pool is the only thing that takes a line back — not "anywhere outside
     * the program". Letting go a little below the last row is a near miss, not
     * a decision to discard the line.
     */
    const overPool = within(poolRef.current, e.clientX, e.clientY);
    let nextOrder = without;
    let nextIndents = keptIndents;
    if (!overPool) {
      // The line lands before the first row whose middle is below the pointer.
      // Measured on the rows themselves, so the gaps between them and the
      // program's padding all count as somewhere definite.
      const rows = [
        ...(programRef.current?.querySelectorAll<HTMLElement>("[data-parsons-line]") ?? []),
      ].filter((row) => Number(row.dataset.parsonsLine) !== held.line);
      let to = rows.length;
      for (let i = 0; i < rows.length; i++) {
        const box = rows[i].getBoundingClientRect();
        if (e.clientY < box.top + box.height / 2) {
          to = i;
          break;
        }
      }
      /*
       * How far right the line is dropped is how far it is indented. The
       * measurement is of the line's own left edge, not the pointer, so where
       * it was taken hold of does not change where it lands — and a line
       * carried straight up or down keeps the indent it had. Measured against
       * the list rather than the program's box, so its padding is not read as
       * an indentation the player did not make.
       */
      const origin = (listRef.current ?? programRef.current)?.getBoundingClientRect().left ?? 0;
      const indent = freeIndent
        ? Math.min(MAX_INDENT, Math.max(0, Math.round((e.clientX - held.grabX - origin) / stepPixels())))
        : (question.indents?.[held.line] ?? 0);
      nextOrder = [...without.slice(0, to), held.line, ...without.slice(to)];
      nextIndents = [...keptIndents.slice(0, to), indent, ...keptIndents.slice(to)];
    }

    show({
      ...held,
      x: e.clientX,
      y: e.clientY,
      order: nextOrder,
      indents: nextIndents,
      overPool,
      moved: true,
    });
  };

  const endDrag = () => {
    const held = dragRef.current;
    if (!held) return;
    show(null);
    if (!held.moved) return;
    swallowClick.current = true;
    // Committed once, on release: the answer is where the line was put down,
    // not every position it passed through.
    update({ order: held.order, indents: held.indents });
  };

  // A long program is taller than a phone. Held near the edge, a drag scrolls
  // the page, and where the line would land is measured again as the rows go
  // past a pointer that is holding still.
  const autoScroll = useAutoScroll(() => {
    const held = dragRef.current;
    if (held?.moved) moveDrag({ clientX: held.x, clientY: held.y });
  });

  usePointerDrag(
    (e) => {
      moveDrag(e);
      if (dragRef.current?.moved) autoScroll.follow(programRef.current, e.clientX, e.clientY);
    },
    () => {
      autoScroll.stop();
      endDrag();
    },
  );

  const carried = drag?.moved ? drag.line : null;
  const complete = pool.length === 0 && !drag?.moved;

  return (
    <div className="animate-question-in flex w-full max-w-xl flex-col gap-4">
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
        ref={programRef}
        className={`min-h-[5rem] rounded-xl border-2 border-dashed p-2 transition-colors ${
          drag?.moved && !drag.overPool
            ? "border-game-solid bg-game-100"
            : "border-game-200 bg-game-50"
        }`}
      >
        {shownOrder.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">{t("parsons.empty")}</p>
        ) : (
          <ol ref={listRef} className="flex flex-col gap-1">
            {shownOrder.map((line, position) =>
              carried === line ? (
                /* The hole the carried line would drop into, the size it left,
                   so the others move apart and the gap says where it lands. */
                <li
                  key={line}
                  data-parsons-line={line}
                  aria-hidden="true"
                  className="rounded-lg border-2 border-dashed border-game-solid bg-white/60"
                  style={{ ...shift(shownIndents[position]), height: drag?.height }}
                />
              ) : (
                /* Keyed by the line, not by where it sits: a line keeps its
                   element as the program is rearranged. */
                <li
                  key={line}
                  data-parsons-line={line}
                  onPointerDown={(e) => startDrag(line, e)}
                  style={shift(shownIndents[position])}
                  className="flex cursor-grab touch-manipulation items-center gap-1 rounded-lg border border-game-200 bg-white px-2 py-1 select-none active:cursor-grabbing"
                >
                  <Grip />
                  {freeIndent && (
                    <>
                      <IconButton
                        label={t("parsons.outdent")}
                        onClick={() => setIndent(position, -1)}
                        disabled={shownIndents[position] === 0}
                      >
                        ◀
                      </IconButton>
                      <IconButton
                        label={t("parsons.indent")}
                        onClick={() => setIndent(position, 1)}
                        disabled={shownIndents[position] === MAX_INDENT}
                      >
                        ▶
                      </IconButton>
                    </>
                  )}
                  <code className="flex-1 overflow-x-auto whitespace-pre font-mono text-sm text-slate-800 sm:text-base">
                    {!freeIndent && "    ".repeat(shownIndents[position])}
                    <CodeLine text={question.lines[line]} />
                  </code>
                  <IconButton label={t("parsons.up")} onClick={() => move(position, -1)} disabled={position === 0}>
                    ↑
                  </IconButton>
                  <IconButton
                    label={t("parsons.down")}
                    onClick={() => move(position, 1)}
                    disabled={position === shownOrder.length - 1}
                  >
                    ↓
                  </IconButton>
                  <IconButton label={t("parsons.back")} onClick={() => remove(position)}>
                    ✕
                  </IconButton>
                </li>
              ),
            )}
          </ol>
        )}
      </div>

      {/* The lines still waiting. Also where a line is dropped to take it back. */}
      <div
        ref={poolRef}
        className={`flex min-h-[3rem] flex-col gap-1 rounded-xl p-1 transition-colors ${
          drag?.moved && drag.overPool ? "bg-gray-200" : ""
        }`}
      >
        {pool.map((line) => (
          <button
            key={line}
            onPointerDown={(e) => startDrag(line, e)}
            onClick={() => {
              if (swallowClick.current) {
                swallowClick.current = false;
                return;
              }
              place(line);
            }}
            className={`flex touch-manipulation items-center gap-1 overflow-x-auto rounded-lg border-2 border-gray-200 bg-white px-1 py-2 text-left font-mono text-sm whitespace-pre text-slate-800 transition-colors select-none hover:border-game-solid hover:bg-game-50 sm:text-base ${
              carried === line ? "opacity-40" : ""
            } cursor-grab active:cursor-grabbing`}
          >
            <Grip />
            <span>
              {!freeIndent && "    ".repeat(question.indents?.[line] ?? 0)}
              <CodeLine text={question.lines[line]} />
            </span>
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

      {/* The line under the pointer, held where it was taken hold of. Fixed to
          the viewport and deaf to the pointer, so it neither drifts with a
          scrolling ancestor nor gets in the way of the rows it passes over. */}
      {drag?.moved && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed top-0 left-0 z-50 flex items-center gap-1 overflow-hidden rounded-lg border-2 bg-white px-1 font-mono text-sm whitespace-pre shadow-lg sm:text-base ${
            drag.overPool ? "border-dashed border-gray-400 opacity-60" : "border-game-solid"
          }`}
          style={{
            width: drag.width,
            height: drag.height,
            transform: `translate(${drag.x - drag.grabX}px, ${drag.y - drag.grabY}px)`,
          }}
        >
          <Grip />
          <CodeLine text={question.lines[drag.line]} />
        </div>
      )}
    </div>
  );
}
