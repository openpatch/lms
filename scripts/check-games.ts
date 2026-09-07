/**
 * Smoke test for every registered mini game — run it with `npm run check:games`
 * after adding or changing a game.
 *
 * It checks that specs and handlers agree, that every stage can build a round
 * and grade an answer, and that all i18n keys a stage refers to exist in every
 * locale. It does not check whether a stage is any fun.
 */
import { readFileSync } from "node:fs";
import { gameHandlers } from "../server/games";
import { gameSpecs, validateGameSpecs } from "../shared/games";
import { defaultGameSettings, type GameSpec, type StageRoundData } from "../shared/framework";
import type { LobbyState } from "../shared/types";

const LOCALES = ["en", "de"] as const;

let problems = 0;
function fail(message: string) {
  console.error(`  ✗ ${message}`);
  problems++;
}

function loadLocale(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(`../src/locales/${name}.json`, import.meta.url), "utf8"));
}

function hasKey(locale: Record<string, unknown>, key: string): boolean {
  let node: unknown = locale;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node == null || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string";
}

/** i18next stores pluralised keys as key_one / key_other. */
function hasTranslation(locale: Record<string, unknown>, key: string): boolean {
  return hasKey(locale, key) || (hasKey(locale, `${key}_one`) && hasKey(locale, `${key}_other`));
}

function lobbyFor(spec: GameSpec, stageId: string): LobbyState {
  const settings = defaultGameSettings(spec);
  return {
    code: "CHECK",
    gameId: spec.id,
    hostId: "host",
    players: [
      { id: "host", name: "Host", isHost: true, score: 0, connected: true },
      { id: "player", name: "Player", isHost: false, score: 0, connected: true },
    ],
    phase: "playing",
    gameData: null,
    settings: { ...settings, stages: [stageId] },
    countdownEndsAt: null,
  };
}

validateGameSpecs();

const locales = Object.fromEntries(LOCALES.map((name) => [name, loadLocale(name)]));
const sender = { id: "player" } as never;

for (const spec of Object.values(gameSpecs)) {
  const grades = spec.grades.length > 0 ? ` — Jg. ${spec.grades.join(", ")}` : "";
  console.log(
    `${spec.id} (${spec.stages.length} stage${spec.stages.length === 1 ? "" : "s"})${grades}`,
  );

  const handler = gameHandlers[spec.id];
  if (!handler) {
    fail(`${spec.id}: no server handler registered`);
    continue;
  }

  for (const key of [spec.titleKey, spec.descriptionKey]) {
    for (const [name, locale] of Object.entries(locales)) {
      if (!hasTranslation(locale, key)) fail(`${spec.id}: missing ${name} translation "${key}"`);
    }
  }

  for (const stage of spec.stages) {
    const settingKeys = stage.settings.flatMap((f) =>
      f.type === "choice" ? [f.labelKey, ...f.options.map((o) => o.labelKey)] : [f.labelKey],
    );
    const keys = [stage.nameKey, stage.summaryKey, stage.rulesKey, ...settingKeys];
    for (const key of keys) {
      for (const [name, locale] of Object.entries(locales)) {
        if (!hasTranslation(locale, key)) {
          fail(`${spec.id}/${stage.id}: missing ${name} translation "${key}"`);
        }
      }
    }

    const state = lobbyFor(spec, stage.id);
    const round = handler.onStart!(state) as StageRoundData;
    state.gameData = round;

    if (round.stageId !== stage.id) fail(`${spec.id}/${stage.id}: round built the wrong stage`);
    if (round.totalRounds !== 1) fail(`${spec.id}/${stage.id}: expected a single round`);
    if (!(round.duration > 0)) fail(`${spec.id}/${stage.id}: round duration must be positive`);

    const ids = new Set(round.questions.map((q) => q.id));
    if (ids.size !== round.questions.length) fail(`${spec.id}/${stage.id}: question ids are not unique`);

    if (round.questions.length > 0) {
      const question = round.questions[0];
      // Junk must be graded, not crash the room.
      handler.onMessage!(state, { action: "answer", questionId: question.id, answer: "🙈" }, sender);
      const answer = round.answers.player?.[question.id];
      if (!answer) {
        fail(`${spec.id}/${stage.id}: an answer was not recorded`);
      } else if (!Number.isFinite(answer.points) || (answer.points ?? 0) < 0) {
        fail(`${spec.id}/${stage.id}: points must be a number >= 0, got ${answer.points}`);
      }
    }

    console.log(
      `  ✓ ${stage.id}: ${round.questions.length} question(s), ${round.duration}s, ` +
        `${stage.settings.length} setting(s)`,
    );
  }
}

if (problems > 0) {
  console.error(`\n${problems} problem(s) found`);
  process.exit(1);
}
console.log("\nAll games look healthy.");
