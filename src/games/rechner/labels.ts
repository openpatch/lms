// Plain functions the stages, the reviews and the host's debrief share. Kept
// apart from the components so that each file stays one or the other.
import i18n from "i18next";
import type {
  BinaryCalcAnswer,
  BinaryCalcQuestion,
  BuildAnswer,
  BuildQuestion,
  CpuQuestion,
  CpuTerm,
  EvaQuestion,
  HexQuestion,
} from "../../../shared/games/rechner";
import { benchmark, resolvePicks, totalPrice, type PartOffer } from "../../../shared/rechner-pc";
import { encode, mnemonic } from "../../../shared/mini-prozessor";
import type { PlayerAnswer } from "../../../shared/types";

/** The words a question's options stand for, whichever kind of question it is. */
export function evaOptionKey(question: EvaQuestion, option: string): string {
  return question.kind === "eva" ? `games.rechner.roles.${option}` : `games.rechner.parts.${option}`;
}

export function evaItemKey(question: EvaQuestion): string {
  return question.kind === "eva" ? `games.rechner.devices.${question.item}` : `games.rechner.jobs.${question.item}`;
}

/** A colour code's three channels, for the swatches that have no text. */
export function describeHex(code: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(code.slice(1, 3), 16),
    g: parseInt(code.slice(3, 5), 16),
    b: parseInt(code.slice(5, 7), 16),
  };
}

/** "Zelle 10 + Zelle 11 − Zelle 12" */
export function termText(terms: CpuTerm[], cellWord: string): string {
  return terms
    .map((term, i) => `${i === 0 ? "" : term.sign > 0 ? " + " : " − "}${cellWord} ${term.cell}`)
    .join("");
}

/** "Volt 6500" for a processor, "16 GB DDR5" for memory — enough to tell
 *  two offers of the same kind apart in a list. */
export function partLabel(part: PartOffer): string {
  if (part.kind === "ram") return `${part.name} DDR${part.specs.ddr}`;

  if (part.kind === "storage") return `${part.name} ${part.specs.medium === "nvme" ? "NVMe" : ""}`.trim();
  return part.name;
}

export function euro(value: number, language: string): string {
  return value.toLocaleString(language, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function parseAnswer<T>(answer: PlayerAnswer | string | undefined): T | null {
  if (answer == null) return null;
  try {
    return JSON.parse(typeof answer === "string" ? answer : answer.answer) as T;
  } catch {
    return null;
  }
}

export function buildOf(question: BuildQuestion, answer: PlayerAnswer | string | undefined): PartOffer[] | null {
  return resolvePicks(question.parts, parseAnswer<BuildAnswer>(answer)?.picks);
}

/** One program that does it: load the first term, add or take the rest, store, stop. */
export function writeSolution(question: CpuQuestion): string {
  return [
    `LADE ${question.terms[0]?.cell ?? 0}`,
    ...question.terms.slice(1).map((term) => `${term.sign > 0 ? "ADDIERE" : "SUBTRAHIERE"} ${term.cell}`),
    `SPEICHERE ${question.resultCell}`,
    "STOPP",
  ].join("; ");
}

// ---------------------------------------------------------------------------
// Answer labels, for the host's debrief
// ---------------------------------------------------------------------------

export function bauenLabel(question: BuildQuestion, answer: string): string {
  const parts = buildOf(question, answer);
  if (!parts) return "–";
  if (totalPrice(parts) > question.budget) return i18n.t("games.rechner.build.overBudget");
  return `${benchmark(parts).toLocaleString(i18n.language)} / ${question.bestScore.toLocaleString(i18n.language)}`;
}

export function evaLabel(question: EvaQuestion, answer: string): string {
  const option = question.options[Number(answer)];
  return option ? i18n.t(evaOptionKey(question, option)) : "–";
}

export function farbcodeLabel(question: HexQuestion, answer: string): string {
  return question.options[Number(answer)] ?? "–";
}

export function rechnenLabel(question: BinaryCalcQuestion, answer: string): string {
  const sent = parseAnswer<BinaryCalcAnswer>(answer);
  if (!sent) return "–";
  return question.register ? `${sent.bits}${sent.overflow ? " Ü" : ""}` : sent.bits;
}

export function prozessorLabel(question: CpuQuestion, answer: string): string {
  if (question.task === "decode") {
    const [op, addr] = answer.split(",").map(Number);
    return Number.isInteger(op) && Number.isInteger(addr) ? mnemonic(encode(op, addr)) : "–";
  }
  if (question.task === "write") {
    const program = parseAnswer<{ program?: number[] }>(answer)?.program;
    return Array.isArray(program) ? program.map((v) => mnemonic(Number(v))).join("; ") : "–";
  }
  return answer;
}
