import { useRef, useState, useEffect } from "react";

export interface Point {
  x: number;
  y: number;
}

interface DrawCanvasProps {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Optional reference function to render as a dashed curve (round 3) */
  referenceFn?: (x: number) => number;
  /** Optional solution function to render as a solid colored curve (reveal phase) */
  solutionFn?: (x: number) => number;
  /** Disable drawing (used during reveal phase) */
  readOnly?: boolean;
  /** Called whenever the drawn strokes change */
  onPointsChange?: (points: Point[]) => void;
  /** External clear signal — increments to trigger a clear */
  clearSignal?: number;
}

const CANVAS_W = 600;
const CANVAS_H = 450;
const PADDING = 44;

export default function DrawCanvas({
  xMin,
  xMax,
  yMin,
  yMax,
  referenceFn,
  solutionFn,
  readOnly = false,
  onPointsChange,
  clearSignal,
}: DrawCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

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

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly) return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    const pt = getPointerPos(e);
    setIsDrawing(true);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const pt = getPointerPos(e);
    setCurrentStroke((prev) => [...prev, pt]);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    svgRef.current?.releasePointerCapture(e.pointerId);
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      onPointsChange?.(newStrokes.flat());
    }
    setCurrentStroke([]);
  };

  // Generate reference curve points
  const referencePoints: string[] = [];
  if (referenceFn) {
    for (let i = 0; i <= 100; i++) {
      const x = xMin + ((xMax - xMin) * i) / 100;
      const y = referenceFn(x);
      if (!isNaN(y) && isFinite(y)) {
        referencePoints.push(`${toPixelX(x)},${toPixelY(y)}`);
      }
    }
  }

  // Generate solution curve points
  const solutionPoints: string[] = [];
  if (solutionFn) {
    for (let i = 0; i <= 100; i++) {
      const x = xMin + ((xMax - xMin) * i) / 100;
      const y = solutionFn(x);
      if (!isNaN(y) && isFinite(y)) {
        solutionPoints.push(`${toPixelX(x)},${toPixelY(y)}`);
      }
    }
  }

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
    setStrokes([]);
    setCurrentStroke([]);
    onPointsChange?.([]);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className={`w-full max-w-2xl touch-none bg-white border-2 border-gray-300 rounded-lg select-none ${readOnly ? "" : "cursor-crosshair"}`}
        style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Grid lines */}
        {xTicks.map((x) => {
          const px = toPixelX(x);
          const isAxis = Math.abs(x) < 1e-9;
          return (
            <g key={`x${x}`}>
              <line
                x1={px} y1={PADDING} x2={px} y2={PADDING + plotH}
                stroke={isAxis ? "#6b7280" : "#e5e7eb"}
                strokeWidth={isAxis ? 1.5 : 1}
              />
              <text x={px} y={PADDING + plotH + 14} textAnchor="middle" fontSize="10" fill="#9ca3af">
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
                strokeWidth={isAxis ? 1.5 : 1}
              />
              <text x={PADDING - 6} y={py + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                {formatTick(y)}
              </text>
            </g>
          );
        })}

        {/* Reference function (dashed) */}
        {referencePoints.length > 1 && (
          <polyline
            points={referencePoints.join(" ")}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        )}

        {/* Solution function (solid, shown during reveal) */}
        {solutionPoints.length > 1 && (
          <polyline
            points={solutionPoints.join(" ")}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Drawn strokes */}
        {allDrawnPaths.map((stroke, i) => {
          if (stroke.length < 2) return null;
          const pts = stroke.map((p) => `${toPixelX(p.x)},${toPixelY(p.y)}`).join(" ");
          return (
            <polyline
              key={i}
              points={pts}
              fill="none"
              stroke={readOnly ? "#6b7280" : "#1c8472"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      <button
        onClick={handleClear}
        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:border-brand-400 hover:text-brand-600 transition-colors"
      >
        Clear
      </button>
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
