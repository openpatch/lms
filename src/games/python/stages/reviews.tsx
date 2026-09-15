import { useTranslation } from "react-i18next";
import type {
  BugQuestion,
  CodeAnswerQuestion,
  CodeChoiceQuestion,
  LogicQuestion,
  ParsonsAnswer,
  ParsonsQuestion,
  TurtleQuestion,
} from "../../../../shared/games/python";
import type { PlayerAnswer } from "../../../../shared/types";
import type { StageReviewProps } from "../../../lib/game-registry";
import { Given, Missing, Solution } from "../../../components/review-parts";
import CodeBlock, { CodeLine } from "../components/CodeBlock";
import TurtlePicture from "../components/TurtlePicture";

/**
 * What a player sees once the round is over.
 *
 * A station that asks "run this in your head" is only worth as much as the
 * moment afterwards, when the listing and the right answer are on screen
 * together — and a player who wrote 2.33 for 7 // 3 learns nothing from being
 * told they scored nothing.
 */

/** The five stations that take a typed value: listing, answer, right answer. */
export function TraceReview({ question, answer }: StageReviewProps<CodeAnswerQuestion>) {
  return (
    <>
      <CodeBlock lines={question.code} compact />
      <Given answer={answer} />
      {!answer?.correct && (
        <Solution>
          <span className="font-mono">{question.expected.join(" ")}</span>
        </Solution>
      )}
    </>
  );
}

/** Branch: which of the texts the chain can print was it? */
export function BranchReview({ question, answer }: StageReviewProps<CodeChoiceQuestion>) {
  const { t } = useTranslation();
  const show = (option: string | undefined) =>
    option === "" ? t("games.python.noOutput") : (option ?? "");
  const chosen = answer ? question.options[Number(answer.answer)] : undefined;
  return (
    <>
      <CodeBlock lines={question.code} compact />
      <Given answer={answer}>
        <span className="font-mono">{show(chosen)}</span>
      </Given>
      {!answer?.correct && (
        <Solution>
          <span className="font-mono">{show(question.options[question.answerIndex])}</span>
        </Solution>
      )}
    </>
  );
}

export function LogicReview({ question, answer }: StageReviewProps<LogicQuestion>) {
  const solution =
    question.kind === "reading" ? question.options[question.answerIndex] : String(question.answer);
  const given =
    answer && question.kind === "reading"
      ? question.options[Number(answer.answer)]
      : answer?.answer;
  return (
    <>
      {question.kind === "value" && question.code.length > 0 && (
        <CodeBlock lines={question.code} compact />
      )}
      <p className="font-mono text-sm text-gray-800">
        <CodeLine text={question.expression} />
      </p>
      <Given answer={answer}>
        <span className="font-mono">{given}</span>
      </Given>
      {!answer?.correct && (
        <Solution>
          <span className="font-mono">{solution}</span>
        </Solution>
      )}
    </>
  );
}

/** Turtle: the program, and the picture it actually draws. */
export function TurtleReview({ question, answer }: StageReviewProps<TurtleQuestion>) {
  const chosen = answer ? Number(answer.answer) : null;
  return (
    <>
      <CodeBlock lines={question.code} compact />
      <div className="flex items-center gap-3">
        <Given answer={answer}>
          {chosen != null && question.options[chosen] ? (
            <span className="inline-block h-12 w-12 align-middle">
              <TurtlePicture drawing={question.options[chosen]} />
            </span>
          ) : (
            <Missing />
          )}
        </Given>
        {!answer?.correct && (
          <Solution>
            <span className="inline-block h-12 w-12 align-middle">
              <TurtlePicture drawing={question.options[question.answerIndex]} />
            </span>
          </Solution>
        )}
      </div>
    </>
  );
}

/** Parsons: the program the lines were supposed to make. */
export function ParsonsReview({ question, answer }: StageReviewProps<ParsonsQuestion>) {
  const { t } = useTranslation();
  let placed: ParsonsAnswer | null = null;
  try {
    placed = answer ? (JSON.parse(answer.answer) as ParsonsAnswer) : null;
  } catch {
    placed = null;
  }
  const indentOf = (position: number, card: number) =>
    question.indents ? question.indents[card] : (placed?.indents?.[position] ?? 0);
  const asPut =
    placed?.order?.map((card, position) =>
      card == null || question.lines[card] == null
        ? ""
        : "    ".repeat(indentOf(position, card)) + question.lines[card],
    ) ?? [];
  const asMeant = question.solution.map(
    (card, position) => "    ".repeat(question.solutionIndents[position]) + question.lines[card],
  );
  return (
    <>
      <p className="text-sm text-gray-800">{t(question.captionKey)}</p>
      {placed ? <CodeBlock lines={asPut} compact /> : <Missing />}
      {!answer?.correct && (
        <>
          <p className="text-xs text-gray-400">{t("game.correctAnswer")}</p>
          <CodeBlock lines={asMeant} compact />
        </>
      )}
    </>
  );
}

/** Bugs: the listing with its lines numbered, and which one was broken. */
export function BugsReview({ question, answer }: StageReviewProps<BugQuestion>) {
  const { t } = useTranslation();
  const line = (value: PlayerAnswer | undefined) =>
    value ? t("games.python.bugs.line", { line: Number(value.answer) + 1 }) : null;
  return (
    <>
      <CodeBlock lines={question.code} numbered compact />
      <Given answer={answer}>
        <span>{line(answer)}</span>
      </Given>
      <Solution>
        <span>
          {t("games.python.bugs.line", { line: question.errorLine + 1 })} — {t(question.reasonKey)}
        </span>
      </Solution>
    </>
  );
}
