import { useTranslation } from "react-i18next";
import type { VorschriftQuestion } from "../../../../shared/games/zuordnung";
import type { StageProps } from "../../../lib/game-registry";
import Icon from "../../../components/icons";
import MathTex from "../../../components/Math";
import PlotCanvas from "../../../components/PlotCanvas";
import DataTable from "../components/DataTable";
import { curveFunction } from "../components/curve";

const OPTION_CLASS =
  "px-5 py-3 rounded-xl border-2 border-gray-200 bg-white hover:border-game-400 " +
  "hover:bg-game-50 transition-colors text-gray-700";

/**
 * The Zuordnungsvorschrift of a table or a graph (EdM 1.2): which of the four
 * terms the values in front of the player came from.
 */
export default function VorschriftStage({ question, submit }: StageProps<VorschriftQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div key={question.id} className="animate-question-in w-full flex flex-col items-center gap-5">
        <Icon name={question.icon} className="text-4xl" />
        <p className="text-lg font-medium text-gray-800 max-w-lg text-center">
          {t(question.setupKey)}
        </p>

        <p className="text-gray-500">{t("games.zuordnung.prompts.vorschrift")}</p>

        {question.source === "tabelle" ? (
          <DataTable
            rows={question.rows ?? []}
            xLabelKey={question.xLabelKey}
            yLabelKey={question.yLabelKey}
            xUnit={question.xUnit}
            yUnit={question.yUnit}
          />
        ) : (
          <div className="w-full">
            <PlotCanvas
              xMin={0}
              yMin={0}
              xMax={question.window?.xMax ?? 10}
              yMax={question.window?.yMax ?? 10}
              readOnly
              reserveRem={34}
              curves={[
                ...(question.curve
                  ? [{ fn: curveFunction(question.curve), style: "accent" as const }]
                  : []),
              ]}
              markers={
                question.point
                  ? [
                      {
                        x: question.point.x,
                        y: question.point.y,
                        label: `(${question.point.x} | ${question.point.y})`,
                        tone: "accent",
                      },
                    ]
                  : []
              }
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
          {question.options.map((option, index) => (
            <button key={index} onClick={() => submit(String(index))} className={OPTION_CLASS}>
              <MathTex tex={option} className="text-lg" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A table and the term it came from, as the round asks for it. */
export function VorschriftRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2">
      <DataTable
        rows={[
          { x: 2, y: 14 },
          { x: 5, y: 35 },
        ]}
        xLabelKey="games.zuordnung.axes.portionen"
        yLabelKey="games.zuordnung.axes.ackerflaeche"
        xUnit=""
        yUnit="m²"
      />
      <MathTex tex="y = 7 \\cdot x" className="text-xl text-game-ink" />
      <p className="text-sm text-gray-400">{t("games.zuordnung.rulesHelpVorschrift")}</p>
    </div>
  );
}
