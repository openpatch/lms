import { useTranslation } from "react-i18next";
import type { GameProps } from "../../lib/game-registry";
import type { SquarerootGameData, SquarerootRoundType } from "../../../shared/types";
import MathTex from "../../components/Math";

const EXPLANATION_KEYS: Record<SquarerootRoundType, { title: string; desc: string }> = {
  speed: { title: "games.squareroot.explanation.speed.title", desc: "games.squareroot.explanation.speed.description" },
  numberline: { title: "games.squareroot.explanation.numberline.title", desc: "games.squareroot.explanation.numberline.description" },
  classify: { title: "games.squareroot.explanation.classify.title", desc: "games.squareroot.explanation.classify.description" },
};

function RoundExample({ roundType }: { roundType: SquarerootRoundType }) {
  if (roundType === "speed") {
    return (
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <div className="flex items-center gap-3 text-2xl">
          <MathTex tex="\sqrt{16} = ?" display={false} />
          <span className="text-gray-400">&rarr;</span>
          <span className="font-bold text-gray-700">4</span>
        </div>
      </div>
    );
  }
  if (roundType === "numberline") {
    return (
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <div className="flex items-center gap-3 text-2xl">
          <MathTex tex="\sqrt{2} \approx ?" display={false} />
          <span className="text-gray-400">&rarr;</span>
          <span className="font-bold text-gray-700">1.41</span>
        </div>
        <p className="text-sm text-gray-400">Click on the number line to estimate</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <div className="flex items-center gap-3 text-2xl">
        <MathTex tex="\sqrt{9}" display={false} />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-green-600">Natural</span>
      </div>
      <div className="flex items-center gap-3 text-2xl">
        <MathTex tex="\sqrt{\tfrac{1}{4}}" display={false} />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-blue-600">Rational</span>
      </div>
      <div className="flex items-center gap-3 text-2xl">
        <MathTex tex="\sqrt{2}" display={false} />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-purple-600">Irrational</span>
      </div>
    </div>
  );
}

export default function SquarerootExplanation({ gameData, isHost }: GameProps) {
  const { t } = useTranslation();
  const data = gameData as SquarerootGameData;
  const roundType = data?.roundType ?? "speed";
  const keys = EXPLANATION_KEYS[roundType];
  const roundLabel = roundType === "speed" ? 1 : roundType === "numberline" ? 2 : 3;

  return (
    <div className="text-center space-y-4">
      <div className="text-sm font-semibold uppercase text-brand-500">
        {t("game.round", { current: data?.currentRound ?? roundLabel, total: 3 })}
      </div>
      <h2 className="text-2xl font-bold">{t(keys.title)}</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        {t(keys.desc, { count: data?.questions?.length ?? 10, seconds: data?.duration ?? 60 })}
      </p>
      <RoundExample roundType={roundType} />
      {!isHost && (
        <p className="text-brand-600 font-medium">{t("games.squareroot.explanation.getReady")}</p>
      )}
      {isHost && (
        <p className="text-gray-500 text-sm">{t("games.squareroot.explanation.hostInfo")}</p>
      )}
    </div>
  );
}
