import { useId, useRef, useState, useEffect } from "react";

export interface Point {
  x: number;
  y: number;
}

/** How a curve is drawn: the given function (dashed), a solution, the player's
 *  own line, or that line once it is only being looked at. */
export type CurveStyle = "reference" | "solution" | "accent" | "muted";

export interface PlotCurve {
  fn: (x: number) => number;
  style: CurveStyle;
}

/** A dot on the plot, e.g. the point a slider currently picks out. */
export interface PlotMarker {
  x: number;
  y: number;
  label?: string;
}

/** A curve that is already sampled — a spline through the player's points, say. */
export interface PlotPath {
  points: Point[];
  style?: CurveStyle;
}

export interface PlotCanvasProps {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Curves drawn under whatever the player adds. */
  curves?: PlotCurve[];
  /** Curves the stage has sampled itself. */
  paths?: PlotPath[];
  markers?: PlotMarker[];
  /** Points the player can drag around. With handles the plot is not drawn on. */
  handles?: Point[];
  onHandlesChange?: (handles: Point[]) => void;
  /** Set to let a tap on empty space add a point … */
  onHandleAdd?: (point: Point) => void;
  /** … and a tap on a point take it away again. */
  onHandleRemove?: (index: number) => void;
  /** Lets the player draw a curve. Without it the plot is read-only. */
  onPointsChange?: (points: Point[]) => void;
  /** Blocks drawing, e.g. while the solution is on screen. */
  readOnly?: boolean;
  /** Increments to wipe what was drawn. */
  clearSignal?: number;
  /** Label of the clear button; without one no button is shown. */
  clearLabel?: string;
  /** Vertical room (in rem) the rest of the stage needs. The plot sizes itself
   *  from what is left of the viewport height. */
  reserveRem?: number;
  /** Smallest height (in rem) the plot may shrink to. */
  minHeightRem?: number;
}

// The SVG user space. 3:2 uses a landscape screen better than 4:3 and keeps the
// plot from growing taller than a tablet can show.
const CANVAS_W = 900;
const CANVAS_H = 600;
const PADDING = 56;
/** How much vertical room the rest of the stage needs — prompt, buttons, page
 *  padding. The plot takes what is left, so the whole stage fits on screen
 *  without scrolling. Stages with more around the plot pass a larger value. */
const DEFAULT_RESERVE_REM = 31;
/** … but never below this, even if that means scrolling on a short window:
 *  a plot too small to draw on helps nobody. */
const MIN_HEIGHT_REM = 22;
/** … and never grow it beyond a comfortable reading width. */
const MAX_WIDTH_REM = 60;

/** iPadOS grows the viewport behind the toolbars, so `svh` (the small viewport,
 *  toolbars visible) keeps the plot from hiding the buttons under them. */
const VIEWPORT_UNIT =
  typeof CSS !== "undefined" && CSS.supports?.("height: 1svh") ? "svh" : "vh";
/** Samples per curve. */
const CURVE_SAMPLES = 160;
/** How close a finger has to get to grab a handle, in pixels of user space. */
const HANDLE_GRAB_PX = 40;
/** A press that stays within this counts as a tap, not a drag. */
const TAP_SLOP_PX = 8;

const CURVE_COLORS: Record<CurveStyle, string> = {
  reference: "#9ca3af",
  solution: "#2563eb",
  accent: "#1c8472",
  muted: "#6b7280",
};

/**
 * The shared coordinate system: a grid with curves, markers and — when the
 * stage wants it — a curve the player draws with the mouse or a finger.
 */
export default function PlotCanvas({
  xMin,
  xMax,
  yMin,
  yMax,
  curves = [],
  paths = [],
  markers = [],
  handles,
  onHandlesChange,
  onHandleAdd,
  onHandleRemove,
  readOnly = false,
  onPointsChange,
  clearSignal,
  clearLabel,
  reserveRem = DEFAULT_RESERVE_REM,
  minHeightRem = MIN_HEIGHT_REM,
}: PlotCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  // The pointer that started the stroke — a second finger (or a palm next to an
  // Apple Pencil) is ignored until it is lifted.
  const activePointer = useRef<number | null>(null);
  const clipId = useId();

  // Clear when clearSignal changes
  useEffect(() => {
    if (clearSignal !== undefined && clearSignal > 0) {
      setStrokes([]);
      setCurrentStroke([]);
      onPointsChange?.([]);
    }
  }, [clearSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const plotW = CANVAS_W - PADDING * 2;
  const plotH = CANVAS_H - PADDING * 2;

  const toPixelX = (x: number) => PADDING + ((x - xMin) / (xMax - xMin)) * plotW;
  const toPixelY = (y: number) => PADDING + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
  const toMathX = (px: number) => xMin + ((px - PADDING) / plotW) * (xMax - xMin);
  const toMathY = (py: number) => yMin + ((PADDING + plotH - py) / plotH) * (yMax - yMin);

  const getPointerPos = (e: React.PointerEvent<SVGSVGElement>): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const localPt = pt.matrixTransform(ctm.inverse());
    let px = localPt.x;
    let py = localPt.y;
    // Clamp to plot area
    px = Math.max(PADDING, Math.min(CANVAS_W - PADDING, px));
    py = Math.max(PADDING, Math.min(CANVAS_H - PADDING, py));
    return { x: toMathX(px), y: toMathY(py) };
  };

  const draggable = Boolean(handles && onHandlesChange) && !readOnly;
  const drawable = Boolean(onPointsChange) && !readOnly && !draggable;
  // Which handle the active pointer grabbed, and whether it has moved since —
  // a press that does not move is a tap, which adds or removes a point.
  const draggedHandle = useRef<number | null>(null);
  const pressStart = useRef<Point | null>(null);
  const pressMoved = useRef(false);

  /** The handle under a point, if one is within thumb's reach. */
  const handleAt = (point: Point): number | null => {
    if (!handles) return null;
    let best: number | null = null;
    let bestDistance = HANDLE_GRAB_PX;
    handles.forEach((handle, index) => {
      // Measured in user-space pixels, so the reach is round, not oval
      const dx = (handle.x - point.x) / ((xMax - xMin) / plotW);
      const dy = (handle.y - point.y) / ((yMax - yMin) / plotH);
      const distance = Math.hypot(dx, dy);
      if (distance <= bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    return best;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== null) return;

    if (draggable) {
      const point = getPointerPos(e);
      const grabbed = handleAt(point);
      // An empty spot is only worth capturing when a tap there does something
      if (grabbed == null && !onHandleAdd) return;
      e.preventDefault();
      activePointer.current = e.pointerId;
      draggedHandle.current = grabbed;
      pressStart.current = point;
      pressMoved.current = false;
      svgRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    if (!drawable) return;
    e.preventDefault();
    activePointer.current = e.pointerId;
    svgRef.current?.setPointerCapture(e.pointerId);
    const pt = getPointerPos(e);
    setIsDrawing(true);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerId !== activePointer.current) return;

    if (draggable) {
      e.preventDefault();
      const pt = getPointerPos(e);
      const start = pressStart.current;
      if (start && !pressMoved.current) {
        const dx = (pt.x - start.x) / ((xMax - xMin) / plotW);
        const dy = (pt.y - start.y) / ((yMax - yMin) / plotH);
        if (Math.hypot(dx, dy) > TAP_SLOP_PX) pressMoved.current = true;
      }
      const index = draggedHandle.current;
      if (index == null || !handles || !pressMoved.current) return;
      onHandlesChange?.(handles.map((handle, i) => (i === index ? pt : handle)));
      return;
    }

    if (!isDrawing || !drawable) return;
    e.preventDefault();
    const pt = getPointerPos(e);
    setCurrentStroke((prev) => [...prev, pt]);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerId !== activePointer.current) return;

    if (draggable) {
      if (svgRef.current?.hasPointerCapture(e.pointerId)) {
        svgRef.current.releasePointerCapture(e.pointerId);
      }
      // A press that never moved is a tap: on a point it removes it, on empty
      // space it adds one.
      if (!pressMoved.current && e.type !== "pointercancel") {
        const index = draggedHandle.current;
        if (index != null) onHandleRemove?.(index);
        else if (pressStart.current) onHandleAdd?.(pressStart.current);
      }
      activePointer.current = null;
      draggedHandle.current = null;
      pressStart.current = null;
      pressMoved.current = false;
      return;
    }

    if (!isDrawing) return;
    e.preventDefault();
    if (svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    activePointer.current = null;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      onPointsChange?.(newStrokes.flat());
    }
    setCurrentStroke([]);
  };

  // Sample every curve across the plot; points outside the window are dropped
  // so a steep function does not stretch the picture.
  const curvePoints = curves.map(({ fn, style }) => {
    const points: string[] = [];
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      const x = xMin + ((xMax - xMin) * i) / CURVE_SAMPLES;
      const y = fn(x);
      if (!isNaN(y) && isFinite(y)) points.push(`${toPixelX(x)},${toPixelY(y)}`);
    }
    return { points, style };
  });

  // Grid lines
  const xStep = niceStep(xMax - xMin);
  const yStep = niceStep(yMax - yMin);
  const xTicks: number[] = [];
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) {
    xTicks.push(Math.round(x * 100) / 100);
  }
  const yTicks: number[] = [];
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) {
    yTicks.push(Math.round(y * 100) / 100);
  }

  const allDrawnPaths = [...strokes];
  if (currentStroke.length > 1) allDrawnPaths.push(currentStroke);

  const handleClear = () => {
    activePointer.current = null;
    setIsDrawing(false);
    setStrokes([]);
    setCurrentStroke([]);
    onPointsChange?.([]);
  };

  return (
    <div className="flex flex-col items-center w-full gap-3">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className={`w-full touch-none bg-white border-2 border-gray-300 rounded-lg select-none ${
          drawable ? "cursor-crosshair" : draggable ? "cursor-grab" : ""
        }`}
        style={{
          aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
          // Whichever binds first: the column, a sensible maximum, or the height
          // a tablet has left once the rest of the stage is on screen.
          maxWidth: `min(${MAX_WIDTH_REM}rem, max(${minHeightRem}rem, 100${VIEWPORT_UNIT} - ${reserveRem}rem) * ${CANVAS_W} / ${CANVAS_H})`,
          // iPadOS otherwise offers a text selection callout on a long press
          WebkitTouchCallout: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Everything the stage draws stays inside the axes box */}
        <defs>
          <clipPath id={clipId}>
            <rect x={PADDING} y={PADDING} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {xTicks.map((x) => {
          const px = toPixelX(x);
          const isAxis = Math.abs(x) < 1e-9;
          return (
            <g key={`x${x}`}>
              <line
                x1={px} y1={PADDING} x2={px} y2={PADDING + plotH}
                stroke={isAxis ? "#6b7280" : "#e5e7eb"}
                strokeWidth={isAxis ? 2 : 1.5}
              />
              <text x={px} y={PADDING + plotH + 22} textAnchor="middle" fontSize="15" fill="#9ca3af">
                {formatTick(x)}
              </text>
            </g>
          );
        })}
        {yTicks.map((y) => {
          const py = toPixelY(y);
          const isAxis = Math.abs(y) < 1e-9;
          return (
            <g key={`y${y}`}>
              <line
                x1={PADDING} y1={py} x2={PADDING + plotW} y2={py}
                stroke={isAxis ? "#6b7280" : "#e5e7eb"}
                strokeWidth={isAxis ? 2 : 1.5}
              />
              <text x={PADDING - 10} y={py + 5} textAnchor="end" fontSize="15" fill="#9ca3af">
                {formatTick(y)}
              </text>
            </g>
          );
        })}

        {/* Given curves: dashed for a reference, solid for a solution */}
        <g clipPath={`url(#${clipId})`}>
        {curvePoints.map(({ points, style }, index) =>
          points.length < 2 ? null : (
            <polyline
              key={index}
              points={points.join(" ")}
              fill="none"
              stroke={CURVE_COLORS[style]}
              strokeWidth={style === "reference" ? 3 : 4}
              strokeDasharray={style === "reference" ? "9 6" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}

          {paths.map(({ points, style = "accent" }, index) =>
            points.length < 2 ? null : (
              <polyline
                key={`path-${index}`}
                points={points.map((p) => `${toPixelX(p.x)},${toPixelY(p.y)}`).join(" ")}
                fill="none"
                stroke={CURVE_COLORS[style]}
                strokeWidth={style === "reference" ? 3 : 4}
                strokeDasharray={style === "reference" ? "9 6" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
          )}
        </g>

        {handles?.map((handle, index) => (
          <g key={`handle-${index}`}>
            {/* A generous, invisible target so a finger can grab the point */}
            <circle
              cx={toPixelX(handle.x)}
              cy={toPixelY(handle.y)}
              r={HANDLE_GRAB_PX}
              fill="transparent"
            />
            <circle
              cx={toPixelX(handle.x)}
              cy={toPixelY(handle.y)}
              r="11"
              fill="#ffffff"
              stroke="#1c8472"
              strokeWidth="4"
            />
          </g>
        ))}

        {markers.map((marker, index) => (
          <g key={`marker-${index}`}>
            <circle cx={toPixelX(marker.x)} cy={toPixelY(marker.y)} r="9" fill="#1c8472" />
            {marker.label && (
              <text
                x={toPixelX(marker.x)}
                y={toPixelY(marker.y) - 18}
                textAnchor="middle"
                fontSize="17"
                fontWeight="600"
                fill="#1c8472"
              >
                {marker.label}
              </text>
            )}
          </g>
        ))}

        {/* Drawn strokes */}
        <g clipPath={`url(#${clipId})`}>
        {allDrawnPaths.map((stroke, i) => {
          if (stroke.length < 2) return null;
          const pts = stroke.map((p) => `${toPixelX(p.x)},${toPixelY(p.y)}`).join(" ");
          return (
            <polyline
              key={i}
              points={pts}
              fill="none"
              stroke={readOnly ? "#6b7280" : "#1c8472"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
        </g>
      </svg>

      {clearLabel && drawable && (
        <button
          onClick={handleClear}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:border-brand-400 hover:text-brand-600 transition-colors"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}

function niceStep(range: number): number {
  const rough = range / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  let step: number;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * pow;
}

function formatTick(v: number): string {
  if (Math.abs(v) < 1e-9) return "0";
  if (Math.abs(v) < 0.01) return v.toExponential(1);
  return String(Math.round(v * 100) / 100);
}
