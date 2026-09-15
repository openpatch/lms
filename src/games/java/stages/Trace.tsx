import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CodeAnswerQuestion } from "../../../../shared/games/java";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import CodeBlock from "../components/CodeBlock";

/**
 * The body of six stations: read the listing, be the machine, write down what
 * comes out. Only the generator behind them differs — output, variables, loops,
 * methods, arrays and sorting all ask the same thing of the player.
 */
export default function TraceStage({ question, submit }: StageProps<CodeAnswerQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [question?.id]);

  if (!question) return null;

  // Tagging the draft with its question keeps an answer from leaking into the next one.
  const value = draft?.questionId === question.id ? draft.value : "";
  const multiline = question.expected.length > 1;

  const send = () => {
    if (!value.trim()) return;
    submit(value.trim());
  };

  return (
    <div
      key={question.id}
      className="animate-question-in flex w-full max-w-xl flex-col items-center gap-4"
    >
      {question.noteKey && (
        <p className="text-sm text-game-ink">{t(question.noteKey, { value: question.noteArg })}</p>
      )}

      <CodeBlock lines={question.code} />

      <p className="text-center text-gray-500">
        {t(`games.java.ask.${question.ask}`, { name: question.askArg })}
      </p>

      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        onChange={(event) => setDraft({ questionId: question.id, value: event.target.value })}
        onKeyDown={(event) => event.key === "Enter" && send()}
        placeholder={t(multiline ? "games.java.answerSeveral" : "games.java.answerOne")}
        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center font-mono text-xl focus:border-game-solid focus:outline-none"
      />

      {multiline && (
        <p className="text-center text-xs text-gray-400">
          {t("games.java.answerHint", { count: question.expected.length })}
        </p>
      )}

      <StageActionBar>
        <GameButton onClick={send} disabled={!value.trim()}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function TraceRulesExample() {
  return (
    <div className="flex flex-col items-center gap-3">
      <CodeBlock
        lines={["void main() {", "    int zahl = 7;", "    IO.println(zahl / 2);", "}"]}
        className="max-w-xs"
      />
      <div className="flex items-center gap-3 text-gray-500">
        <span>&rarr;</span>
        <span className="rounded-lg border-2 border-gray-200 px-3 py-1 font-mono text-lg text-gray-700">
          3
        </span>
      </div>
    </div>
  );
}
