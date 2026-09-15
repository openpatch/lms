import type {
  BugQuestion,
  CodeAnswerQuestion,
  CodeChoiceQuestion,
  LogicQuestion,
  StructogramQuestion,
} from "../../../../shared/games/java";
import { useTranslation } from "react-i18next";
import { CodeLine } from "../components/CodeBlock";
import StructogramView from "../components/Structogram";

/**
 * The right answer on its own, and what a stored answer means, for the host's
 * debrief after a round.
 *
 * The review rows say the same things to one player about their own answer.
 * These say them to a room about everybody's, which is a different sentence
 * and a different size — and they are needed for the one case a review cannot
 * reach: the question nobody got right, where the answer is nowhere on screen.
 */

/** Six stations take a typed value, and the value is already readable. */
export function TypedSolution({ question }: { question: CodeAnswerQuestion }) {
  return <span className="font-mono">{question.expected.join(" ")}</span>;
}

/** Two stations offer their answers, so a stored one is an index. */
export function ChoiceSolution({ question }: { question: CodeChoiceQuestion }) {
  return <span className="font-mono">{question.options[question.answerIndex]}</span>;
}

export function LogicSolution({ question }: { question: LogicQuestion }) {
  const text = question.kind === "reading" ? question.options[question.answerIndex] : String(question.answer);
  return (
    <span className="font-mono">
      <CodeLine text={text} />
    </span>
  );
}

export function StructogramSolution({ question }: { question: StructogramQuestion }) {
  return <StructogramView nodes={question.options[question.answerIndex]} className="w-48" />;
}

export function BugSolution({ question }: { question: BugQuestion }) {
  const { t } = useTranslation();
  return (
    <span>
      {t("games.java.bugs.line", { line: question.errorLine + 1 })} — {t(question.reasonKey)}
    </span>
  );
}

