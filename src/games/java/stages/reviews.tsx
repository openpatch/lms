import { useTranslation } from "react-i18next";
import type {
  BugQuestion,
  RobotQuestion,
  CodeAnswerQuestion,
  CodeChoiceQuestion,
  LogicQuestion,
  StructogramQuestion,
} from "../../../../shared/games/java";
import type { StageReviewProps } from "../../../lib/game-registry";
import { Given, Solution } from "../../../components/review-parts";
import CodeBlock, { CodeLine } from "../components/CodeBlock";
import StructogramView from "../components/Structogram";
import RobotGrid from "../components/RobotGrid";
import { cellName, readCell } from "./answer-labels";

/**
 * What a player sees once the round is over. A station that asks "run this in
 * your head" is only worth as much as the moment afterwards, when the listing
 * and the right answer are on screen together — so every station of this game
 * brings a review row rather than only its points.
 */

/** The six stations that take a typed value: listing, answer, right answer. */
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

/** Branch and types: which option was picked, and — when wrong — why. */
export function ChoiceReview({ question, answer }: StageReviewProps<CodeChoiceQuestion>) {
  const { t } = useTranslation();
  const chosen = answer ? question.options[Number(answer.answer)] : undefined;
  return (
    <>
      {question.code.length > 0 ? (
        <CodeBlock lines={question.code} compact />
      ) : (
        <p className="text-sm text-gray-800">
          {t(question.promptKey, {
            what: question.promptArg ? t(`games.java.typeCase.${question.promptArg}`) : "",
          })}
        </p>
      )}
      <Given answer={answer}>
        <span className="font-mono">{chosen}</span>
      </Given>
      {!answer?.correct && (
        <Solution>
          <span className="font-mono">{question.options[question.answerIndex]}</span>
        </Solution>
      )}
      {!answer?.correct && question.reasonKey && (
        <p className="text-xs text-gray-500">{t(question.reasonKey)}</p>
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

export function StructogramReview({ question, answer }: StageReviewProps<StructogramQuestion>) {
  const { t } = useTranslation();
  return (
    <>
      <CodeBlock lines={question.code} compact />
      {answer?.correct ? (
        <Given answer={answer}>
          <span>{t("games.java.structogram.right")}</span>
        </Given>
      ) : (
        <Solution>
          <StructogramView nodes={question.options[question.answerIndex]} className="mt-1 w-48" />
        </Solution>
      )}
    </>
  );
}

/**
 * The route, drawn.
 *
 * A wrong square on its own says nothing about where the reading went astray,
 * so the review puts the whole drive back on the floor — numbered, so it can be
 * followed a step at a time — with the player's own square marked beside the
 * one the robot actually reached.
 */
export function RobotReview({ question, answer }: StageReviewProps<RobotQuestion>) {
  const picked = readCell(answer?.answer);
  return (
    <>
      <CodeBlock lines={question.code} compact />
      <div className="max-w-[13rem] pt-1">
        <RobotGrid
          width={question.width}
          height={question.height}
          start={question.start}
          facing={question.facing}
          path={question.path}
          answer={question.answer}
          answerFacing={question.answerFacing}
          picked={picked}
        />
      </div>
      <Given answer={answer}>
        {picked ? <span className="font-mono">{cellName(picked)}</span> : null}
      </Given>
      {!answer?.correct && (
        <Solution>
          <span className="font-mono">{cellName(question.answer)}</span>
        </Solution>
      )}
    </>
  );
}

export function BugsReview({ question, answer }: StageReviewProps<BugQuestion>) {
  const { t } = useTranslation();
  return (
    <>
      <CodeBlock lines={question.code} numbered compact />
      <Given answer={answer}>
        <span>{t("games.java.bugs.line", { line: Number(answer?.answer) + 1 })}</span>
      </Given>
      <Solution>
        <span>
          {t("games.java.bugs.line", { line: question.errorLine + 1 })} — {t(question.reasonKey)}
        </span>
      </Solution>
    </>
  );
}
