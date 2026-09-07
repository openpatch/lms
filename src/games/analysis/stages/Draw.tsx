import { evaluateDerivative, evaluateFunction } from "../../../../shared/analysis-functions";
import MathTex from "../../../components/Math";
import { createDrawStage } from "./createDrawStage";

export const DrawGraphStage = createDrawStage({
  promptKey: "games.analysis.drawGraphPrompt",
  showReference: false,
  solution: evaluateFunction,
});

export const DrawDerivativeStage = createDrawStage({
  promptKey: "games.analysis.drawDerivativePrompt",
  showReference: true,
  solution: evaluateDerivative,
});

export function DrawGraphRulesExample() {
  return (
    <div className="flex items-center justify-center gap-3 text-2xl text-gray-500">
      <MathTex tex="f(x) = x^2" />
      <span className="text-gray-400">&rarr;</span>
      <span className="font-bold text-gray-700">✎</span>
    </div>
  );
}

export function DrawDerivativeRulesExample() {
  return (
    <div className="flex items-center justify-center gap-3 text-2xl text-gray-500">
      <MathTex tex="f(x)" />
      <span className="text-gray-400">&rarr;</span>
      <span className="font-bold text-gray-700">
        <MathTex tex="f'(x)" />
      </span>
      <span className="text-gray-400">✎</span>
    </div>
  );
}
