// Small graphs drawn on a square, for the two stations that show a map.
//
// Both sides need the same geometry: the server builds a graph and grades what
// comes back, the client draws it and lets the player push it around. Nothing
// in here knows which station it is serving.

export interface Point {
  /** 0 to 100, so the client can draw straight into a 100x100 viewBox. */
  x: number;
  y: number;
}

export interface Edge {
  a: number;
  b: number;
  /** Minutes, for the station that asks for the quickest way. */
  weight?: number;
}

export interface Graph {
  nodes: Point[];
  edges: Edge[];
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

function orientation(p: Point, q: Point, r: Point): number {
  const value = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(value) < 1e-9) return 0;
  return value > 0 ? 1 : -1;
}

/**
 * Do the two segments cross properly — that is, somewhere other than at a
 * shared endpoint? Two edges that meet at a node touch there by construction,
 * and calling that a crossing would make the puzzle unsolvable.
 */
export function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);
  // Collinear overlaps are ruled out when the graph is built, so only the
  // strict case matters: each segment separates the other's two endpoints.
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
}

/** Distance from `p` to the segment `a`-`b`. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** How many pairs of edges cross, for the given positions. */
export function countCrossings(nodes: Point[], edges: Edge[]): number {
  let crossings = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const first = edges[i];
      const second = edges[j];
      // Edges that share a node meet at that node; that is not a crossing.
      if (
        first.a === second.a ||
        first.a === second.b ||
        first.b === second.a ||
        first.b === second.b
      ) {
        continue;
      }
      if (segmentsCross(nodes[first.a], nodes[first.b], nodes[second.a], nodes[second.b])) {
        crossings++;
      }
    }
  }
  return crossings;
}

// ---------------------------------------------------------------------------
// Building one
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Points far enough apart that two of them never look like one. */
function scatter(count: number, minGap: number): Point[] | null {
  const points: Point[] = [];
  for (let attempt = 0; attempt < 600 && points.length < count; attempt++) {
    const candidate = { x: randomInt(10, 90), y: randomInt(10, 90) };
    if (points.every((other) => distance(candidate, other) >= minGap)) points.push(candidate);
  }
  return points.length === count ? points : null;
}

function isConnected(count: number, edges: Edge[]): boolean {
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : null;
      if (next != null && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size === count;
}

/**
 * A connected graph whose drawing has no crossings at all.
 *
 * Built the only way that needs no theory: sort every possible edge by length
 * and keep one when it neither crosses an edge already kept nor passes close
 * enough to a third node to look like it does. Short edges come first, so what
 * comes out is the web of near neighbours a map would have — and because the
 * drawing it was built in is crossing-free, the untangling puzzle is always
 * solvable by putting the nodes back where they started.
 */
export function buildPlanarGraph(count: number, extraEdges = 2): Graph {
  for (let attempt = 0; attempt < 60; attempt++) {
    const nodes = scatter(count, 26);
    if (!nodes) continue;

    const candidates: Edge[] = [];
    for (let a = 0; a < count; a++) {
      for (let b = a + 1; b < count; b++) candidates.push({ a, b });
    }
    candidates.sort(
      (first, second) =>
        distance(nodes[first.a], nodes[first.b]) - distance(nodes[second.a], nodes[second.b]),
    );

    const edges: Edge[] = [];
    const limit = count + extraEdges;
    for (const candidate of candidates) {
      if (edges.length >= limit) break;
      const from = nodes[candidate.a];
      const to = nodes[candidate.b];
      // A node sitting on top of an edge reads as a crossing even though it is
      // not one, so those edges are left out as well.
      const grazes = nodes.some(
        (node, index) =>
          index !== candidate.a && index !== candidate.b && distanceToSegment(node, from, to) < 8,
      );
      if (grazes) continue;
      const crosses = edges.some((edge) => {
        if (
          edge.a === candidate.a ||
          edge.a === candidate.b ||
          edge.b === candidate.a ||
          edge.b === candidate.b
        ) {
          return false;
        }
        return segmentsCross(nodes[edge.a], nodes[edge.b], from, to);
      });
      if (!crosses) edges.push(candidate);
    }

    if (edges.length >= count - 1 && isConnected(count, edges)) return { nodes, edges };
  }

  // Every attempt failed — a ring always works and is never interesting.
  const nodes = Array.from({ length: count }, (_, index) => {
    const angle = (2 * Math.PI * index) / count;
    return { x: 50 + 38 * Math.cos(angle), y: 50 + 38 * Math.sin(angle) };
  });
  const edges = nodes.map((_, index) => ({ a: index, b: (index + 1) % count }));
  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Finding the way through one
// ---------------------------------------------------------------------------

function weightOf(edge: Edge): number {
  return edge.weight ?? 1;
}

/** Cheapest route from `from` to `to`, and what it costs. */
export function shortestPath(graph: Graph, from: number, to: number): { path: number[]; cost: number } {
  const count = graph.nodes.length;
  const best = Array<number>(count).fill(Infinity);
  const previous = Array<number>(count).fill(-1);
  const done = Array<boolean>(count).fill(false);
  best[from] = 0;

  for (let step = 0; step < count; step++) {
    let current = -1;
    for (let node = 0; node < count; node++) {
      if (!done[node] && (current === -1 || best[node] < best[current])) current = node;
    }
    if (current === -1 || best[current] === Infinity) break;
    done[current] = true;
    for (const edge of graph.edges) {
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : null;
      if (next == null || done[next]) continue;
      const through = best[current] + weightOf(edge);
      if (through < best[next]) {
        best[next] = through;
        previous[next] = current;
      }
    }
  }

  if (best[to] === Infinity) return { path: [], cost: Infinity };
  const path = [to];
  while (path[0] !== from) path.unshift(previous[path[0]]);
  return { path, cost: best[to] };
}

/**
 * What the route the player laid out costs, or null when it is not a route:
 * a step that has no road under it, or a node visited twice.
 */
export function pathCost(graph: Graph, path: number[], from: number, to: number): number | null {
  if (path.length < 2 || path[0] !== from || path[path.length - 1] !== to) return null;
  if (new Set(path).size !== path.length) return null;
  let total = 0;
  for (let step = 0; step + 1 < path.length; step++) {
    const a = path[step];
    const b = path[step + 1];
    const edge = graph.edges.find(
      (candidate) =>
        (candidate.a === a && candidate.b === b) || (candidate.a === b && candidate.b === a),
    );
    if (!edge) return null;
    total += weightOf(edge);
  }
  return total;
}
