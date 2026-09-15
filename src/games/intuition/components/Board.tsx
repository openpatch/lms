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
  /** Written inside a node. */
  nodeLabel?: (index: number) => string | null;
  onNodePointerDown?: (index: number, event: React.PointerEvent<SVGGElement>) => void;
  onPointerMove?: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: React.PointerEvent<SVGSVGElement>) => void;
  svgRef?: React.Ref<SVGSVGElement>;
  children?: ReactNode;
}

export default function Board({
  nodes,
  edges,
  edgeClass,
  edgeLabel,
  nodeClass,
  nodeLabel,
  onNodePointerDown,
  onPointerMove,
  onPointerUp,
  svgRef,
  children,
}: BoardProps) {
  return (
    <svg
      ref={svgRef}
      viewBox="-6 -6 112 112"
      className="aspect-square w-full max-w-md touch-none rounded-2xl border-2 border-gray-200 bg-white select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
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
          <circle
            cx={node.x}
            cy={node.y}
            r={5}
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
