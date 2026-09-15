import { useTranslation } from "react-i18next";
import type { BugQuestion } from "../../../../shared/games/java";
import type { StageProps } from "../../../lib/game-registry";
import CodeBlock from "../components/CodeBlock";

/**
 * One line of the program is broken; tapping it is the answer.
 *
 * The line the player picked last round is worth more than the point it scored,
 * so the mistake behind the previous listing stays on screen while the next one
 * is being read — "interpretieren Fehlermeldungen und korrigieren den
 * Quellcode" is a competence of its own in EF-V.
 */
export default function BugsStage({ question, data, playerId, submit }: StageProps<BugQuestion>) {
  const { t } = useTranslation();

  const answers = data.answers[playerId] ?? {};
  const answeredIds = Object.keys(answers)
    .map(Number)
    .sort((a, b) => a - b);
  const lastId = answeredIds.at(-1);
  const previous = lastId == null ? null : data.questions.find((item) => item.id === lastId);
  const verdict = lastId == null ? null : answers[lastId];

  if (!question) return null;

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      {previous && verdict && (
        <div
          className={`w-full rounded-xl border px-4 py-2 text-sm ${
            verdict.correct
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span className="font-bold">
            {verdict.correct ? "✓" : "✗"}{" "}
            {t("games.java.bugs.wasLine", { line: previous.errorLine + 1 })}
          </span>{" "}
          {t(previous.reasonKey)}
        </div>
      )}

      <p className="text-center text-gray-500">{t("games.java.bugsPrompt")}</p>

      <div key={question.id} className="animate-question-in w-full">
        <CodeBlock lines={question.code} numbered onPickLine={(index) => submit(String(index))} />
      </div>
    </div>
  );
}

export function BugsRulesExample() {
  return (
    <CodeBlock
      lines={["void main() {", "    int zahl = 7", "    IO.println(zahl);", "}"]}
      numbered
      marked={1}
      className="max-w-xs"
    />
  );
}
