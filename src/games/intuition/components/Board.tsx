import type { ReactNode } from "react";
import type { Edge, Point } from "../../../../shared/intuition-graph";

/**
 * The square both map stations are drawn on.
 *
 * The graph lives in a 0-100 box on the server, so the board is a 100x100
 * viewBox and nothing has to convert anything: an edge is a line between two
 * of the points, a node is a circle at one. What differs between the stations
 * is only what a node does when it is touched, so that comes in from outside.
 */
export interface BoardProps {
  nodes: Point[];
  edges: Edge[];
  /** Classes for the line of each edge, by index. */
  edgeClass?: (index: number, edge: Edge) => string;
  /** Minutes (or anything) written on an edge. */
  edgeLabel?: (edge: Edge) => string | null;
  /** Classes for the circle of each node. */
  nodeClass?: (index: number) => string;
  /** Radius of one node, when the stage wants it bigger than the default. */
  nodeRadius?: (index: number) => number;
  /** Written inside a node. */
  nodeLabel?: (index: number) => string | null;
  onNodePointerDown?: (index: number, event: React.PointerEvent<SVGGElement>) => void;
  onPointerMove?: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerCancel?: (event: React.PointerEvent<SVGSVGElement>) => void;
  /** True when dots are dragged rather than only tapped: the board then has to
   *  swallow every gesture, including the drag that would scroll the page. */
  dragging?: boolean;
  /** Keep hold of a pointer that wanders off the board. A captured pointer is
   *  still this board's, and letting go of it there drops the drag whenever a
   *  dot is pulled towards an edge. */
  keepOnLeave?: boolean;
  svgRef?: React.Ref<SVGSVGElement>;
  children?: ReactNode;
}

export default function Board({
  nodes,
  edges,
  edgeClass,
  edgeLabel,
  nodeClass,
  nodeRadius,
  nodeLabel,
  onNodePointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  dragging = false,
  keepOnLeave = false,
  svgRef,
  children,
}: BoardProps) {
  return (
    <svg
      ref={svgRef}
      viewBox="-6 -6 112 112"
      // A board that is only tapped keeps scrolling and pinch-zoom and gives up
      // just the double-tap, which iOS would otherwise read as "zoom in" when
      // two taps land quickly.
      className={`no-callout aspect-square w-full max-w-md rounded-2xl border-2 border-gray-200 bg-white select-none ${
        dragging ? "touch-none" : "touch-manipulation"
      }`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel ?? onPointerUp}
      onPointerLeave={keepOnLeave ? undefined : onPointerUp}
    >
      {edges.map((edge, index) => {
        const from = nodes[edge.a];
        const to = nodes[edge.b];
        const label = edgeLabel?.(edge) ?? null;
        return (
          <g key={index}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeWidth={1.4}
              strokeLinecap="round"
              className={edgeClass?.(index, edge) ?? "stroke-slate-300"}
            />
            {label && (
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-500 text-[5px] font-bold"
                style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 2 }}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}

      {nodes.map((node, index) => (
        <g
          key={index}
          onPointerDown={(event) => onNodePointerDown?.(index, event)}
          className={onNodePointerDown ? "cursor-pointer" : undefined}
        >
          {/* A fingertip is wider than a dot. This is what it actually has to
              hit — invisible, and comfortably clear of the next dot, which is
              never nearer than the generator's minimum gap. */}
          {onNodePointerDown && <circle cx={node.x} cy={node.y} r={10} fill="transparent" />}
          <circle
            cx={node.x}
            cy={node.y}
            r={nodeRadius?.(index) ?? 5}
            strokeWidth={1.5}
            className={nodeClass?.(index) ?? "fill-game-100 stroke-game-solid"}
          />
          {nodeLabel?.(index) && (
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none fill-slate-700 text-[5px] font-bold"
            >
              {nodeLabel(index)}
            </text>
          )}
        </g>
      ))}

      {children}
    </svg>
  );
}
