import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  GameSettings,
  SettingsField,
  SettingsValue,
  StageSpec,
} from "../../shared/framework";
import { isWebAddress, resolveGameSettings } from "../../shared/framework";
import type { GameDefinition } from "../lib/game-registry";

interface FieldProps {
  field: SettingsField;
  value: SettingsValue;
  onChange: (value: SettingsValue) => void;
}

/**
 * A web address. Kept as a draft while it is typed, and only handed on once it
 * is an address: the server keeps nothing that is not one, so passing on every
 * keystroke would have the half-typed address come back empty and wipe the
 * field under the teacher's fingers.
 */
function UrlField({
  field,
  value,
  onChange,
}: {
  field: Extract<SettingsField, { type: "url" }>;
  value: string;
  onChange: (value: SettingsValue) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const [stored, setStored] = useState(value);
  // The server's value wins when it changes, unless the teacher is part-way
  // through typing something that is not an address yet — that draft is
  // theirs to finish. Adjusted while rendering rather than in an effect, so the
  // field never shows one frame of the stale draft.
  if (value !== stored) {
    setStored(value);
    if (draft.trim() === "" || isWebAddress(draft)) setDraft(value);
  }
  const invalid = draft.trim() !== "" && !isWebAddress(draft);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1" htmlFor={`setting-${field.key}`}>
        {t(field.labelKey)}
      </label>
      <input
        id={`setting-${field.key}`}
        type="url"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={draft}
        placeholder="https://"
        aria-invalid={invalid || undefined}
        aria-describedby={field.hintKey ? `setting-${field.key}-hint` : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          if (isWebAddress(e.target.value) || e.target.value.trim() === "") onChange(e.target.value.trim());
        }}
        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-game-solid focus:outline-none aria-invalid:border-rose-400"
      />
      {field.hintKey && (
        <p id={`setting-${field.key}-hint`} className="mt-1 text-sm text-gray-500">
          {t(field.hintKey)}
        </p>
      )}
    </div>
  );
}

/** Renders one setting from its schema entry. */
function Field({ field, value, onChange }: FieldProps) {
  const { t } = useTranslation();

  if (field.type === "toggle") {
    return (
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-game-solid"
        />
        <span className="text-sm font-medium text-gray-600">{t(field.labelKey)}</span>
      </label>
    );
  }

  if (field.type === "choice") {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">{t(field.labelKey)}</label>
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-game-solid focus:outline-none"
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "multi") {
    const picked = Array.isArray(value) ? value : field.default;
    // The last option stays checked: a stage with nothing selected has nothing
    // to ask, and the server would silently put every option back anyway.
    const toggle = (option: string) => {
      const on = picked.includes(option);
      if (on && picked.length === 1) return;
      onChange(
        field.options
          .map((o) => o.value)
          .filter((v) => (v === option ? !on : picked.includes(v))),
      );
    };

    return (
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">{t(field.labelKey)}</label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {field.options.map((option) => {
            const on = picked.includes(option.value);
            const isOnlyPicked = on && picked.length === 1;
            return (
              <label
                key={option.value}
                className={`flex items-center gap-2 ${
                  isOnlyPicked ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={isOnlyPicked}
                  onChange={() => toggle(option.value)}
                  className="accent-game-solid"
                />
                <span className="text-sm text-gray-600">{t(option.labelKey)}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "url") {
    return <UrlField field={field} value={String(value ?? "")} onChange={onChange} />;
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">{t(field.labelKey)}</label>
        <select
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-game-solid focus:outline-none"
        >
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{t(field.labelKey)}</label>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={Number(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-game-solid"
      />
      <span className="text-sm text-gray-500">
        {Number(value)}
        {field.unit ?? ""}
      </span>
    </div>
  );
}

export interface StageSettingsFormProps {
  game: GameDefinition;
  /** The lobby's current settings, as stored by the server. */
  settings: unknown;
  onChange: (settings: GameSettings) => void;
}

/**
 * The host's stage picker: one card per stage with its settings, plus a
 * checkbox that decides whether the stage is played. At least one stage stays
 * active, and the rounds follow the order the stages are declared in.
 */
export default function StageSettingsForm({ game, settings, onChange }: StageSettingsFormProps) {
  const { t } = useTranslation();
  const spec = { ...game, stages: game.stages as StageSpec[] };
  const current = resolveGameSettings(spec, settings);

  const toggleStage = (stageId: string) => {
    const active = current.stages.includes(stageId);
    // A game always plays at least one stage
    if (active && current.stages.length === 1) return;
    const stages = game.stages
      .map((stage) => stage.id)
      .filter((id) => (id === stageId ? !active : current.stages.includes(id)));
    onChange({ ...current, stages });
  };

  const updateField = (stageId: string, key: string, value: SettingsValue) => {
    onChange({
      ...current,
      stageSettings: {
        ...current.stageSettings,
        [stageId]: { ...current.stageSettings[stageId], [key]: value },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">
          {t("settings.stages")}
        </label>
        <div className="space-y-3">
          {game.stages.map((stage) => {
            const active = current.stages.includes(stage.id);
            const isOnlyActive = active && current.stages.length === 1;
            return (
              <div
                key={stage.id}
                className={`border-2 rounded-lg transition-colors ${
                  active ? "border-game-solid bg-game-50" : "border-gray-200"
                }`}
              >
                <label
                  className={`flex items-start gap-3 px-4 py-3 ${
                    isOnlyActive ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={isOnlyActive}
                    onChange={() => toggleStage(stage.id)}
                    className="mt-1 accent-game-solid"
                  />
                  <span>
                    <span className="block font-medium text-gray-700">{t(stage.nameKey)}</span>
                    <span className="block text-sm text-gray-500">{t(stage.summaryKey)}</span>
                  </span>
                </label>

                {active && stage.settings.length > 0 && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-game-200/60">
                    {stage.settings.map((field) => (
                      <Field
                        key={field.key}
                        field={field}
                        value={current.stageSettings[stage.id][field.key]}
                        onChange={(value) => updateField(stage.id, field.key, value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {t("settings.stagesHint", { count: current.stages.length })}
        </p>
      </div>
    </div>
  );
}
