import { useMemo, useRef } from "react";
import MathTex from "./Math";

export interface NumberLineMarker {
  value: number;
  /** KaTeX label shown in a chip above the line. Without one the marker is a plain pointer. */
  latex?: string;
  /** Highlights the marker, e.g. while its value is being changed. */
  active?: boolean;
  /** Makes the marker clickable; the click does not reach the line below. */
  onClick?: () => void;
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
  /** Called with the clicked value. Without it the line is inert. */
  onPick?: (value: number) => void;
  disabled?: boolean;
  /** Decimals a picked value is rounded to. Defaults to 3. */
  precision?: number;
  /** Height of the line. Tailwind class, e.g. "h-16". */
  heightClass?: string;
}

/** At most this many labelled ticks fit next to each other. */
const MAX_LABELS = 12;

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
  onPick,
  disabled = false,
  precision = 3,
  heightClass = "h-20",
}: NumberLineProps) {
  const lineRef = useRef<HTMLDivElement>(null);
  const span = max - min;

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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onPick || disabled || !lineRef.current || span <= 0) return;
    const rect = lineRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const factor = 10 ** precision;
    onPick(Math.round((min + ratio * span) * factor) / factor);
  };

  const pickable = Boolean(onPick) && !disabled;

  return (
    <div className="w-full">
      <div
        ref={lineRef}
        onClick={handleClick}
        className={`relative ${heightClass} bg-gray-100 rounded-lg border-2 transition-colors ${
          pickable
            ? "border-brand-400 cursor-crosshair hover:border-brand-500"
            : "border-gray-300 cursor-default"
        }`}
      >
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

        {markers.map((marker, index) =>
          marker.latex == null ? (
            <div
              key={index}
              className="absolute -top-3 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-brand-500 animate-marker-drop"
              style={{ left: `${percent(marker.value)}%`, transform: "translateX(-50%)" }}
            />
          ) : (
            <button
              key={index}
              onClick={(e) => {
                if (!marker.onClick) return;
                e.stopPropagation();
                marker.onClick();
              }}
              className="absolute -top-2 flex flex-col items-center animate-marker-drop"
              style={{ left: `${percent(marker.value)}%`, transform: "translateX(-50%)" }}
            >
              <span
                className={`px-2 py-0.5 rounded-md text-white text-sm ${
                  marker.active ? "bg-brand-600" : "bg-brand-500"
                }`}
              >
                <MathTex tex={marker.latex} />
              </span>
              <span className="w-0.5 h-16 bg-brand-500" />
            </button>
          ),
        )}
      </div>
      {/* Room for the tick labels below the line */}
      <div className="h-6" />
    </div>
  );
}
