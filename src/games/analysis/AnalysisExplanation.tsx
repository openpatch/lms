import { useTranslation } from "react-i18next";
import type { GameProps } from "../../lib/game-registry";
import type { AnalysisGameData, AnalysisRoundType } from "../../../shared/types";
import MathTex from "../../components/Math";

const EXPLANATION_KEYS: Record<AnalysisRoundType, { title: string; desc: string }> = {
  "multiple-choice": { title: "games.analysis.explanation.mc.title", desc: "games.analysis.explanation.mc.description" },
  "draw-graph": { title: "games.analysis.explanation.drawGraph.title", desc: "games.analysis.explanation.drawGraph.description" },
  "draw-derivative": { title: "games.analysis.explanation.drawDerivative.title", desc: "games.analysis.explanation.drawDerivative.description" },
};

function RoundExample({ roundType }: { roundType: AnalysisRoundType }) {
  if (roundType === "multiple-choice") {
    return (
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <div className="flex items-center gap-3 text-2xl">
          <MathTex tex="f(x) = x^2" display={false} />
          <span className="text-gray-400">&rarr;</span>
          <span className="font-bold text-gray-700"><MathTex tex="f'(x) = 2x" display={false} /></span>
        </div>
        <p className="text-sm text-gray-400">Choose the correct derivative from 4 options</p>
      </div>
    );
  }
  if (roundType === "draw-graph") {
    return (
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <div className="flex items-center gap-3 text-2xl">
          <MathTex tex="f(x) = x^2" display={false} />
          <span className="text-gray-400">&rarr;</span>
          <span className="font-bold text-gray-700">✎</span>
        </div>
        <p className="text-sm text-gray-400">Draw the graph on the coordinate grid</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <div className="flex items-center gap-3 text-2xl">
        <MathTex tex="\text{graph of } f(x)" display={false} />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-gray-700"><MathTex tex="f'(x)" display={false} /></span>
      </div>
      <p className="text-sm text-gray-400">The dashed curve shows f(x) — draw f'(x)</p>
    </div>
  );
}

export default function AnalysisExplanation({ gameData, isHost }: GameProps) {
  const { t } = useTranslation();
  const data = gameData as AnalysisGameData;
  const roundType = data?.roundType ?? "multiple-choice";
  const keys = EXPLANATION_KEYS[roundType];
  const roundLabel = roundType === "multiple-choice" ? 1 : roundType === "draw-graph" ? 2 : 3;

  return (
    <div className="text-center space-y-4">
      <div className="text-sm font-semibold uppercase text-brand-500">
        {t("game.round", { current: data?.currentRound ?? roundLabel, total: 3 })}
      </div>
      <h2 className="text-2xl font-bold">{t(keys.title)}</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        {t(keys.desc, { count: data?.questions?.length ?? 5, seconds: data?.duration ?? 120 })}
      </p>
      <RoundExample roundType={roundType} />
      {!isHost && (
        <p className="text-brand-600 font-medium">{t("games.analysis.explanation.getReady")}</p>
      )}
      {isHost && (
        <p className="text-gray-500 text-sm">{t("games.analysis.explanation.hostInfo")}</p>
      )}
    </div>
  );
}
