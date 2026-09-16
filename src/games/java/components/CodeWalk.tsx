import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TraceStep } from "../../../../shared/games/java";
import { CodeLine } from "./CodeBlock";

export interface CodeWalkProps {
  code: string[];
  steps: TraceStep[];
}

/**
 * The program, walked.
 *
 * A tracing station tells you at the end whether the number you wrote was the
 * number that came out, which is the one thing you already suspected and the
 * one thing that teaches nothing. What is worth seeing is the loop going round:
 * the line that is about to run, and the variable changing under it. So the
 * review plays the run back a step at a time, and a reader who was one pass out
 * can watch the pass they missed instead of being told a total.
 *
 * The steps are recorded when the question is made — see `TraceStep`. Nothing
 * is interpreted here; this is a recording with a play button.
 */
export default function CodeWalk({ code, steps }: CodeWalkProps) {
  const { t } = useTranslation();
  const [at, setAt] = useState(0);

  if (steps.length === 0) return null;
  const step = steps[Math.min(at, steps.length - 1)];
  const names = Object.keys(step.vars);

  return (
    <div className="w-full rounded-xl border-2 border-gray-200 bg-white p-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-slate-50 p-2 font-mono text-xs leading-5">
          {code.map((line, index) => (
            <div
              key={index}
              className={`whitespace-pre rounded px-1 ${
                index === step.line ? "bg-game-100 ring-1 ring-game-solid" : ""
              }`}
            >
              <CodeLine text={line} />
            </div>
          ))}
        </div>

        <div className="shrink-0 sm:w-36">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {names.map((name) => (
              <span key={name} className="font-mono">
                <span className="text-gray-500">{name} = </span>
                <span className="font-semibold text-game-ink">{step.vars[name]}</span>
              </span>
            ))}
          </div>
          {step.out.length > 0 && (
            <p className="mt-1 font-mono text-xs text-emerald-700">
              {t("games.java.walk.printed")} {step.out.join(" ")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => setAt((n) => Math.max(0, n - 1))}
          disabled={at === 0}
          className="rounded-lg border-2 border-gray-200 px-2 py-1 text-xs font-medium disabled:text-gray-300"
        >
          ←
        </button>
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={Math.min(at, steps.length - 1)}
          onChange={(event) => setAt(Number(event.target.value))}
          className="min-w-0 flex-1 accent-game-solid"
          aria-label={t("games.java.walk.step")}
        />
        <button
          onClick={() => setAt((n) => Math.min(steps.length - 1, n + 1))}
          disabled={at >= steps.length - 1}
          className="rounded-lg border-2 border-gray-200 px-2 py-1 text-xs font-medium disabled:text-gray-300"
        >
          →
        </button>
        <span className="shrink-0 text-xs tabular-nums text-gray-400">
          {Math.min(at, steps.length - 1) + 1}/{steps.length}
        </span>
      </div>
    </div>
  );
}
