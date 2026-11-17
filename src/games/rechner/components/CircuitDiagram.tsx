import { formula, isInput, type Circuit } from "../../../../shared/logic-circuit";

/** One gate or input, where it is drawn. */
interface Placed {
  node: Circuit;
  column: number;
  y: number;
  children: Placed[];
}

const ROW = 50;
const COL = 96;
const PAD = 26;
const GATE_W = 40;
const GATE_H = 44;
const NOT_H = 30;
const BUBBLE = 4;

const SYMBOL: Record<string, string> = { und: "&", oder: "≥1", xor: "=1", nicht: "1" };

function depth(node: Circuit): number {
  if (isInput(node)) return 0;
  return 1 + Math.max(depth(node.a), node.op === "nicht" ? 0 : depth(node.b));
}

/**
 * Lays a circuit out left to right: inputs in a column of their own, each
 * gate in the column of its depth, each input on a row of its own and each
 * gate halfway between whatever feeds it. A gate's box is shorter than a row
 * is tall, so a wire running along a row never passes through a box.
 */
function place(root: Circuit): { placed: Placed; rows: number; columns: number } {
  let row = 0;
  const visit = (node: Circuit): Placed => {
    if (isInput(node)) return { node, column: 0, y: row++ * ROW, children: [] };
    const children = node.op === "nicht" ? [visit(node.a)] : [visit(node.a), visit(node.b)];
    const y = children.reduce((sum, c) => sum + c.y, 0) / children.length;
    return { node, column: depth(node), y, children };
  };
  const placed = visit(root);
  return { placed, rows: row, columns: depth(root) };
}

const colX = (column: number) => PAD + 14 + column * COL;

/**
 * A circuit drawn with the rectangular symbols of the hyperbook (DIN EN
 * 60617): & for UND, ≥1 for ODER, =1 for XOR, and a 1 with a ring on its
 * output for NICHT.
 */
export default function CircuitDiagram({
  circuit,
  values,
  output = "Y",
  className = "",
}: {
  circuit: Circuit;
  /** Switch positions to print beside the inputs, when the question sets them. */
  values?: Record<string, number>;
  output?: string;
  className?: string;
}) {
  const { placed, rows, columns } = place(circuit);
  const outX = colX(columns) + GATE_W / 2 + BUBBLE * 2 + 40;
  const width = outX + PAD + 10;
  const height = (rows - 1) * ROW + PAD * 2 + 10;
  const top = PAD + 5;

  const shapes: React.ReactNode[] = [];
  const wires: React.ReactNode[] = [];

  /** Where a placed thing's output leaves it. */
  const outPoint = (p: Placed): [number, number] => {
    if (isInput(p.node)) return [colX(0) + 8, p.y + top];
    const bubble = p.node.op === "nicht" ? BUBBLE * 2 : 0;
    return [colX(p.column) + GATE_W / 2 + bubble, p.y + top];
  };

  const draw = (p: Placed, key: string) => {
    const y = p.y + top;
    if (isInput(p.node)) {
      const value = values?.[p.node.in];
      shapes.push(
        <g key={key}>
          <text x={colX(0) - 10} y={y + 5} textAnchor="end" className="fill-gray-800 font-mono text-[15px] font-bold">
            {p.node.in}
          </text>
          {value != null && (
            <text x={colX(0) + 18} y={y - 6} className={`font-mono text-[12px] font-bold ${value ? "fill-emerald-600" : "fill-gray-400"}`}>
              {value}
            </text>
          )}
          <circle cx={colX(0)} cy={y} r={3} className="fill-gray-700" />
        </g>,
      );
      return;
    }
    const isNot = p.node.op === "nicht";
    const h = isNot ? NOT_H : GATE_H;
    const left = colX(p.column) - GATE_W / 2;
    shapes.push(
      <g key={key}>
        <rect x={left} y={y - h / 2} width={GATE_W} height={h} rx={3} className="fill-white stroke-gray-800" strokeWidth={2} />
        <text x={colX(p.column)} y={y + 5} textAnchor="middle" className="fill-gray-800 text-[14px] font-bold">
          {SYMBOL[p.node.op]}
        </text>
        {isNot && <circle cx={left + GATE_W + BUBBLE} cy={y} r={BUBBLE} className="fill-white stroke-gray-800" strokeWidth={2} />}
      </g>,
    );
    p.children.forEach((child, index) => {
      const pinY = isNot ? y : y + (index === 0 ? -10 : 10);
      const [fromX, fromY] = outPoint(child);
      // The bend sits just before the gate, a step apart per pin so the two
      // vertical runs into one gate never share a line.
      const bendX = left - (index === 0 ? 18 : 10);
      wires.push(
        <path
          key={`${key}-w${index}`}
          d={`M${fromX} ${fromY} H${bendX} V${pinY} H${left}`}
          className="fill-none stroke-gray-700"
          strokeWidth={2}
        />,
      );
      draw(child, `${key}-${index}`);
    });
  };

  draw(placed, "n");
  const [rootX, rootY] = outPoint(placed);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${output} = ${formula(circuit)}`}
      className={`h-auto w-full ${className}`}
      style={{ maxWidth: `${width * 1.6}px` }}
    >
      {wires}
      <path d={`M${rootX} ${rootY} H${outX - 12}`} className="fill-none stroke-gray-700" strokeWidth={2} />
      <text x={outX - 6} y={rootY + 5} className="fill-game-ink font-mono text-[15px] font-bold">
        {output}
      </text>
      {shapes}
    </svg>
  );
}
