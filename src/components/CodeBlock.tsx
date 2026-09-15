import type { ReactNode } from "react";

/**
 * A program listing, coloured the way an editor would colour it.
 *
 * The block knows how to lay out a listing — the numbers down the left edge,
 * a line that is a button, the marked line — and nothing about any language.
 * A `Language` says how to split a line into tokens and which colour each one
 * gets; the two that exist live next to the games that use them, in
 * `src/games/<game>/components/CodeBlock.tsx`.
 */
export interface Language {
  /** Splits a line into tokens. Must match every character, so nothing is lost. */
  token: RegExp;
  /** Tailwind classes for one token, or "" to leave it in the body colour. */
  classify: (token: string) => string;
}

/** One line, split into coloured spans. */
export function CodeLine({ text, language }: { text: string; language: Language }) {
  // String.match on a global regex starts from the beginning whatever its
  // lastIndex says, so one shared regex is safe across lines.
  const tokens = text.match(language.token) ?? [];
  return (
    <>
      {tokens.map((token, index) => {
        const className = language.classify(token);
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
  /** Makes every line a button — used by the stages that hunt for the bug. */
  onPickLine?: (index: number) => void;
  /** Marks one line, e.g. the one the player just picked. */
  marked?: number | null;
  /** Smaller type and less padding, for a listing inside a round-review row. */
  compact?: boolean;
  className?: string;
  /** Rendered under the listing, inside the same card. */
  children?: ReactNode;
}

export default function CodeBlock({
  lines,
  language,
  numbered = false,
  onPickLine,
  marked = null,
  compact = false,
  className = "",
  children,
}: CodeBlockProps & { language: Language }) {
  // Two class strings rather than one with an override: a later utility in the
  // class attribute does not win over an earlier one, only a later rule in the
  // stylesheet does, so "text-sm ... text-xs" would come out whichever way
  // Tailwind happened to order the two.
  const size = compact
    ? "py-2 text-xs leading-relaxed sm:text-sm"
    : "py-3 text-sm leading-relaxed sm:text-base";
  return (
    <div
      className={`w-full overflow-x-auto rounded-xl border-2 border-slate-200 bg-slate-50 text-left font-mono text-slate-800 ${size} ${className}`}
    >
      {lines.map((line, index) => {
        const body = (
          <>
            {numbered && (
              <span className="mr-3 inline-block w-5 shrink-0 select-none text-right text-xs text-slate-400">
                {index + 1}
              </span>
            )}
            <span className="whitespace-pre">
              {line === "" ? " " : <CodeLine text={line} language={language} />}
            </span>
          </>
        );

        // A blank line separates two parts of a program; it is never the bug.
        if (!onPickLine || line === "") {
          return (
            <div key={index} className={`whitespace-pre ${compact ? "px-3" : "px-4"}`}>
              {body}
            </div>
          );
        }
        return (
          <button
            key={index}
            onClick={() => onPickLine(index)}
            className={`flex w-full items-baseline text-left transition-colors ${
              compact ? "px-3" : "px-4"
            } ${marked === index ? "bg-game-100" : "hover:bg-game-50"}`}
          >
            {body}
          </button>
        );
      })}
      {children}
    </div>
  );
}
