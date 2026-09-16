import type { ParsonsQuestion } from "../../../../shared/parsons";
import type { StageProps } from "../../../lib/game-registry";
import ParsonsPuzzle from "../../../components/ParsonsPuzzle";
import { CodeLine } from "../components/CodeBlock";

/**
 * Put the lines of a Java program back in order.
 *
 * The indentation comes already set. In Java it is manners and not meaning —
 * what says where a block ends is the closing brace, and a `}` on its own has
 * nothing in it to say which block it closes. That is the line people put in
 * the wrong place, so that is the line the puzzle is about.
 */
export default function JavaParsonsStage(props: StageProps<ParsonsQuestion>) {
  return <ParsonsPuzzle {...props} CodeLine={CodeLine} />;
}

export function JavaParsonsRulesExample() {
  const lines = [
    { text: "int summe = 0;", indent: 1 },
    { text: "for (int i = 1; i <= 4; i++) {", indent: 1 },
    { text: "summe = summe + i;", indent: 2 },
    { text: "}", indent: 1 },
  ];
  return (
    <div className="flex flex-col gap-1 text-left font-mono text-sm text-slate-700">
      {lines.map((line, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1 whitespace-pre"
          style={{ marginLeft: line.indent * 12 }}
        >
          <CodeLine text={line.text} />
        </div>
      ))}
    </div>
  );
}
