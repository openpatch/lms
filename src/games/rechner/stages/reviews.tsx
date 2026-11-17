import i18n from "i18next";
import { useTranslation } from "react-i18next";
import type {
  BinaryCalcAnswer,
  BinaryCalcQuestion,
  BinaryQuestion,
  BuildQuestion,
  CpuQuestion,
  EvaQuestion,
  GateQuestion,
  HexQuestion,
} from "../../../../shared/games/rechner";
import { benchmark, resolvePicks, totalPrice, type PartOffer } from "../../../../shared/rechner-pc";
import { evaluate, formula, outputColumn } from "../../../../shared/logic-circuit";
import { encode, mnemonic } from "../../../../shared/mini-prozessor";
import type { StageReviewProps } from "../../../lib/game-registry";
import { ReviewLine } from "../../../components/RoundReview";
import { Given, Missing, Solution } from "../../../components/review-parts";
import {
  buildOf,
  euro,
  evaItemKey,
  evaOptionKey,
  parseAnswer as parse,
  partLabel,
  prozessorLabel,
  termText,
  writeSolution,
} from "../labels";
import { Binary } from "./Binaer";
import { Swatch } from "./Farbcode";

/**
 * What a player sees once the round is over: each question put back on
 * screen in a line, what they answered, and — when that was not it — what it
 * was. The answer labels at the bottom say the same for the host's debrief.
 */

function BuildLine({ parts }: { parts: PartOffer[] }) {
  const { i18n: lang } = useTranslation();
  return (
    <span>
      {parts.map(partLabel).join(" · ")}{" "}
      <span className="text-gray-400">
        ({euro(totalPrice(parts), lang.language)}, {benchmark(parts).toLocaleString(lang.language)})
      </span>
    </span>
  );
}

export function BauenReview({ question, answer }: StageReviewProps<BuildQuestion>) {
  const { t } = useTranslation();
  const mine = buildOf(question, answer);
  const best = resolvePicks(question.parts, question.bestPicks);
  const over = mine != null && totalPrice(mine) > question.budget;
  return (
    <>
      <ReviewLine label={t("games.rechner.build.budget")}>{euro(question.budget, i18n.language)}</ReviewLine>
      <Given answer={answer}>{mine ? <BuildLine parts={mine} /> : <Missing />}</Given>
      {over && <p className="text-sm text-rose-600">{t("games.rechner.build.overBudget")}</p>}
      {best && (mine == null || benchmark(mine) < question.bestScore) && (
        <Solution>
          <BuildLine parts={best} />
        </Solution>
      )}
    </>
  );
}

export function EvaReview({ question, answer }: StageReviewProps<EvaQuestion>) {
  const { t } = useTranslation();
  const given = answer ? question.options[Number(answer.answer)] : undefined;
  const truth = question.options[question.answerIndex];
  return (
    <>
      <p className="font-medium text-gray-800">{t(evaItemKey(question))}</p>
      <Given answer={answer}>{given ? t(evaOptionKey(question, given)) : "–"}</Given>
      {given !== truth && truth && <Solution>{t(evaOptionKey(question, truth))}</Solution>}
    </>
  );
}

export function BinaerReview({ question, answer }: StageReviewProps<BinaryQuestion>) {
  const binary = question.value.toString(2).padStart(question.bits, "0");
  const toDecimal = question.direction === "toDecimal";
  return (
    <>
      <p className="text-gray-800">
        {toDecimal ? <Binary bits={binary} /> : <span className="font-mono">{question.value}</span>}
      </p>
      <Given answer={answer}>
        {answer && (toDecimal ? <span className="font-mono">{answer.answer}</span> : <Binary bits={answer.answer} />)}
      </Given>
      {!answer?.correct && (
        <Solution>{toDecimal ? <span className="font-mono">{question.value}</span> : <Binary bits={binary} />}</Solution>
      )}
    </>
  );
}

function HexChip({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Swatch code={code} className="h-4 w-6 align-middle" />
      <span className="font-mono">{code}</span>
    </span>
  );
}

export function FarbcodeReview({ question, answer }: StageReviewProps<HexQuestion>) {
  const given = answer ? question.options[Number(answer.answer)] : undefined;
  return (
    <>
      <Given answer={answer}>{given ? <HexChip code={given} /> : "–"}</Given>
      {given !== question.target && (
        <Solution>
          <HexChip code={question.target} />
        </Solution>
      )}
    </>
  );
}

export function RechnenReview({ question, answer }: StageReviewProps<BinaryCalcQuestion>) {
  const { t } = useTranslation();
  const sent = parse<BinaryCalcAnswer>(answer);
  const symbol = question.op === "add" ? "+" : "·";
  const truth = question.result.toString(2).padStart(question.width, "0");
  const overflowWord = (on: boolean | undefined) =>
    t(on ? "games.rechner.calc.overflowYes" : "games.rechner.calc.overflowNo");
  return (
    <>
      <p className="font-mono text-gray-800">
        {question.a.toString(2).padStart(question.aBits, "0")} {symbol}{" "}
        {question.b.toString(2).padStart(question.bBits, "0")}{" "}
        <span className="text-gray-400">
          ({question.a} {symbol} {question.b})
        </span>
      </p>
      <Given answer={answer}>
        {sent && (
          <span className="font-mono">
            {sent.bits}
            {question.register && ` · ${t("games.rechner.calc.overflow")}: ${overflowWord(sent.overflow)}`}
          </span>
        )}
      </Given>
      {!answer?.correct && (
        <Solution>
          <span className="font-mono">
            {truth} <span className="text-gray-400">({question.result})</span>
            {question.register && ` · ${t("games.rechner.calc.overflow")}: ${overflowWord(question.overflow)}`}
          </span>
        </Solution>
      )}
    </>
  );
}

export function GatterReview({ question, answer }: StageReviewProps<GateQuestion>) {
  const values = Object.fromEntries(question.inputs.map((name, i) => [name, question.assignment[i]]));
  const truth =
    question.task === "ausgang" ? String(evaluate(question.circuit, values)) : outputColumn(question.circuit, question.inputs);
  return (
    <>
      <p className="font-mono text-gray-800">
        Y = {formula(question.circuit)}
        {question.task === "ausgang" && (
          <span className="text-gray-400"> · {question.inputs.map((n, i) => `${n}=${question.assignment[i]}`).join(", ")}</span>
        )}
      </p>
      <Given answer={answer}>{answer && <span className="font-mono">{answer.answer.replace(/x/g, "·")}</span>}</Given>
      {!answer?.correct && (
        <Solution>
          <span className="font-mono">{truth}</span>
        </Solution>
      )}
    </>
  );
}

export function ProzessorReview({ question, answer }: StageReviewProps<CpuQuestion>) {
  const { t } = useTranslation();
  const label = answer ? prozessorLabel(question, answer.answer) : undefined;
  let prompt: React.ReactNode;
  let truth: string;
  switch (question.task) {
    case "encode":
      prompt = mnemonic(encode(question.op, question.addr));
      truth = String(question.value);
      break;
    case "decode":
      prompt = question.value;
      truth = mnemonic(question.value);
      break;
    case "trace":
      prompt = t("games.rechner.cpu.traceReview", { cell: question.resultCell });
      truth = String(question.expected);
      break;
    case "write":
      prompt = `${termText(question.terms, t("games.rechner.cpu.cell"))} → ${t("games.rechner.cpu.cell")} ${question.resultCell}`;
      truth = writeSolution(question);
      break;
  }
  return (
    <>
      <p className="font-mono text-gray-800">{prompt}</p>
      <Given answer={answer}>{label && <span className="font-mono">{label}</span>}</Given>
      {!answer?.correct && (
        <Solution>
          <span className="font-mono">{truth}</span>
        </Solution>
      )}
    </>
  );
}

