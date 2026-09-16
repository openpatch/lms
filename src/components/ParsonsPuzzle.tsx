import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParsonsQuestion } from "../../shared/parsons";
import type { StageProps } from "../lib/game-registry";
import GameButton from "./GameButton";
import { StageActionBar } from "./StageShell";

const MAX_INDENT = 3;

interface Draft {
  questionId: number;
  /** Offered lines, in the order the player put them. */
  order: number[];
  /** The indent chosen for each placed line. */
  indents: number[];
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7 shrink-0 rounded-md border border-gray-200 bg-white text-xs text-gray-500 transition-colors hover:border-game-solid hover:text-game-ink disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
    >
      {children}
    </button>
  );
}

/**
 * A Parsons puzzle: the lines of a working program, shuffled. Tap a line to add
 * it to the program, and move it with the arrows.
 *
 * With `withIndent` on, the lines arrive flush left and the player sets the
 * indentation as well — which is the harder and the more Python half of the
 * exercise, because indentation is what decides where a block ends.
 */
export interface ParsonsPuzzleProps extends StageProps<ParsonsQuestion> {
  /** The game's own line renderer — Java lines highlighted as Java, Python as
   *  Python. The puzzle is the same either way; only the colours are not. */
  CodeLine: React.ComponentType<{ text: string }>;
}

export default function ParsonsPuzzle({ question, submit, CodeLine }: ParsonsPuzzleProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);

  if (!question) return null;

  const freeIndent = question.indents == null;
  const current: Draft =
    draft && draft.questionId === question.id
      ? draft
      : { questionId: question.id, order: [], indents: [] };
  const { order, indents } = current;

  const update = (next: Partial<Draft>) => setDraft({ ...current, ...next });
  const pool = question.lines.map((_, index) => index).filter((index) => !order.includes(index));

  const place = (line: number) => {
    // A new line starts at the indent of the one above it — the usual next guess.
    const indent = freeIndent ? (indents.at(-1) ?? 0) : (question.indents?.[line] ?? 0);
    update({ order: [...order, line], indents: [...indents, indent] });
  };

  const remove = (position: number) => {
    update({
      order: order.filter((_, index) => index !== position),
      indents: indents.filter((_, index) => index !== position),
    });
  };

  const move = (position: number, by: number) => {
    const target = position + by;
    if (target < 0 || target >= order.length) return;
    const nextOrder = [...order];
    const nextIndents = [...indents];
    [nextOrder[position], nextOrder[target]] = [nextOrder[target], nextOrder[position]];
    [nextIndents[position], nextIndents[target]] = [nextIndents[target], nextIndents[position]];
    update({ order: nextOrder, indents: nextIndents });
  };

  const setIndent = (position: number, by: number) => {
    const next = [...indents];
    next[position] = Math.min(MAX_INDENT, Math.max(0, next[position] + by));
    update({ indents: next });
  };

  const complete = pool.length === 0;

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col gap-4">
      <p className="text-center text-gray-500">
        {t(question.captionKey)} — {t(freeIndent ? "parsons.withIndent" : "parsons.plain")}
      </p>

      {/* The program being built */}
      <div className="min-h-[5rem] rounded-xl border-2 border-dashed border-game-200 bg-game-50 p-2">
        {order.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">{t("parsons.empty")}</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {order.map((line, position) => (
              <li
                key={position}
                className="flex items-center gap-1 rounded-lg border border-game-200 bg-white px-2 py-1"
              >
                {freeIndent && (
                  <>
                    <IconButton
                      label={t("parsons.outdent")}
                      onClick={() => setIndent(position, -1)}
                      disabled={indents[position] === 0}
                    >
                      ◀
                    </IconButton>
                    <IconButton
                      label={t("parsons.indent")}
                      onClick={() => setIndent(position, 1)}
                      disabled={indents[position] === MAX_INDENT}
                    >
                      ▶
                    </IconButton>
                  </>
                )}
                <code className="flex-1 overflow-x-auto whitespace-pre font-mono text-sm text-slate-800 sm:text-base">
                  {"    ".repeat(indents[position])}
                  <CodeLine text={question.lines[line]} />
                </code>
                <IconButton label={t("parsons.up")} onClick={() => move(position, -1)} disabled={position === 0}>
                  ↑
                </IconButton>
                <IconButton
                  label={t("parsons.down")}
                  onClick={() => move(position, 1)}
                  disabled={position === order.length - 1}
                >
                  ↓
                </IconButton>
                <IconButton label={t("parsons.back")} onClick={() => remove(position)}>
                  ✕
                </IconButton>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* The lines still waiting */}
      <div className="flex flex-col gap-1">
        {pool.map((line) => (
          <button
            key={line}
            onClick={() => place(line)}
            className="overflow-x-auto rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-left font-mono text-sm whitespace-pre text-slate-800 transition-colors hover:border-game-solid hover:bg-game-50 sm:text-base"
          >
            {!freeIndent && "    ".repeat(question.indents?.[line] ?? 0)}
            <CodeLine text={question.lines[line]} />
          </button>
        ))}
      </div>

      <StageActionBar>
        <GameButton
          onClick={() => complete && submit(JSON.stringify({ order, indents }))}
          disabled={!complete}
        >
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}
