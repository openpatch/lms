// The Oshima spline: a smooth curve through a set of points, drawn as cubic
// Bézier segments.
//
// Setsuo Takato and José A. Vallejo, "Using Oshima splines to produce accurate
// numerical results and high quality graphical output", Math. Comput. Sci. 14
// (2020) 399–413 (arXiv:1905.04664), section 2. It is used the same way here as
// in Chieko Komoda, "Automatic Grading of Online Graph Plotting Problems"
// (ACA 2025): the student places a handful of points, the curve follows.
//
// For a segment from P_j to P_{j+1}, the Bézier control points are
//   Q_j     = P_j     + c · (P_{j+1} - P_{j-1})
//   R_j     = P_{j+1} + c · (P_j     - P_{j+2})
// with
//   c = 4·|P_j P_{j+1}| / (3·(|P_{j-1} P_{j+1}| + |P_j P_{j+2}|))
//       · 1 / (1 + sqrt((1 + cos θ) / 2))
// where θ is the angle between P_{j-1}P_{j+1} and P_jP_{j+2}. For evenly spaced
// points on a straight line this gives c = 1/6, the Catmull-Rom coefficient.

export interface SplinePoint {
  x: number;
  y: number;
}

/** Catmull-Rom's constant, and the value Oshima's coefficient falls back to. */
const CATMULL_ROM_C = 1 / 6;

function subtract(a: SplinePoint, b: SplinePoint): SplinePoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

function norm(v: SplinePoint): number {
  return Math.hypot(v.x, v.y);
}

/** Oshima's coefficient for the segment from `points[j]` to `points[j + 1]`. */
function coefficient(
  previous: SplinePoint,
  from: SplinePoint,
  to: SplinePoint,
  next: SplinePoint,
): number {
  const span = subtract(to, from);
  const before = subtract(to, previous);
  const after = subtract(next, from);

  const lengths = norm(before) + norm(after);
  if (lengths < 1e-12 || norm(span) < 1e-12) return CATMULL_ROM_C;

  const cosTheta =
    (before.x * after.x + before.y * after.y) / (norm(before) * norm(after) || 1);
  // Clamped because rounding can push the cosine just outside [-1, 1]
  const half = Math.sqrt(Math.max(0, (1 + Math.min(1, Math.max(-1, cosTheta))) / 2));

  return ((4 * norm(span)) / (3 * lengths)) * (1 / (1 + half));
}

/** The four points of one cubic Bézier segment. */
export interface BezierSegment {
  from: SplinePoint;
  control1: SplinePoint;
  control2: SplinePoint;
  to: SplinePoint;
}

/** The Bézier segments of the Oshima spline through `points`, in order.
 *  The ends are handled by repeating the first and last point. */
export function oshimaSegments(points: SplinePoint[]): BezierSegment[] {
  if (points.length < 2) return [];

  const at = (index: number) => points[Math.min(points.length - 1, Math.max(0, index))];
  const segments: BezierSegment[] = [];

  for (let j = 0; j < points.length - 1; j++) {
    const previous = at(j - 1);
    const from = at(j);
    const to = at(j + 1);
    const next = at(j + 2);
    const c = coefficient(previous, from, to, next);

    segments.push({
      from,
      control1: { x: from.x + c * (to.x - previous.x), y: from.y + c * (to.y - previous.y) },
      control2: { x: to.x + c * (from.x - next.x), y: to.y + c * (from.y - next.y) },
      to,
    });
  }

  return segments;
}

function bezierAt(segment: BezierSegment, t: number): SplinePoint {
  const s = 1 - t;
  const a = s * s * s;
  const b = 3 * s * s * t;
  const c = 3 * s * t * t;
  const d = t * t * t;
  return {
    x: a * segment.from.x + b * segment.control1.x + c * segment.control2.x + d * segment.to.x,
    y: a * segment.from.y + b * segment.control1.y + c * segment.control2.y + d * segment.to.y,
  };
}

/** The spline as a polyline, with `perSegment` samples along each segment.
 *  Both client and server use this, so they score exactly what was shown. */
export function oshimaCurve(points: SplinePoint[], perSegment = 24): SplinePoint[] {
  const segments = oshimaSegments(points);
  if (segments.length === 0) return points.slice(0, 1);

  const curve: SplinePoint[] = [segments[0].from];
  for (const segment of segments) {
    for (let step = 1; step <= perSegment; step++) {
      curve.push(bezierAt(segment, step / perSegment));
    }
  }
  return curve;
}

/** Sorts by x and drops points that share an x, so the curve stays a function
 *  of x — what a graph of y = f(x) has to be. */
export function asFunctionPoints(points: SplinePoint[]): SplinePoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  return sorted.filter((point, index) => index === 0 || point.x > sorted[index - 1].x + 1e-9);
}
