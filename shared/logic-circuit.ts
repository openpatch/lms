/**
 * The circuits of the hyperbook's Lektion 3.1, "Logikgatter": UND, ODER and
 * NICHT, plus XOR from 3.2 for a host who has taught it. A circuit is a tree —
 * every gate feeds exactly one other — which is all those lessons draw, and
 * what lets the client lay it out without crossing a wire.
 */

export type GateOp = "und" | "oder" | "xor" | "nicht";

export type Circuit =
  | { in: string }
  | { op: "und" | "oder" | "xor"; a: Circuit; b: Circuit }
  | { op: "nicht"; a: Circuit };

export function isInput(circuit: Circuit): circuit is { in: string } {
  return "in" in circuit;
}

export function evaluate(circuit: Circuit, values: Record<string, number>): number {
  if (isInput(circuit)) return values[circuit.in] ? 1 : 0;
  const a = evaluate(circuit.a, values);
  if (circuit.op === "nicht") return a ? 0 : 1;
  const b = evaluate(circuit.b, values);
  switch (circuit.op) {
    case "und":
      return a & b;
    case "oder":
      return a | b;
    case "xor":
      return a ^ b;
  }
}

/** The inputs a circuit reads, in alphabetical order. */
export function circuitInputs(circuit: Circuit): string[] {
  const names = new Set<string>();
  const walk = (node: Circuit) => {
    if (isInput(node)) names.add(node.in);
    else {
      walk(node.a);
      if (node.op !== "nicht") walk(node.b);
    }
  };
  walk(circuit);
  return [...names].sort();
}

export function gateCount(circuit: Circuit): number {
  if (isInput(circuit)) return 0;
  return 1 + gateCount(circuit.a) + (circuit.op === "nicht" ? 0 : gateCount(circuit.b));
}

/** Every input combination, counting up with the first input as the top bit —
 *  the order the hyperbook's tables use. */
export function tableRows(inputs: string[]): number[][] {
  const n = inputs.length;
  return Array.from({ length: 2 ** n }, (_, row) =>
    inputs.map((_, i) => (row >> (n - 1 - i)) & 1),
  );
}

/** The output column of the truth table, as "0"/"1" characters. */
export function outputColumn(circuit: Circuit, inputs: string[]): string {
  return tableRows(inputs)
    .map((row) => evaluate(circuit, Object.fromEntries(inputs.map((name, i) => [name, row[i]]))))
    .join("");
}

const WORD: Record<GateOp, string> = { und: "UND", oder: "ODER", xor: "XOR", nicht: "NICHT" };

/** The circuit as a formula, the way the lesson writes one: A UND (B ODER C). */
export function formula(circuit: Circuit, top = true): string {
  if (isInput(circuit)) return circuit.in;
  if (circuit.op === "nicht") return `NICHT ${formula(circuit.a, false)}`;
  const text = `${formula(circuit.a, false)} ${WORD[circuit.op]} ${formula(circuit.b, false)}`;
  return top ? text : `(${text})`;
}
