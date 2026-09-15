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

/**
 * The picture over a station's rules: a listing the size of one the round will
 * ask, the question it will be asked with, and the answer it wants.
 *
 * The six stations share the component above because they genuinely ask the
 * player the same thing. They must not share this. The picture is the half of
 * the rules screen a class actually looks at, and one integer-division snippet
 * standing over "count the passes" teaches the shape of the wrong question.
 * The question line is the stage's own `games.java.ask.*`, so the example is
 * worded exactly as the round will word it.
 */
function TraceExample({
  lines,
  ask,
  askArg,
  answer,
}: {
  lines: string[];
  ask: string;
  askArg?: string;
  answer: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2">
      <CodeBlock lines={lines} className="max-w-xs" />
      <p className="text-sm text-gray-500">{t(`games.java.ask.${ask}`, { name: askArg })}</p>
      <div className="flex items-center gap-3 text-gray-500">
        <span>&rarr;</span>
        <span className="rounded-lg border-2 border-gray-200 px-3 py-1 font-mono text-lg text-gray-700">
          {answer}
        </span>
      </div>
    </div>
  );
}

/** output — two ints divided stay an int, which is the thing to look out for. */
export function OutputRulesExample() {
  return (
    <TraceExample
      lines={["void main() {", "    int zahl = 7;", "    IO.println(zahl / 2);", "}"]}
      ask="output"
      answer="3"
    />
  );
}

/** variables — `=` is not "is equal to", it is "gets the value of". */
export function VariablesRulesExample() {
  return (
    <TraceExample
      lines={["void main() {", "    int a = 4;", "    a = a + 3;", "    a = a * 2;", "}"]}
      ask="value"
      askArg="a"
      answer="14"
    />
  );
}

/** loops — every pass writes a line, and they are wanted in order. */
export function LoopsRulesExample() {
  return (
    <TraceExample
      lines={[
        "void main() {",
        "    for (int i = 1; i < 4; i++) {",
        "        IO.println(i * 2);",
        "    }",
        "}",
      ]}
      ask="output"
      answer="2 4 6"
    />
  );
}

/** methods — the call is what prints, and the arguments have an order. */
export function MethodsRulesExample() {
  return (
    <TraceExample
      lines={[
        "void main() {",
        "    IO.println(verdopple(5));",
        "}",
        "",
        "int verdopple(int zahl) {",
        "    return zahl * 2;",
        "}",
      ]}
      ask="call"
      answer="10"
    />
  );
}

/** arrays — counted from 0, so the second value sits at index 1. */
export function ArraysRulesExample() {
  return (
    <TraceExample
      lines={[
        "void main() {",
        "    int[] werte = {4, 9, 2, 7};",
        "    IO.println(werte[1]);",
        "}",
      ]}
      ask="output"
      answer="9"
    />
  );
}

/** sorting — a procedure carried out by hand, not a program read off. */
export function SortingRulesExample() {
  return (
    <TraceExample
      lines={["int[] werte = {5, 3, 8, 1};"]}
      ask="bubblePass"
      answer="3 5 1 8"
    />
  );
}
