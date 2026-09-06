import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameSettingsProps } from "../../lib/game-registry";
import { defaultSquarerootSettings, type SquarerootSettings } from "../../../shared/types";

export default function SquarerootSettings({ settings, onChange }: GameSettingsProps) {
  const { t } = useTranslation();
  const current = {
    ...defaultSquarerootSettings,
    ...((settings ?? {}) as Partial<SquarerootSettings>),
  };
  const [local, setLocal] = useState<SquarerootSettings>(current);

  useEffect(() => {
    setLocal({
      ...defaultSquarerootSettings,
      ...((settings ?? {}) as Partial<SquarerootSettings>),
    });
  }, [settings]);

  const update = (patch: Partial<SquarerootSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("games.squareroot.settings.questionsPerRound")}
        </label>
        <select
          value={local.questionsPerRound}
          onChange={(e) => update({ questionsPerRound: Number(e.target.value) })}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none"
        >
          {[5, 10, 15].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("games.squareroot.settings.duration")}
        </label>
        <input
          type="range"
          min={30}
          max={120}
          step={15}
          value={local.duration}
          onChange={(e) => update({ duration: Number(e.target.value) })}
          className="w-full accent-brand-500"
        />
        <span className="text-sm text-gray-500">{local.duration}s</span>
      </div>
    </div>
  );
}
