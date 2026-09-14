import type { ReactNode } from "react";

/**
 * A Python listing, coloured the way an editor would colour it.
 *
 * The highlighting is deliberately crude: it knows the keywords, the builtins
 * and the turtle commands of the hyperbook's Turtle-Lernpfad, and treats
 * everything else as a plain name. That is the whole language the game uses.
 */

const KEYWORDS = new Set([
  "and",
  "def",
  "elif",
  "else",
  "for",
  "from",
  "if",
  "import",
  "in",
  "not",
  "or",
  "return",
  "while",
]);

const CONSTANTS = new Set(["True", "False", "None"]);

const BUILTINS = new Set([
  "print",
  "input",
  "int",
  "float",
  "str",
  "len",
  "range",
  "randint",
  "forward",
  "backward",
  "right",
  "left",
  "goto",
  "penup",
  "pendown",
  "pencolor",
  "fillcolor",
  "pensize",
  "dot",
  "circle",
  "write",
  "bgcolor",
  "hideturtle",
  "speed",
]);

// Strings, comments, numbers, names, everything else one character at a time.
const TOKEN = /("[^"]*"?|'[^']*'?|#.*$|\d+\.?\d*|[A-Za-z_][A-Za-z_0-9]*|[\s\S])/g;

function classOf(token: string): string {
  if (token.startsWith('"') || token.startsWith("'")) return "text-emerald-700";
  if (token.startsWith("#")) return "text-slate-400 italic";
  if (/^\d/.test(token)) return "text-orange-600";
  if (KEYWORDS.has(token)) return "text-purple-600 font-semibold";
  if (CONSTANTS.has(token)) return "text-purple-600";
  if (BUILTINS.has(token)) return "text-sky-700";
  return "";
}

/** One line, split into coloured spans. */
export function CodeLine({ text }: { text: string }) {
  const tokens = text.match(TOKEN) ?? [];
  return (
    <>
      {tokens.map((token, index) => {
        const className = classOf(token);
        return className ? (
          <span key={index} className={className}>
            {token}
          </span>
        ) : (
          <span key={index}>{token}</span>
        );
      })}
    </>
  );
}

export interface CodeBlockProps {
  lines: string[];
  /** Line numbers down the left edge. */
  numbered?: boolean;
  /** Makes every line a button — used by the stage that hunts for the bug. */
  onPickLine?: (index: number) => void;
  /** Marks one line, e.g. the one the player just picked. */
  marked?: number | null;
  className?: string;
  /** Rendered under the listing, inside the same card. */
  children?: ReactNode;
}

export default function CodeBlock({
  lines,
  numbered = false,
  onPickLine,
  marked = null,
  className = "",
  children,
}: CodeBlockProps) {
  return (
    <div
      className={`w-full overflow-x-auto rounded-xl border-2 border-slate-200 bg-slate-50 py-3 text-left font-mono text-sm leading-relaxed text-slate-800 sm:text-base ${className}`}
    >
      {lines.map((line, index) => {
        const body = (
          <>
            {numbered && (
              <span className="mr-3 inline-block w-5 shrink-0 select-none text-right text-xs text-slate-400">
                {index + 1}
              </span>
            )}
            <span className="whitespace-pre">{line === "" ? " " : <CodeLine text={line} />}</span>
          </>
        );

        // A blank line separates two parts of a program; it is never the bug.
        if (!onPickLine || line === "") {
          return (
            <div key={index} className="px-4 whitespace-pre">
              {body}
            </div>
          );
        }
        return (
          <button
            key={index}
            onClick={() => onPickLine(index)}
            className={`flex w-full items-baseline px-4 text-left transition-colors ${
              marked === index ? "bg-game-100" : "hover:bg-game-50"
            }`}
          >
            {body}
          </button>
        );
      })}
      {children}
    </div>
  );
}
