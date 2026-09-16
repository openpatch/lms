import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { RobotCell, RobotQuestion } from "../../../../shared/games/java";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import CodeBlock from "../components/CodeBlock";
import RobotGrid from "../components/RobotGrid";

/**
 * Read the program, say where the robot stops.
 *
 * The same reading the other stations ask for — statements in order, a loop
 * body repeated, a loop inside a loop — with the answer a square on the floor
 * instead of a number. Nothing here has to be worked out, only followed, which
 * is the whole of what these stations are for: the deeper exercises belong in
 * the lesson, not in a round played against a clock.
 */
export default function RobotStage({ question, submit }: StageProps<RobotQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; cell: RobotCell } | null>(null);

  if (!question) return null;

  // Tagged with its question, so a pick cannot leak into the next one
  const picked = draft?.questionId === question.id ? draft.cell : null;

  return (
    <div
      key={question.id}
      className="animate-question-in flex w-full max-w-xl flex-col items-center gap-4"
    >
      <CodeBlock lines={question.code} />

      <p className="text-center text-gray-500">{t("games.java.robot.ask")}</p>

      <RobotGrid
        width={question.width}
        height={question.height}
        start={question.start}
        facing={question.facing}
        picked={picked}
        onPick={(cell) => setDraft({ questionId: question.id, cell })}
      />

      <StageActionBar>
        <GameButton
          onClick={() => picked && submit(`${picked.x},${picked.y}`)}
          disabled={!picked}
        >
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function RobotRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <div className="w-full max-w-[13rem]">
        <RobotGrid
          width={4}
          height={3}
          start={{ x: 0, y: 2 }}
          facing="north"
          path={[
            { x: 0, y: 2 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: 2, y: 1 },
          ]}
          answer={{ x: 2, y: 1 }}
          answerFacing="east"
        />
      </div>
      <p className="text-center text-sm text-gray-400">
        {t("games.java.stages.robot.summary")}
      </p>
    </div>
  );
}
