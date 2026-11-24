import { useTranslation } from "react-i18next";
import type {
  GraphQuestion,
  ModellQuestion,
  TabelleQuestion,
  VorschriftQuestion,
} from "../../../../shared/games/zuordnung";
import { zuordnungNumber } from "../../../../shared/games/zuordnung";
import type { StageReviewProps } from "../../../lib/game-registry";
import Icon from "../../../components/icons";
import MathTex from "../../../components/Math";
import DataTable from "../components/DataTable";
import { Given, Solution } from "../../../components/review-parts";

/** What a player saw, what they picked, and what it should have been. */
export function ModellReview({ question, answer }: StageReviewProps<ModellQuestion>) {
  const { t } = useTranslation();
  const picked = answer ? question.optionKeys[Number(answer.answer)] : undefined;
  return (
    <>
      <p className="text-sm text-gray-800">
        <Icon name={question.icon} className="mr-1" />
        {t(question.setupKey, question.params)}
      </p>
      <Given answer={answer}>{picked ? t(picked) : null}</Given>
      {!answer?.correct && <Solution>{t(question.optionKeys[question.answerIndex])}</Solution>}
    </>
  );
}

/** The table with the gap filled in — the review is the worked Dreisatz. */
export function TabelleReview({ question, answer }: StageReviewProps<TabelleQuestion>) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-gray-800">
        <Icon name={question.icon} className="mr-1" />
        {t(question.setupKey)}
      </p>
      <DataTable
        rows={question.rows.map((row, index) =>
          index === question.answerRow
            ? {
                x: row.x ?? Number(question.answer.replace(",", ".")),
                y: row.y ?? Number(question.answer.replace(",", ".")),
              }
            : row,
        )}
        xLabelKey={question.xLabelKey}
        yLabelKey={question.yLabelKey}
        xUnit={question.xUnit}
        yUnit={question.yUnit}
        className="text-base"
      />
      <Given answer={answer}>
        {answer ? (
          <>
            {answer.answer} {question.blank === "y" ? question.yUnit : question.xUnit}
          </>
        ) : null}
      </Given>
      {!answer?.correct && (
        <Solution>
          {question.answer} {question.blank === "y" ? question.yUnit : question.xUnit}
        </Solution>
      )}
      <p className="text-sm text-gray-600">
        {question.kind === "proportional" ? "Quotientengleichheit: " : "Produktgleichheit: "}
        {question.explainFirst} &nbsp;→&nbsp; {question.explainSecond}
      </p>
    </>
  );
}

/** The curve as a model, or the value the marked point asked for. */
export function GraphReview({ question, answer }: StageReviewProps<GraphQuestion>) {
  const { t } = useTranslation();
  if (question.task === "klasse") {
    const picked = answer ? question.optionKeys[Number(answer.answer)] : undefined;
    return (
      <>
        <p className="text-sm text-gray-800">{t("games.zuordnung.prompts.graphKlasse")}</p>
        <Given answer={answer}>{picked ? t(picked) : null}</Given>
        {!answer?.correct && <Solution>{t(question.optionKeys[question.answerIndex])}</Solution>}
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-gray-800">
        <Icon name={question.icon} className="mr-1" />
        {t(question.setupKey)}
      </p>
      <p className="text-sm text-gray-600">
        {t(question.xLabelKey)} = {question.given.x} → {question.given.y} {question.yUnit};
        {" "}
        {t("games.zuordnung.prompts.graphAblesen", { x: question.askX })}
      </p>
      <Given answer={answer}>
        {answer ? (
          <>
            {answer.answer} {question.yUnit}
          </>
        ) : null}
      </Given>
      {!answer?.correct && (
        <Solution>
          {question.answer} {question.yUnit}
        </Solution>
      )}
      <p className="text-sm text-gray-600">
        {question.curve.type === "proportional"
          ? `${zuordnungNumber(question.given.y)} : ${question.given.x} = ${zuordnungNumber((question.curve.k ?? 1))} · ${question.askX} = ${question.answer}`
          : `${question.given.x} · ${question.given.y} = ${question.curve.p ?? 1}; ${question.curve.p ?? 1} : ${question.askX} = ${question.answer}`}
      </p>
    </>
  );
}

/** The table or graph, and the Vorschrift that was picked for it. */
export function VorschriftReview({ question, answer }: StageReviewProps<VorschriftQuestion>) {
  const { t } = useTranslation();
  const picked = answer ? question.options[Number(answer.answer)] : undefined;
  return (
    <>
      <p className="text-sm text-gray-800">
        <Icon name={question.icon} className="mr-1" />
        {t(question.setupKey)}
      </p>
      {question.source === "tabelle" && (
        <DataTable
          rows={question.rows ?? []}
          xLabelKey={question.xLabelKey}
          yLabelKey={question.yLabelKey}
          xUnit={question.xUnit}
          yUnit={question.yUnit}
          className="text-base"
        />
      )}
      {question.source === "graph" && question.point && (
        <p className="text-sm text-gray-600">
          {t("games.zuordnung.prompts.pointOnGraph", question.point)}
        </p>
      )}
      <Given answer={answer}>{picked ? <MathTex tex={picked} /> : null}</Given>
      {!answer?.correct && (
        <Solution>
          <MathTex tex={question.options[question.answerIndex]} />
        </Solution>
      )}
    </>
  );
}
