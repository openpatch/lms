import { useTranslation } from "react-i18next";
import type {
  BuildQuestion,
  EvaluateQuestion,
  TermTask,
  ZeroQuestion,
} from "../../../../shared/games/terme";
import type { PlayerAnswer } from "../../../../shared/types";
import type { StageReviewProps } from "../../../lib/game-registry";
import { ReviewLine } from "../../../components/RoundReview";
import MathTex from "../../../components/Math";

/** "Nicht beantwortet", for the questions the round ran out on. */
function Missing() {
  const { t } = useTranslation();
  return <span className="text-gray-400">{t("game.noAnswer")}</span>;
}

/** What the player wrote into the math field, the way they wrote it. */
function GivenTerm({ answer }: { answer: PlayerAnswer | undefined }) {
  const { t } = useTranslation();
  return (
    <ReviewLine label={t("game.yourAnswer")}>
      {answer ? <MathTex tex={answer.answer} /> : <Missing />}
    </ReviewLine>
  );
}

function Solution({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return <ReviewLine label={t("game.correctAnswer")}>{children}</ReviewLine>;
}

/**
 * Every stage that shows a term and takes one back — collect, expand, factor,
 * binomial, fraction, rearrange, inequality and the "value" half of evaluate.
 */
export function TermReview({ question, answer }: StageReviewProps<TermTask>) {
  return (
    <>
      <MathTex tex={question.termLatex} block className="text-xl text-gray-800" />
      <GivenTerm answer={answer} />
      {!answer?.correct && (
        <Solution>
          <MathTex tex={question.solutionLatex} />
        </Solution>
      )}
    </>
  );
}

/** Which of the four terms fits the story. */
export function BuildReview({ question, answer }: StageReviewProps<BuildQuestion>) {
  const { t } = useTranslation();
  const chosen = answer ? question.options[Number(answer.answer)] : undefined;
  return (
    <>
      <p className="text-sm text-gray-800">
        <span className="mr-1">{question.icon}</span>
        {t(question.contextKey, question.numbers)}
      </p>
      <ReviewLine label={t("game.yourAnswer")}>
        {chosen ? <MathTex tex={chosen} /> : <Missing />}
      </ReviewLine>
      {!answer?.correct && (
        <Solution>
          <MathTex tex={question.options[question.correct]} />
        </Solution>
      )}
    </>
  );
}

/** Work the term out, or say whether the two terms are worth the same. */
export function EvaluateReview(props: StageReviewProps<EvaluateQuestion>) {
  const { t } = useTranslation();
  const { question, answer } = props;
  if (question.ask !== "equivalent") return <TermReview {...props} />;

  const said = (value: boolean) => t(value ? "games.terme.evaluate.yes" : "games.terme.evaluate.no");
  return (
    <>
      <MathTex
        tex={`${question.termLatex} \\overset{?}{=} ${question.otherLatex}`}
        block
        className="text-xl text-gray-800"
      />
      <ReviewLine label={t("game.yourAnswer")}>
        {answer ? said(answer.answer === "true") : <Missing />}
      </ReviewLine>
      {!answer?.correct && <Solution>{said(question.equivalent)}</Solution>}
    </>
  );
}

/** The roots of a product that is zero. */
export function ZeroReview({ question, answer }: StageReviewProps<ZeroQuestion>) {
  const { t } = useTranslation();
  return (
    <>
      <MathTex tex={`${question.termLatex} = 0`} block className="text-xl text-gray-800" />
      <ReviewLine label={t("game.yourAnswer")}>{answer ? answer.answer : <Missing />}</ReviewLine>
      {!answer?.correct && (
        <Solution>
          <MathTex tex={question.solutionLatex} />
        </Solution>
      )}
    </>
  );
}
