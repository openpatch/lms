import { useMemo, useRef, useState } from "react";
import MathTex from "./Math";

/**
 * What a mark on the line means: the game's own accent, the right answer, one
 * answer among many, or the answer of whoever is reading.
 */
export type MarkerTone = "accent" | "correct" | "given" | "mine";

export interface NumberLineMarker {
  value: number;
  /** KaTeX label shown in a chip above the line. Without one the marker is a plain pointer. */
  latex?: string;
  /** Highlights the marker, e.g. while its value is being changed. */
  active?: boolean;
  /**
   * Draws the mark as a tally standing on the axis instead of a pointer above
   * the line. That is what a value someone *placed* looks like, and it leaves
   * the space above the line free for the pointer that says where the value
   * really is — the two never sit on top of each other, however close the
   * guess was. A class's answers read as a cloud of tallies around it.
   */
  tally?: boolean;
  /** Whose mark this is. Defaults to the accent. A "mine" mark is drawn
   *  louder than the rest — see the tone table. */
  tone?: MarkerTone;
  /** Makes the marker clickable; the click does not reach the line below. */
  onClick?: () => void;
  /**
   * Makes the marker draggable along the line, called with the value it is
   * being dragged over — continuously, so the mark follows the finger. A drag
   * never turns into a click, so a marker can carry both.
   */
  onDrag?: (value: number) => void;
}

/**
 * A stretch of the line rather than a point on it: the interval a bisection
 * trapped a root in, say. Several drawn over each other pile up, so a class's
 * intervals darken where they agree.
 */
export interface NumberLineBand {
  min: number;
  max: number;
  tone?: MarkerTone;
}

export interface NumberLineProps {
  min: number;
  max: number;
  /** Distance between labelled ticks. Defaults to 1, widened automatically
   *  (1, 2, 5, 10, …) when that would crowd the line with labels. */
  majorStep?: number;
  /** Distance between unlabelled guide ticks. Omit for none. */
  minorStep?: number;
  markers?: NumberLineMarker[];
  /** Spans of the line to shade, drawn behind the ticks and marks. */
  bands?: NumberLineBand[];
  /** Called with the clicked value. Without it the line is inert. */
  onPick?: (value: number) => void;
  /** Stops the line being *picked* on. Marks stay draggable: a stage turns
   *  picking off once everything is placed, which is the moment a player wants
   *  to take hold of a mark and tidy it up. */
  disabled?: boolean;
  /** Decimals a picked value is rounded to. Defaults to 3. */
  precision?: number;
  /** Height of the line. Tailwind class, e.g. "h-16". */
  heightClass?: string;
}

const TONES: Record<
  MarkerTone,
  { bar: string; pointer: string; chip: string; chipActive: string; band: string }
> = {
  accent: {
    bar: "bg-game-solid",
    pointer: "border-t-game-solid",
    chip: "bg-game-solid",
    chipActive: "bg-game-solid-hover",
    band: "bg-game-solid/20",
  },
  correct: {
    bar: "bg-emerald-500",
    pointer: "border-t-emerald-500",
    chip: "bg-emerald-500",
    chipActive: "bg-emerald-600",
    band: "bg-emerald-500/20",
  },
  given: {
    bar: "bg-gray-400",
    pointer: "border-t-gray-400",
    chip: "bg-gray-400",
    chipActive: "bg-gray-500",
    // Fainter than the others: these come by the classful and pile up.
    band: "bg-gray-500/15",
  },
  // The reader's own answer. Same accent it was placed in, so the review line
  // looks like the line it was played on — the difference is the weight, which
  // `tally` below gives it. A review line already carries the start state and
  // the right answer, and a hairline among those reads as scenery rather than
  // as "this is what you said".
  mine: {
    bar: "bg-game-solid",
    pointer: "border-t-game-solid",
    chip: "bg-game-solid",
    chipActive: "bg-game-solid-hover",
    band: "bg-game-solid/20",
  },
};

/** At most this many labelled ticks fit next to each other. */
const MAX_LABELS = 12;

/**
 * How far a pointer has to travel before it counts as dragging a mark rather
 * than tapping it. A finger never comes down and up on exactly one pixel, and
 * without this every tap would nudge the mark it was meant to pick up.
 */
const DRAG_THRESHOLD = 4;

/** Widens `step` by 1, 2, 5, 10 … until the line carries readable labels. */
function labelStep(span: number, step: number): number {
  for (const factor of [1, 2, 5, 10, 20, 50, 100]) {
    if (span / (step * factor) <= MAX_LABELS) return step * factor;
  }
  return step;
}

/**
 * The shared number line: ticks, click-to-pick and markers.
 * Used wherever a value has to be read off or placed on an axis — placing
 * rational numbers, estimating a root, following a change.
 */
export default function NumberLine({
  min,
  max,
  majorStep = 1,
  minorStep,
  markers = [],
  bands = [],
  onPick,
  disabled = false,
  precision = 3,
  heightClass = "h-20",
}: NumberLineProps) {
  const lineRef = useRef<HTMLDivElement>(null);
  const span = max - min;
  /** Which marker is being dragged, so its chip can show it is in hand. */
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /** Where the pointer went down, and whether it has since passed the
   *  threshold. Held in a ref: a drag must not re-render on every pixel. */
  const drag = useRef<{ startX: number; moved: boolean } | null>(null);
  /** Set when a drag ends, so the click it produces does not also place the
   *  selected number where the finger happened to let go. */
  const swallowClick = useRef(false);

  const ticks = useMemo(() => {
    const major: number[] = [];
    if (majorStep > 0) {
      const step = labelStep(max - min, majorStep);
      const first = Math.ceil(min / step) * step;
      for (let v = first; v <= max + 1e-9; v += step) {
        major.push(Math.round(v * 1e6) / 1e6);
      }
    }
    const minor: number[] = [];
    if (minorStep && minorStep > 0) {
      const first = Math.ceil(min / minorStep) * minorStep;
      for (let v = first; v <= max + 1e-9; v += minorStep) {
        const rounded = Math.round(v * 1e6) / 1e6;
        // A guide tick under a labelled one would only smudge it
        if (!major.some((m) => Math.abs(m - rounded) < 1e-9)) minor.push(rounded);
      }
    }
    return { major, minor };
  }, [min, max, majorStep, minorStep]);

  const percent = (value: number) => ((value - min) / span) * 100;

  /** The value the line carries under this screen x, clamped to its ends. */
  const valueAt = (clientX: number): number | null => {
    if (!lineRef.current || span <= 0) return null;
    const rect = lineRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const factor = 10 ** precision;
    return Math.round((min + ratio * span) * factor) / factor;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    if (!onPick || disabled) return;
    const value = valueAt(e.clientX);
    if (value != null) onPick(value);
  };

  const pickable = Boolean(onPick) && !disabled;

  /**
   * Picking a mark up.
   *
   * Pointer events rather than mouse or touch ones, so the finger on a tablet,
   * the mouse on the projector laptop and a stylus all take the same path — and
   * capture, so a mark that is dragged faster than the browser repaints does
   * not get dropped the moment the pointer leaves the chip.
   */
  const startDrag = (marker: NumberLineMarker, index: number, e: React.PointerEvent) => {
    if (!marker.onDrag || span <= 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, moved: false };
    setDragIndex(index);
  };

  const moveDrag = (marker: NumberLineMarker, e: React.PointerEvent) => {
    const state = drag.current;
    if (!state || !marker.onDrag) return;
    // Under the threshold this is still a tap that has not finished happening
    if (!state.moved && Math.abs(e.clientX - state.startX) < DRAG_THRESHOLD) return;
    state.moved = true;
    const value = valueAt(e.clientX);
    if (value != null) marker.onDrag(value);
  };

  const endDrag = (e: React.PointerEvent) => {
    const state = drag.current;
    drag.current = null;
    setDragIndex(null);
    if (!state) return;
    e.stopPropagation();
    // Letting go fires a click on the line underneath, which would place the
    // number the player is holding wherever they let go of a different one.
    if (state.moved) swallowClick.current = true;
  };

  /** A drag the system took away — a phone call, a gesture the browser claimed.
   *  No click follows one of these, so nothing is left waiting to be swallowed. */
  const cancelDrag = () => {
    drag.current = null;
    setDragIndex(null);
  };

  return (
    <div className="w-full">
      <div
        ref={lineRef}
        onClick={handleClick}
        // A drag whose click never arrived must not eat the next one instead
        onPointerDown={() => {
          swallowClick.current = false;
        }}
        className={`relative ${heightClass} bg-gray-100 rounded-lg border-2 transition-colors ${
          pickable
            ? "border-game-300 cursor-crosshair hover:border-game-solid"
            : "border-gray-300 cursor-default"
        }`}
      >
        {bands.map((band, index) => {
          const from = Math.max(min, Math.min(band.min, band.max));
          const to = Math.min(max, Math.max(band.min, band.max));
          if (!(to > from)) return null;
          return (
            <div
              key={`band-${index}`}
              className={`absolute inset-y-0 ${TONES[band.tone ?? "accent"].band}`}
              style={{ left: `${percent(from)}%`, width: `${((to - from) / span) * 100}%` }}
            />
          );
        })}
        {ticks.minor.map((tick) => (
          <div
            key={`minor-${tick}`}
            className="absolute top-1/3 bottom-1/3 w-px bg-gray-300"
            style={{ left: `${percent(tick)}%` }}
          />
        ))}
        {ticks.major.map((tick) => (
          <div
            key={`major-${tick}`}
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${percent(tick)}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-0.5 h-full bg-gray-400" />
            <span className="absolute bottom-0 translate-y-full pt-1 text-sm font-medium text-gray-500">
              {tick}
            </span>
          </div>
        ))}

        {markers.map((marker, index) => {
          // A value off the end of the line gets no mark: a typed answer can be
          // anything, and pinning it to the edge would draw a guess nobody made.
          // The row says what was answered in words beside the line anyway.
          if (!(marker.value >= min && marker.value <= max)) return null;
          const tone = TONES[marker.tone ?? "accent"];
          const left = `${percent(marker.value)}%`;

          if (marker.tally) {
            // The reader's own mark stands taller than the line and carries a
            // head, so it is the first thing found among the class's tallies
            // and the pale start state — and stays findable when it lands on
            // the right answer, where the two marks sit on the same spot.
            if (marker.tone === "mine") {
              return (
                <div
                  key={index}
                  className="absolute -top-2 -bottom-1 flex flex-col items-center animate-marker-drop"
                  style={{ left, transform: "translateX(-50%)" }}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tone.bar}`} />
                  <span className={`w-1.5 flex-1 rounded-full ${tone.bar}`} />
                </div>
              );
            }
            return (
              <div
                key={index}
                className={`absolute top-1 bottom-1 w-0.5 rounded-full animate-marker-drop ${tone.bar}`}
                style={{ left, transform: "translateX(-50%)" }}
              />
            );
          }

          if (marker.latex == null) {
            return (
              <div
                key={index}
                className={`absolute -top-3 w-0 h-0 border-x-8 border-x-transparent border-t-8 animate-marker-drop ${tone.pointer}`}
                style={{ left, transform: "translateX(-50%)" }}
              />
            );
          }

          const draggable = Boolean(marker.onDrag);
          const inHand = dragIndex === index;

          return (
            <button
              key={index}
              onClick={(e) => {
                if (!marker.onClick) return;
                e.stopPropagation();
                marker.onClick();
              }}
              onPointerDown={draggable ? (e) => startDrag(marker, index, e) : undefined}
              onPointerMove={draggable ? (e) => moveDrag(marker, e) : undefined}
              onPointerUp={draggable ? endDrag : undefined}
              onPointerCancel={draggable ? cancelDrag : undefined}
              // The drop animation stays on through a drag. It runs once when
              // the mark is first hung on the line and moving it does not
              // replay it — taking the class off for the drag and putting it
              // back is what would, so the mark would fall from the sky every
              // time it was let go of.
              className={`absolute -top-2 flex flex-col items-center animate-marker-drop ${
                draggable
                  ? // A chip is a thumb's width at most, so the grab area is
                    // widened around it without widening the mark itself, and
                    // the browser is told not to scroll the page instead.
                    "px-3 touch-none select-none cursor-grab active:cursor-grabbing"
                  : ""
              }`}
              style={{ left, transform: "translateX(-50%)" }}
            >
              <span
                className={`px-2 py-0.5 rounded-md text-white text-sm transition-transform ${
                  marker.active || inHand ? tone.chipActive : tone.chip
                } ${inHand ? "scale-110" : ""}`}
              >
                <MathTex tex={marker.latex} />
              </span>
              <span className={`w-0.5 h-16 ${tone.bar}`} />
            </button>
          );
        })}
      </div>
      {/* Room for the tick labels below the line */}
      <div className="h-6" />
    </div>
  );
}
