import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameSettingsProps } from "../../lib/game-registry";
import { defaultAnalysisSettings, type AnalysisSettings } from "../../../shared/types";

export default function AnalysisSettings({ settings, onChange }: GameSettingsProps) {
  const { t } = useTranslation();
  const current = {
    ...defaultAnalysisSettings,
    ...((settings ?? {}) as Partial<AnalysisSettings>),
  };
  const [local, setLocal] = useState<AnalysisSettings>(current);

  useEffect(() => {
    setLocal({
      ...defaultAnalysisSettings,
      ...((settings ?? {}) as Partial<AnalysisSettings>),
    });
  }, [settings]);

  const update = (patch: Partial<AnalysisSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("games.analysis.settings.questionsPerRound")}
        </label>
        <select
          value={local.questionsPerRound}
          onChange={(e) => update({ questionsPerRound: Number(e.target.value) })}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none"
        >
          {[3, 5, 8].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("games.analysis.settings.duration")}
        </label>
        <input
          type="range"
          min={60}
          max={180}
          step={30}
          value={local.duration}
          onChange={(e) => update({ duration: Number(e.target.value) })}
          className="w-full accent-brand-500"
        />
        <span className="text-sm text-gray-500">{local.duration}s</span>
      </div>
    </div>
  );
}
