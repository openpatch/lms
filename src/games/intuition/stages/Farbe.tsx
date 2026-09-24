import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ColorQuestion, Rgb } from "../../../../shared/games/intuition";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import { css } from "../components/color";

/**
 * Match the colour with three sliders.
 *
 * The two colours meet along a seam rather than sitting in two separate
 * patches: a difference you cannot see across a gap is obvious across an edge,
 * and the whole station lives on that.
 */

const CHANNELS = [
  { key: "r", labelKey: "games.intuition.color.red", track: "#ef4444" },
  { key: "g", labelKey: "games.intuition.color.green", track: "#22c55e" },
  { key: "b", labelKey: "games.intuition.color.blue", track: "#3b82f6" },
] as const;

const START: Rgb = { r: 128, g: 128, b: 128 };

export default function FarbeStage({ question, submit }: StageProps<ColorQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: Rgb } | null>(null);

  if (!question) return null;

  // Tagging the draft with its question keeps a mix from leaking into the next.
  const mix = draft?.questionId === question.id ? draft.value : START;

  return (
    <div
      key={question.id}
      className="animate-question-in flex w-full max-w-xl flex-col items-center gap-5"
    >
      <p className="text-center text-gray-500">{t("games.intuition.colorPrompt")}</p>

      <div className="flex h-40 w-full overflow-hidden rounded-2xl border-2 border-gray-200 sm:h-48">
        <div className="flex-1" style={{ backgroundColor: css(question.target) }} />
        <div className="flex-1" style={{ backgroundColor: css(mix) }} />
      </div>
      <div className="flex w-full justify-between px-1 text-xs text-gray-400">
        <span>{t("games.intuition.color.target")}</span>
        <span>{t("games.intuition.color.yours")}</span>
      </div>

      {/* Nothing in this row is worth selecting, and a drag that starts a
          hair off the slider would otherwise select the label beside it. */}
      <div className="w-full space-y-1 select-none">
        {CHANNELS.map((channel) => (
          <div key={channel.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm text-gray-600">{t(channel.labelKey)}</span>
            <input
              type="range"
              min={0}
              max={255}
              step={question.step}
              aria-label={t(channel.labelKey)}
              value={mix[channel.key]}
              onChange={(event) =>
                setDraft({
                  questionId: question.id,
                  value: { ...mix, [channel.key]: Number(event.target.value) },
                })
              }
              // The gradient belongs to the track rather than to the input, so
              // that the box a finger has to hit can be tall while the bar it
              // draws stays thin — see `.slider`.
              className="slider flex-1 cursor-pointer"
              style={
                {
                  "--track": `linear-gradient(to right, #fff, ${channel.track})`,
                  "--thumb": channel.track,
                } as React.CSSProperties
              }
            />
            <span className="w-10 text-right text-sm text-gray-500 tabular-nums">
              {mix[channel.key]}
            </span>
          </div>
        ))}
      </div>

      <StageActionBar>
        <GameButton onClick={() => submit(JSON.stringify(mix))}>{t("game.submit")}</GameButton>
      </StageActionBar>
    </div>
  );
}

export function FarbeRulesExample() {
  return (
    <div className="flex h-20 w-48 overflow-hidden rounded-xl border-2 border-gray-200">
      <div className="flex-1" style={{ backgroundColor: "rgb(224 96 64)" }} />
      <div className="flex-1" style={{ backgroundColor: "rgb(208 112 80)" }} />
    </div>
  );
}
