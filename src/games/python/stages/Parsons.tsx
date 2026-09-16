import type { ParsonsQuestion } from "../../../../shared/parsons";
import type { StageProps } from "../../../lib/game-registry";
import ParsonsPuzzle from "../../../components/ParsonsPuzzle";
import { CodeLine } from "../components/CodeBlock";

/**
 * Put the lines back in order — and, when the station asks for it, at the right
 * depth, because in Python the indentation is the block.
 *
 * The puzzle itself is shared with the Java station; what differs is the
 * language the lines are coloured in and whether the indentation is handed
 * over or handed back already set.
 */
export default function ParsonsStage(props: StageProps<ParsonsQuestion>) {
  return <ParsonsPuzzle {...props} CodeLine={CodeLine} />;
}

export function ParsonsRulesExample() {
  return (
    <div className="flex flex-col gap-1 text-left font-mono text-sm text-slate-700">
      {["summe = 0", "for zahl in zahlen:", "    summe = summe + zahl", "print(summe)"].map(
        (line, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1 whitespace-pre"
          >
            <CodeLine text={line} />
          </div>
        ),
      )}
    </div>
  );
}
