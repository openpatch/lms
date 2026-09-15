// Struktogramme (Nassi-Shneiderman diagrams).
//
// The SILP asks for every control structure to be shown on more than one level:
// as Java, as a Flussdiagramm and as a Struktogramm. This is the model behind
// the station that puts the last two of those side by side — the server builds
// a program together with its diagram and three diagrams that belong to a
// program the player did *not* get.
//
// A node is deliberately shallow: the boxes carry the text they show, not the
// code they came from, so the client can draw a diagram without knowing Java.

export type StructogramNode =
  | { kind: "statement"; text: string }
  /** A test with a yes-branch and a no-branch; either may be empty. */
  | { kind: "branch"; condition: string; yes: StructogramNode[]; no: StructogramNode[] }
  /** Kopfgesteuert: the test comes before the body may run. */
  | { kind: "while"; condition: string; body: StructogramNode[] }
  /** Fußgesteuert: the body runs once before the test is reached. */
  | { kind: "dowhile"; condition: string; body: StructogramNode[] };

// `condition` is the text the box shows, written out in full ("solange rest > 0",
// "für i von 1 bis 5"), because a Zählschleife and a bedingte Schleife are drawn
// with the same frame and read differently — and because the boxes of a diagram
// carry German prose throughout, exactly like the identifiers in the listings.

export type Structogram = StructogramNode[];

/** A diagram as one flat string, so two of them can be compared for sameness. */
export function structogramSignature(nodes: Structogram): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case "statement":
          return `s(${node.text})`;
        case "branch":
          return `b(${node.condition}|${structogramSignature(node.yes)}|${structogramSignature(node.no)})`;
        case "while":
          return `w(${node.condition}|${structogramSignature(node.body)})`;
        case "dowhile":
          return `d(${node.condition}|${structogramSignature(node.body)})`;
      }
    })
    .join(";");
}

/** How many boxes a diagram draws — what decides whether it still fits a card. */
export function structogramSize(nodes: Structogram): number {
  let total = 0;
  for (const node of nodes) {
    total++;
    if (node.kind === "branch") total += structogramSize(node.yes) + structogramSize(node.no);
    if (node.kind === "while" || node.kind === "dowhile") total += structogramSize(node.body);
  }
  return total;
}

export function cloneStructogram(nodes: Structogram): Structogram {
  return JSON.parse(JSON.stringify(nodes)) as Structogram;
}
