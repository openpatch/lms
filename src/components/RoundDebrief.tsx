import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StageQuestion, StageRoundData } from "../../shared/framework";
import type { LobbyState } from "../../shared/types";
import {
  getStage,
  type ClassAnswer,
  type GameDefinition,
  type StageProps,
} from "../lib/game-registry";
import { ActionBarContext } from "./action-bar";

/**
 * What the class could not do, and the question itself to put back on the wall.
 *
 * A leaderboard tells a teacher who won. What they actually leave the lesson
 * needing is the other thing: which question the class fell over, and the
 * question itself, large enough to talk through. Everything here is already on
 * the host's screen when a round ends — the round carries every player's
 * answers — so none of it is stored and none of it is asked for.
 *
 * The question is drawn by the stage's own component, which is the only way to
 * show it exactly as the class saw it, and the only way that works for all
 * eleven games rather than the three that happen to have a review row. The
 * component is handed a submit that does nothing and a bottom bar that is not
 * in the document, so nothing on it can be pressed into doing anything.
 */

interface Stat {
  question: StageQuestion;
  index: number;
  correct: number;
  answered: number;
  missing: number;
  given: ClassAnswer[];
}

function statsFor(
  game: GameDefinition,
  data: StageRoundData,
  players: LobbyState["players"],
): Stat[] {
  const stage = getStage(game, data.stageId);
  const guests = players.filter((p) => !p.isHost);

  return data.questions.map((question, index) => {
    const tally = new Map<string, ClassAnswer>();
    let correct = 0;
    let answered = 0;

    for (const player of guests) {
      const answer = data.answers[player.id]?.[question.id];
      if (!answer) continue;
      answered++;
      if (answer.correct) correct++;
      const existing = tally.get(answer.answer);
      if (existing) existing.count++;
      else {
        tally.set(answer.answer, {
          answer: answer.answer,
          label: stage?.answerLabel?.(question, answer.answer) ?? answer.answer,
          count: 1,
          correct: answer.correct === true,
        });
      }
    }

    return {
      question,
      index,
      correct,
      answered,
      missing: guests.length - answered,
      // Most given first, and the right one ahead of a wrong one that ties.
      given: [...tally.values()].sort(
        (a, b) => b.count - a.count || Number(b.correct) - Number(a.correct),
      ),
    };
  });
}

/** One question, as the class saw it, with nothing on it that can be pressed. */
function AsAsked({ game, data, question }: { game: GameDefinition; data: StageRoundData; question: StageQuestion }) {
  const stage = getStage(game, data.stageId);
  // A portal target outside the document: the stage's submit button renders
  // into it and nobody ever sees it.
  const nowhere = useMemo(() => document.createElement("div"), []);
  if (!stage) return null;

  const Stage = stage.Component;
  const props: StageProps = {
    data,
    question,
    answeredCount: 0,
    // The question as the class saw it while answering, not as it was answered.
    revealed: false,
    submit: () => {},
    sendAction: () => {},
    settings: data.settings,
    isHost: false,
    playerId: "debrief",
  };
  return (
    <ActionBarContext.Provider value={nowhere}>
      {/* `inert` takes the whole thing out of play: nothing in it can be
          clicked, and — the reason it is here rather than pointer-events alone
          — nothing in it can take focus. Stages focus their input on mount,
          which on this screen means the page jumps to an answer box that is
          not there to be answered. */}
      <div inert className="flex justify-center opacity-90">
        <Stage {...props} />
      </div>
    </ActionBarContext.Provider>
  );
}

export default function RoundDebrief({
  game,
  data,
  players,
}: {
  game: GameDefinition;
  data: StageRoundData;
  players: LobbyState["players"];
}) {
  const { t } = useTranslation();
  // Folded away to begin with. Most rounds a teacher wants to get on with the
  // next one, and this must not stand between them and that button; it is here
  // when the class needs talking to and out of the way when it does not.
  const [showing, setShowing] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const stage = getStage(game, data.stageId);

  const stats = useMemo(() => statsFor(game, data, players), [game, data, players]);
  // Hardest first: the top of this list is what the next lesson is about.
  const ranked = useMemo(
    () => [...stats].sort((a, b) => a.correct - b.correct || a.index - b.index),
    [stats],
  );

  if (!stage || data.questions.length === 0) return null;
  const guests = players.filter((p) => !p.isHost).length;
  if (guests === 0) return null;

  if (!showing) {
    return (
      <button
        onClick={() => setShowing(true)}
        className="text-sm text-gray-500 underline-offset-4 hover:text-game-ink hover:underline"
      >
        {t("game.debrief.open")}
      </button>
    );
  }

  const Solution = stage.Solution;
  const ClassAnswers = stage.ClassAnswers;

  return (
    <section className="w-full max-w-2xl">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="font-bold text-game-ink">{t("game.debrief.title")}</h3>
        <button
          onClick={() => setShowing(false)}
          className="text-sm text-gray-500 underline-offset-4 hover:text-game-ink hover:underline"
        >
          {t("game.debrief.close")}
        </button>
      </div>
      <ol className="space-y-2">
        {ranked.map((stat) => {
          const showing = open === stat.index;
          return (
            <li key={stat.question.id} className="rounded-xl border-2 border-gray-200 bg-white">
              <button
                onClick={() => setOpen(showing ? null : stat.index)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="w-6 shrink-0 text-sm font-bold text-gray-400 tabular-nums">
                  {stat.index + 1}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className={`block h-full ${stat.correct === 0 ? "bg-rose-400" : "bg-emerald-400"}`}
                    style={{ width: `${guests > 0 ? (stat.correct / guests) * 100 : 0}%` }}
                  />
                </span>
                <span className="shrink-0 text-sm text-gray-600 tabular-nums">
                  {t("game.debrief.correctOf", { correct: stat.correct, total: guests })}
                </span>
                <span className="shrink-0 text-gray-400">{showing ? "▾" : "▸"}</span>
              </button>

              {showing && (
                <div className="space-y-4 border-t border-gray-100 px-4 py-4">
                  {/* A stage with a `ClassAnswers` draws the question and what
                      the class said as one picture; the list below would only
                      repeat it, in the form it was brought here to avoid. */}
                  {ClassAnswers ? (
                    <ClassAnswers question={stat.question} answers={stat.given} data={data} />
                  ) : (
                    <AsAsked game={game} data={data} question={stat.question} />
                  )}

                  {Solution && (
                    <div className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className="text-gray-400">{t("game.correctAnswer")}</span>
                      <div className="font-medium text-gray-800">
                        <Solution question={stat.question} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {!ClassAnswers && (
                      <>
                        <p className="text-xs text-gray-400">{t("game.debrief.whatTheySaid")}</p>
                        {stat.given.map((given) => (
                          <div key={given.answer} className="flex items-baseline gap-2 text-sm">
                            <span className={given.correct ? "text-emerald-600" : "text-rose-500"}>
                              {given.correct ? "✓" : "✗"}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-mono text-gray-700">
                              {given.label}
                            </span>
                            <span className="shrink-0 text-gray-400 tabular-nums">
                              {t("game.debrief.times", { count: given.count })}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                    {stat.missing > 0 && (
                      <div className="flex items-baseline gap-2 text-sm text-gray-400">
                        <span>–</span>
                        <span className="flex-1">{t("game.debrief.unanswered")}</span>
                        <span className="tabular-nums">
                          {t("game.debrief.times", { count: stat.missing })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
