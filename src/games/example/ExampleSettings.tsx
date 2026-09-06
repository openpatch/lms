import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameSettingsProps } from "../../lib/game-registry";
import { defaultExampleSettings, type ExampleSettings } from "../../../shared/types";

export default function ExampleSettings({ settings, onChange }: GameSettingsProps) {
  const { t } = useTranslation();
  const current = { ...defaultExampleSettings, ...((settings ?? {}) as Partial<ExampleSettings>) };
  const [local, setLocal] = useState<ExampleSettings>(current);

  // Sync from server when settings change externally
  useEffect(() => {
    setLocal({ ...defaultExampleSettings, ...((settings ?? {}) as Partial<ExampleSettings>) });
  }, [settings]);

  const update = (patch: Partial<ExampleSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("games.example.settings.rounds")}
        </label>
        <select
          value={local.rounds}
          onChange={(e) => update({ rounds: Number(e.target.value) })}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none"
        >
          {[1, 2, 3, 5, 10].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("games.example.settings.duration")}
        </label>
        <input
          type="range"
          min={5}
          max={30}
          value={local.duration}
          onChange={(e) => update({ duration: Number(e.target.value) })}
          className="w-full accent-brand-500"
        />
        <span className="text-sm text-gray-500">{local.duration}s</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("games.example.settings.targetScore")}
        </label>
        <input
          type="range"
          min={10}
          max={100}
          step={10}
          value={local.targetScore}
          onChange={(e) => update({ targetScore: Number(e.target.value) })}
          className="w-full accent-brand-500"
        />
        <span className="text-sm text-gray-500">{local.targetScore}</span>
      </div>
    </div>
  );
}
