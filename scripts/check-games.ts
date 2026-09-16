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
import { GAME_COLORS } from "../shared/types";
import { GAME_PALETTES } from "../src/lib/game-theme";
import {
  ROUND_POINTS,
  defaultGameSettings,
  emptyTally,
  liveOffered,
  liveScore,
  playerRoundScore,
  type GameSpec,
  type StageRoundData,
} from "../shared/framework";
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
      { id: "host", name: "Host", isHost: true, score: 0, crowns: 0, connected: true },
      { id: "player", name: "Player", isHost: false, score: 0, crowns: 0, connected: true },
    ],
    phase: "playing",
    gameData: null,
    settings: { ...settings, stages: [stageId] },
    countdownEndsAt: null,
  };
}

/**
 * What this stage pays for a round where nothing went wrong and no streak was
 * running, or null when the stage scores in a way this cannot synthesise.
 */
function perfectRoundScore(round: StageRoundData, live: boolean): number | null {
  if (live) {
    const offered = liveOffered(round) || 10;
    const extra = round.extra as { offered?: number; tally?: Record<string, unknown> };
    extra.offered = offered;
    extra.tally = { player: { ...emptyTally(), points: 100 * offered } };
    return liveScore(round, "player");
  }
  if (round.questions.length === 0) return null;
  round.answers.player = {};
  for (const question of round.questions) {
    round.answers.player[question.id] = {
      answer: "",
      timeMs: 0,
      correct: true,
      points: 100,
      streak: 1,
    };
  }
  return playerRoundScore(round, "player");
}

/**
 * How far apart two colours look, in OKLab, with lightness counting for less
 * than hue: a game's colour is recognised as a hue on somebody else's screen
 * across the room, not as a shade.
 */
function colourDistance(a: string, b: string): number {
  const oklab = (hex: string) => {
    const channel = (at: number) => {
      const c = parseInt(hex.slice(at, at + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const [r, g, bl] = [channel(1), channel(3), channel(5)];
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };
  const [la, aa, ba] = oklab(a);
  const [lb, ab, bb] = oklab(b);
  return Math.sqrt(0.5 * (la - lb) ** 2 + (aa - ab) ** 2 + (ba - bb) ** 2) * 100;
}

/**
 * The closest two game colours may be.
 *
 * Amber and orange were already this close when there were ten, so this is not
 * a standard imposed after the fact — it is the standard the list already met,
 * written down so the eleventh colour cannot quietly be a second amber. The
 * whole point of the colours is that a teacher and thirty students can each
 * check at a glance that they are in the same game.
 */
const MIN_COLOUR_DISTANCE = 4.0;

{
  const solids = GAME_COLORS.map((name) => [name, GAME_PALETTES[name].solid] as const);
  let closest = Infinity;
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const apart = colourDistance(solids[i][1], solids[j][1]);
      closest = Math.min(closest, apart);
      if (apart < MIN_COLOUR_DISTANCE) {
        fail(
          `colours "${solids[i][0]}" and "${solids[j][0]}" are ${apart.toFixed(1)} apart, ` +
            `under ${MIN_COLOUR_DISTANCE} — a class could not tell them apart`,
        );
      }
    }
  }
  console.log(`${GAME_COLORS.length} colours, closest pair ${closest.toFixed(1)} apart`);
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
      f.type === "choice" || f.type === "multi"
        ? [f.labelKey, ...f.options.map((o) => o.labelKey)]
        : [f.labelKey],
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

    // Anything that is not an answer has to be shrugged off rather than throw:
    // a live stage takes nothing else, and a client that has gone wrong sends
    // whatever it likes.
    const live = handler.isLive?.(state) === true;
    const junk: unknown[] = [
      {},
      { action: "🙈" },
      { action: "hits", events: "not an array" },
      { action: "hits", events: [{ id: "x", ms: -1 }] },
      { action: "tap", light: -1, ms: "soon" },
    ];
    for (const payload of junk) {
      try {
        handler.onMessage!(state, payload, sender);
      } catch (error) {
        fail(`${spec.id}/${stage.id}: crashed on ${JSON.stringify(payload)} — ${error}`);
        break;
      }
    }

    if (live) {
      // A live round moves on by itself, so the tick has to survive being
      // called before anything has happened and long after everything has.
      try {
        handler.onTick?.(state, Date.now());
        handler.onTick?.(state, Date.now() + round.duration * 1000);
      } catch (error) {
        fail(`${spec.id}/${stage.id}: crashed on a tick — ${error}`);
      }
      const tally = (round.extra as { tally?: Record<string, unknown> }).tally;
      if (!tally || !("player" in tally)) {
        fail(`${spec.id}/${stage.id}: a live round starts every player on the board`);
      }
    }

    // Every stage is worth the same, or the host's choice of stations decides
    // the game before anybody has answered anything. A flawless round is
    // ROUND_POINTS; the combo bonus is what may go above it.
    const flawless = perfectRoundScore(round, live);
    if (flawless == null) {
      console.log(`  ~ ${spec.id}/${stage.id}: scores its own way, cap not checked`);
    } else if (flawless !== ROUND_POINTS) {
      fail(`${spec.id}/${stage.id}: a flawless round is ${flawless}, not ${ROUND_POINTS}`);
    }

    console.log(
      `  ✓ ${stage.id}: ${live ? "live" : `${round.questions.length} question(s)`}, ` +
        `${round.duration}s, ${stage.settings.length} setting(s)`,
    );
  }
}

/**
 * How big an answer a code-tracing question may ask for.
 *
 * These stations ask what a listing does, not what a sum comes to, and they are
 * played against a clock. A round where the loop was read correctly and the
 * arithmetic ran out of time measures the arithmetic. The ceiling is the point
 * where a value stops being holdable in the head — roughly the times tables and
 * a bit — and it is checked rather than written in a comment because the way
 * this goes wrong is somebody widening a range for variety's sake and nobody
 * noticing until a class does.
 *
 * `output` is exempt: that station is the arithmetic, `/` and `%` included.
 */
const TRACING_BUDGET = 500;
const TRACING_STAGES = ["variables", "loops", "methods", "arrays", "sorting", "structogram"];

{
  const java = gameSpecs.java;
  const handler = java && gameHandlers.java;
  if (java && handler) {
    for (const stage of java.stages.filter((s) => TRACING_STAGES.includes(s.id))) {
      let worst = 0;
      let listing: string[] = [];
      for (let attempt = 0; attempt < 400; attempt++) {
        const state = lobbyFor(java, stage.id);
        const round = handler.onStart!(state) as StageRoundData;
        for (const question of round.questions as unknown as {
          code?: string[];
          expected?: string[];
        }[]) {
          for (const value of question.expected ?? []) {
            const size = Math.abs(Number(String(value).trim()));
            if (Number.isFinite(size) && size > worst) {
              worst = size;
              listing = question.code ?? [];
            }
          }
        }
      }
      if (worst > TRACING_BUDGET) {
        fail(
          `java/${stage.id}: a traced answer reaches ${worst}, over ${TRACING_BUDGET} — ` +
            `the arithmetic is the question now:\n${listing.join("\n")}`,
        );
      } else {
        console.log(`  ✓ java/${stage.id}: traced answers stay under ${worst + 1}`);
      }
    }
  }
}

if (problems > 0) {
  console.error(`\n${problems} problem(s) found`);
  process.exit(1);
}
console.log("\nAll games look healthy.");
