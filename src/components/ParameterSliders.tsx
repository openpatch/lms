import MathTex from "./Math";

export interface ParameterSpec {
  /** KaTeX label, e.g. "x" or "a". */
  latex: string;
  min: number;
  max: number;
  step: number;
  /** Suffix shown behind the value, e.g. "m". */
  unit?: string;
}

export interface ParameterSlidersProps {
  parameters: ParameterSpec[];
  values: number[];
  onChange: (values: number[]) => void;
  disabled?: boolean;
}

/** Rounds a slider value for display without a trail of zeroes. */
function show(value: number, step: number): string {
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return value.toFixed(decimals);
}

/** One slider per parameter — tune them until the picture fits. */
export default function ParameterSliders({
  parameters,
  values,
  onChange,
  disabled = false,
}: ParameterSlidersProps) {
  return (
    <div className="w-full max-w-xl space-y-3">
      {parameters.map((parameter, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="w-10 text-right text-lg text-gray-600">
            <MathTex tex={parameter.latex} />
          </span>
          <input
            type="range"
            min={parameter.min}
            max={parameter.max}
            step={parameter.step}
            value={values[index]}
            disabled={disabled}
            onChange={(e) => {
              const next = [...values];
              next[index] = Number(e.target.value);
              onChange(next);
            }}
            className="flex-1 accent-brand-500"
          />
          <span className="w-24 text-left text-lg font-medium text-brand-600 tabular-nums">
            {show(values[index], parameter.step)}
            {parameter.unit ? ` ${parameter.unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
