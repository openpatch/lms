/**
 * The spreadsheet game's rounds, built many times over by the server handler: every
 * question has to be answerable, read in every language, and a stage played
 * again has to show mostly new sheets.
 */
import { describe, expect, it } from "vitest";
import { gameHandlers } from "../../../server/games";
import { defaultGameSettings, type StageRoundData } from "../../../shared/framework";
import { spreadsheetSpec, type SpreadsheetChoiceQuestion } from "../../../shared/games/spreadsheet";
import type { LobbyState } from "../../../shared/types";
import i18n from "../../i18n";
import { optionText } from "./stages/answer-labels";

function round(stageId: string): SpreadsheetChoiceQuestion[] {
  const settings = defaultGameSettings(spreadsheetSpec);
  const state: LobbyState = {
    code: "TEST",
    gameId: spreadsheetSpec.id,
    hostId: "host",
    players: [{ id: "host", name: "Host", isHost: true, score: 0, crowns: 0, connected: true }],
    phase: "playing",
    gameData: null,
    settings: { ...settings, stages: [stageId], questionsPerRound: 8 },
    countdownEndsAt: null,
  };
  const data = gameHandlers[spreadsheetSpec.id].onStart!(state) as StageRoundData<SpreadsheetChoiceQuestion>;
  return data.questions;
}

describe.each(spreadsheetSpec.stages.map((stage) => stage.id))("spreadsheet stage %s", (stageId) => {
  const rounds = Array.from({ length: 40 }, () => round(stageId));
  const questions = rounds.flat();

  it("has one right answer among four distinct options", () => {
    for (const question of questions) {
      expect(question.options.length, JSON.stringify(question)).toBe(4);
      expect(new Set(question.options).size, JSON.stringify(question)).toBe(question.options.length);
      expect(question.options[question.answerIndex], JSON.stringify(question)).toBeDefined();
    }
  });

  it.each(["de", "en"])("reads fully in %s", async (language) => {
    const t = i18n.getFixedT(language);
    for (const question of questions) {
      const prompt = t(question.promptKey, question.promptParams);
      expect(prompt).not.toBe(question.promptKey);
      expect(prompt, question.promptKey).not.toMatch(/\{\{|\$t\(|games\.spreadsheet/);
      for (const option of question.options) {
        expect(optionText(question, option, t), option).not.toMatch(/games\.spreadsheet/);
      }
    }
  });

  it("does not repeat a sheet within a round and varies between rounds", () => {
    const key = (question: SpreadsheetChoiceQuestion) =>
      JSON.stringify([question.promptKey, question.promptParams, question.formula, question.rows]);
    for (const questions of rounds) {
      expect(new Set(questions.map(key)).size).toBe(questions.length);
    }
    expect(new Set(questions.map(key)).size).toBeGreaterThan(questions.length * 0.6);
  });
});
