import { useTranslation } from "react-i18next";
import type { Structogram, StructogramNode } from "../../../../shared/java-structogram";

/**
 * A Struktogramm (Nassi-Shneiderman diagram), drawn with borders.
 *
 * The shapes are the ones Kapitel 3.7 of the Lernpfad lists: a box per
 * statement, a box with a triangle over two columns for a Verzweigung, and a
 * frame that grips the body from the top and the left — or from the bottom and
 * the left — for a kopf- or fußgesteuerte Schleife. The two loops read the same
 * ("solange …"); where that row sits is the whole difference, which is exactly
 * what the station asks about.
 */

const LINE = "border-slate-400";

function Statement({ text }: { text: string }) {
  return <div className="px-1.5 py-1 leading-snug break-words">{text}</div>;
}

/** An empty branch is marked, so nobody reads it as forgotten. */
function Empty() {
  return <div className="px-1.5 py-1 text-center text-slate-400">&#8709;</div>;
}

function Branch({ node }: { node: Extract<StructogramNode, { kind: "branch" }> }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className={`relative border-b ${LINE}`}>
        {/* The triangle of the condition: two diagonals meeting at the bottom centre. */}
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full text-slate-400"
          aria-hidden="true"
        >
          <line
            x1="0"
            y1="0"
            x2="50"
            y2="40"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="100"
            y1="0"
            x2="50"
            y2="40"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="relative px-4 pt-1 text-center leading-snug break-words">
          {node.condition}
        </div>
        <div className="relative flex justify-between px-1 pb-0.5 text-[0.85em] text-slate-500">
          <span>{t("games.java.structogram.yes")}</span>
          <span>{t("games.java.structogram.no")}</span>
        </div>
      </div>
      <div className="flex items-stretch">
        <div className="w-1/2">
          {node.yes.length > 0 ? <Nodes nodes={node.yes} /> : <Empty />}
        </div>
        <div className={`w-1/2 border-l ${LINE}`}>
          {node.no.length > 0 ? <Nodes nodes={node.no} /> : <Empty />}
        </div>
      </div>
    </div>
  );
}

function Loop({ node }: { node: Extract<StructogramNode, { kind: "while" | "dowhile" }> }) {
  const condition = <div className="px-1.5 py-1 leading-snug break-words">{node.condition}</div>;
  // The frame grips the body from the left, and from the top or from the bottom.
  const body = (
    <div className={`ml-4 border-l ${LINE} ${node.kind === "while" ? "border-t" : "border-b"}`}>
      <Nodes nodes={node.body} />
    </div>
  );
  return node.kind === "while" ? (
    <div>
      {condition}
      {body}
    </div>
  ) : (
    <div>
      {body}
      {condition}
    </div>
  );
}

function Nodes({ nodes }: { nodes: Structogram }) {
  return (
    <>
      {nodes.map((node, index) => (
        <div key={index} className={index > 0 ? `border-t ${LINE}` : ""}>
          {node.kind === "statement" ? (
            <Statement text={node.text} />
          ) : node.kind === "branch" ? (
            <Branch node={node} />
          ) : (
            <Loop node={node} />
          )}
        </div>
      ))}
    </>
  );
}

export default function StructogramView({
  nodes,
  className = "",
}: {
  nodes: Structogram;
  className?: string;
}) {
  return (
    <div
      className={`border ${LINE} bg-white text-left text-[0.7rem] leading-tight text-slate-700 sm:text-xs ${className}`}
    >
      <Nodes nodes={nodes} />
    </div>
  );
}
