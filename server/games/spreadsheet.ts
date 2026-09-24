import {
  spreadsheetSpec,
  type ChartKind,
  type ChartQuestion,
  type GrowthQuestion,
  type ReferenceQuestion,
  type SpreadsheetChoiceQuestion,
} from "../../shared/games/spreadsheet";
import { speedPoints } from "../../shared/framework";
import type { StageHandler } from "../framework";
import { createStageGame } from "../framework";

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function shuffleWithAnswer<T>(values: T[], answer: T): { options: T[]; answerIndex: number } {
  const options = [...values];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answerIndex: options.indexOf(answer) };
}

function hidden<Q extends SpreadsheetChoiceQuestion>(question: Q): Q {
  return { ...question, answerIndex: -1 };
}

function evaluateChoice(question: SpreadsheetChoiceQuestion, answer: string, questionMs: number) {
  const correct = Number(answer) === question.answerIndex;
  return { correct, points: correct ? speedPoints(questionMs / 1000, 2, 25) : 0 };
}

const PRODUCTS = [
  ["Fahrradlicht", 18],
  ["Powerbank", 25],
  ["Kopfhörer", 42],
  ["Tastatur", 55],
] as const;

function referenceQuestion(id: number): ReferenceQuestion {
  const usePercent = Math.random() < 0.6;
  const startRow = randomInt(2, 4);
  const fixedAddress = `$F$${randomInt(1, 3)}`;
  const value = usePercent ? pick([5, 10, 15, 20]) : pick([2, 3, 5, 8]);
  const operator = usePercent ? "*" : "+";
  const tail = usePercent ? `(1+${fixedAddress})` : fixedAddress;
  const correct = `=B${startRow}${operator}${tail}`;
  const formulas = [
    correct,
    `=$B$${startRow}${operator}${tail}`,
    `=B${startRow}${operator}${tail.replaceAll("$", "")}`,
    `=B$${startRow}${operator}${tail.replace("$F$", "F$")}`,
  ];
  const choice = shuffleWithAnswer([...new Set(formulas)], correct);
  const rows = PRODUCTS.slice(0, 3).map(([name, price], index) => ({
    cells: [startRow + index, name, price, index === 0 ? "?" : "↓ kopieren"],
  }));

  return {
    id,
    kind: "reference",
    promptKey: usePercent
      ? "games.spreadsheet.prompts.percentFormula"
      : "games.spreadsheet.prompts.feeFormula",
    promptParams: { row: startRow, address: fixedAddress, value },
    headers: ["", "A", "B", "C"],
    rows,
    parameterAddress: fixedAddress.replaceAll("$", ""),
    parameterValue: usePercent ? `${value} %` : `${value} €`,
    options: choice.options,
    answerIndex: choice.answerIndex,
  };
}

function growthQuestion(id: number): GrowthQuestion {
  const model: GrowthQuestion["model"] = Math.random() < 0.5 ? "linear" : "exponential";
  const start = pick([100, 200, 500, 1000]);
  const step = model === "linear" ? pick([20, 50, 100]) : pick([5, 10, 20]);
  const correct = model === "linear" ? "=B2+$E$1" : "=B2*(1+$E$1)";
  const formulas = [correct, "=B2+$E$1", "=B2*(1+$E$1)", "=$B$2*(1+E1)", "=B2*$E$1"];
  const choice = shuffleWithAnswer([...new Set(formulas)], correct);
  const values = Array.from({ length: 4 }, (_, index) => {
    if (model === "linear") return start + index * step;
    return Math.round(start * (1 + step / 100) ** index);
  });

  return {
    id,
    kind: "growth",
    model,
    promptKey: `games.spreadsheet.prompts.${model}Growth`,
    promptParams: { step },
    headers: ["", "A: Jahr", "B: Bestand"],
    rows: values.map((value, index) => ({ cells: [index + 2, index, value] })),
    parameterAddress: "E1",
    parameterValue: model === "linear" ? String(step) : `${step} %`,
    options: choice.options,
    answerIndex: choice.answerIndex,
  };
}

const CLIMATE = [
  { city: "Berlin", temps: [1, 6, 14, 19, 14, 7], rain: 570 },
  { city: "Madrid", temps: [7, 12, 19, 26, 21, 13], rain: 436 },
  { city: "Helsinki", temps: [-4, 1, 9, 17, 10, 3], rain: 650 },
  { city: "Lissabon", temps: [12, 15, 18, 23, 22, 17], rain: 774 },
] as const;
const MONTHS = ["Jan", "Mär", "Mai", "Jul", "Sep", "Nov"];

function chartQuestion(id: number): ChartQuestion {
  const climate = pick(CLIMATE);
  const compareCities = Math.random() < 0.45;
  const answer: ChartKind = compareCities ? "bar" : "line";
  const choice = shuffleWithAnswer<ChartKind>(["line", "bar", "pie", "scatter"], answer);

  return {
    id,
    kind: "chart",
    city: climate.city,
    promptKey: compareCities
      ? "games.spreadsheet.prompts.rainfallChart"
      : "games.spreadsheet.prompts.temperatureChart",
    promptParams: { city: climate.city },
    headers: compareCities ? ["", "A: Stadt", "B: Niederschlag (mm)"] : ["", "A: Monat", "B: °C"],
    rows: compareCities
      ? CLIMATE.map((entry, index) => ({ cells: [index + 2, entry.city, entry.rain] }))
      : MONTHS.map((month, index) => ({ cells: [index + 2, month, climate.temps[index]] })),
    options: choice.options,
    answerIndex: choice.answerIndex,
  };
}

const referencesStage: StageHandler<ReferenceQuestion> = {
  id: "references",
  forPlayer: hidden,
  createQuestions: ({ settings }) =>
    Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => referenceQuestion(id)),
  evaluate: (question, answer, { questionMs }) => evaluateChoice(question, answer, questionMs),
};

const growthStage: StageHandler<GrowthQuestion> = {
  id: "growth",
  forPlayer: hidden,
  createQuestions: ({ settings }) =>
    Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => growthQuestion(id)),
  evaluate: (question, answer, { questionMs }) => evaluateChoice(question, answer, questionMs),
};

const chartsStage: StageHandler<ChartQuestion> = {
  id: "charts",
  forPlayer: hidden,
  createQuestions: ({ settings }) =>
    Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => chartQuestion(id)),
  evaluate: (question, answer, { questionMs }) => evaluateChoice(question, answer, questionMs),
};

export default createStageGame(spreadsheetSpec, [referencesStage, growthStage, chartsStage]);
