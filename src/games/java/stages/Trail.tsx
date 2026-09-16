import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { RobotTrailQuestion } from "../../../../shared/games/java";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import CodeBlock from "../components/CodeBlock";
import RobotGrid from "../components/RobotGrid";

/**
 * Which route does the program drive?
 *
 * The robot station asks where a program stops, which can be arrived at by
 * following only the last few statements. This one puts four whole routes side
 * by side, and the three wrong ones are what the program does after one
 * plausible misreading — a turn taken the other way, a loop counted once too
 * often. Picking one is saying which mistake you nearly made, which is a more
 * useful thing to be shown afterwards than a cross.
 */
export default function TrailStage({ question, submit }: StageProps<RobotTrailQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; index: number } | null>(null);

  if (!question) return null;

  const picked = draft?.questionId === question.id ? draft.index : null;

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-4xl flex-col gap-4">
      <p className="text-center text-gray-500">{t("games.java.trail.ask")}</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CodeBlock lines={question.code} className="sm:w-1/2" />

        <div className="grid grid-cols-2 gap-3 sm:w-1/2">
          {question.options.map((route, index) => (
            <button
              key={index}
              onClick={() => setDraft({ questionId: question.id, index })}
              className={`rounded-xl border-2 p-2 transition-colors ${
                picked === index
                  ? "border-game-solid bg-game-50"
                  : "border-gray-200 bg-white hover:border-game-300"
              }`}
            >
              <RobotGrid
                width={question.width}
                height={question.height}
                start={question.start}
                facing={question.facing}
                path={route}
                answer={route[route.length - 1]}
              />
            </button>
          ))}
        </div>
      </div>

      <StageActionBar>
        <GameButton onClick={() => picked != null && submit(String(picked))} disabled={picked == null}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function TrailRulesExample() {
  const { t } = useTranslation();
  const start = { x: 0, y: 2 };
  // The right route beside the one a loop counted once too often produces
  const routes = [
    [start, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [start, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ];
  return (
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <div className="flex gap-3">
        {routes.map((route, index) => (
          <div
            key={index}
            className={`w-24 rounded-lg border-2 p-1 ${
              index === 0 ? "border-game-solid" : "border-gray-200"
            }`}
          >
            <RobotGrid
              width={3}
              height={3}
              start={start}
              facing="north"
              path={route}
              answer={route[route.length - 1]}
            />
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-gray-400">{t("games.java.stages.trail.summary")}</p>
    </div>
  );
}
