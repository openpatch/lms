import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BuildExtra, BuildQuestion } from "../../../../shared/games/rechner";
import { PART_KINDS, type PartKind, type PartOffer } from "../../../../shared/rechner-pc";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import { SpecLine } from "../components/parts";
import { euro, partLabel } from "../labels";

type Picks = Partial<Record<PartKind, string>>;

/**
 * Build the computer that scores best in the benchmark, within the budget.
 *
 * The price is on every card and the total is always in view; what a part is
 * worth to the score is not, and has to be read off the datasheet. A few test
 * runs per computer let a player check a hunch — few enough that guessing
 * every combination is not a plan.
 */
export default function BauenStage({ question, submit, sendAction, data, playerId, settings }: StageProps<BuildQuestion>) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; picks: Picks } | null>(null);

  if (!question) return null;

  const picks: Picks = draft?.questionId === question.id ? draft.picks : {};
  const chosen = PART_KINDS.map((kind) => question.parts.find((p) => p.id === picks[kind]));
  const complete = chosen.every((part): part is PartOffer => part != null);
  const total = chosen.reduce((sum, part) => sum + (part?.price ?? 0), 0);
  const over = total > question.budget;

  const runs = (data.extra as unknown as BuildExtra).runs?.[playerId]?.[question.id] ?? [];
  const allowed = Number(settings.testRuns);
  const left = Math.max(0, allowed - runs.length);
  const pickList = PART_KINDS.map((kind) => picks[kind] ?? "");
  const alreadyRun = runs.some((r) => r.picks.join() === pickList.join());

  const choose = (kind: PartKind, id: string) =>
    setDraft({ questionId: question.id, picks: { ...picks, [kind]: id } });

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-game-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs text-gray-500">{t("games.rechner.build.budget")}</p>
          <p className="text-2xl font-bold tabular-nums text-game-ink">{euro(question.budget, i18n.language)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{t("games.rechner.build.total")}</p>
          <p className={`text-2xl font-bold tabular-nums ${over ? "text-rose-600" : "text-gray-700"}`}>
            {euro(total, i18n.language)}
          </p>
        </div>
        {over && (
          <p role="status" className="w-full text-sm font-medium text-rose-600">
            {t("games.rechner.build.overBudget")}
          </p>
        )}
      </div>

      {PART_KINDS.map((kind) => (
        <fieldset key={kind} className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t(`games.rechner.kinds.${kind}`)}
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {question.parts
              .filter((part) => part.kind === kind)
              .map((part) => {
                const on = picks[kind] === part.id;
                return (
                  <button
                    key={part.id}
                    onClick={() => choose(kind, part.id)}
                    aria-pressed={on}
                    className={`flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors ${
                      on ? "border-game-solid bg-game-100 ring-2 ring-game-solid" : "border-gray-200 bg-white hover:border-game-300"
                    }`}
                  >
                    <span className="flex flex-col">
                      <span className="font-semibold text-gray-800">{partLabel(part)}</span>
                      <span className="text-xs text-gray-500">
                        <SpecLine part={part} />
                      </span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-gray-700">
                      {euro(part.price, i18n.language)}
                    </span>
                  </button>
                );
              })}
          </div>
        </fieldset>
      ))}

      {allowed > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-700">{t("games.rechner.build.benchmark")}</h3>
            <button
              onClick={() =>
                sendAction({ action: "benchmark", questionId: question.id, picks: pickList })
              }
              disabled={!complete || over || left === 0 || alreadyRun}
              className="rounded-lg border-2 border-game-solid px-4 py-1.5 font-semibold text-game-ink transition-colors hover:bg-game-50 disabled:border-gray-200 disabled:text-gray-400"
            >
              {t("games.rechner.build.runTest", { count: left })}
            </button>
          </div>
          {runs.length === 0 ? (
            <p className="text-sm text-gray-500">{t("games.rechner.build.noRuns")}</p>
          ) : (
            <ol className="flex flex-col gap-1" aria-live="polite">
              {runs.map((runResult, index) => (
                <li key={index} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="text-gray-600">
                    {runResult.picks
                      .map((id) => question.parts.find((p) => p.id === id))
                      .filter((p): p is PartOffer => p != null)
                      .map(partLabel)
                      .join(" · ")}
                  </span>
                  <span className="font-bold tabular-nums text-game-ink">
                    {t("games.rechner.build.points", { score: runResult.score.toLocaleString(i18n.language) })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <StageActionBar>
        {/* The total again, where it stays in view however far the list scrolls. */}
        <span className={`font-bold tabular-nums ${over ? "text-rose-600" : "text-gray-600"}`}>
          {euro(total, i18n.language)} / {euro(question.budget, i18n.language)}
        </span>
        <GameButton onClick={() => submit(JSON.stringify({ picks: pickList }))} disabled={!complete || over}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function BauenRulesExample() {
  const { t } = useTranslation();
  const rows = [
    { kind: "cpu", text: "6 Kerne · 4,2 GHz · Gen. 3", price: "179 €" },
    { kind: "gpu", text: "3072 Einheiten · 8 GB · Gen. 4", price: "299 €" },
    { kind: "ram", text: "16 GB DDR5", price: "65 €" },
    { kind: "storage", text: "1 TB SSD", price: "65 €" },
  ];
  return (
    <div className="flex w-full max-w-sm flex-col gap-1 text-sm">
      {rows.map((row) => (
        <div key={row.kind} className="flex justify-between gap-3 rounded-lg border border-gray-200 px-3 py-1.5">
          <span className="text-gray-500">{t(`games.rechner.kinds.${row.kind}`)}</span>
          <span className="text-gray-700">{row.text}</span>
          <span className="font-semibold tabular-nums">{row.price}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between px-3 font-bold text-game-ink">
        <span>{t("games.rechner.build.benchmark")}</span>
        <span>?</span>
      </div>
    </div>
  );
}
