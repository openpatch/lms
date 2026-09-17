import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ActionBarContext } from "./action-bar";
import Icon from "./icons";
import { calculate, formatResult } from "../lib/calculator";

/**
 * A scratch calculator for the stations that ask what a listing prints.
 *
 * `1273 // 17` is a fair thing to ask a program to work out and an unfair thing
 * to ask a fifteen-year-old to work out in their head against a clock — the
 * station is asking whether they can follow the program, and long division
 * under time pressure measures something else entirely. So the stations whose
 * listings do real arithmetic lend the class one of these (`calculator` in
 * src/lib/game-registry.ts), and the shell hangs it off the bottom bar.
 *
 * It is a scratchpad and nothing more: it does not know the question, and
 * nothing it works out goes anywhere near the answer field. Reading `7 / 2` as
 * 3.5 and knowing that Java prints 3 is still the player's half of the job.
 */
export default function Calculator() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [expression, setExpression] = useState("");
  const bar = useContext(ActionBarContext);

  const result = calculate(expression);

  const toggle = () => {
    // On a phone the field the answer is typed into holds the on-screen
    // keyboard up, which is exactly where the keypad wants to be.
    if (!open && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setOpen((was) => !was);
  };

  const button = (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      // A secondary control, so the proportions of one: the stage's own button
      // is the primary thing in this bar and has to stay the taller of the two.
      className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-semibold transition-colors ${
        open
          ? "border-game-solid bg-game-50 text-game-ink"
          : "border-gray-200 text-gray-600 hover:border-game-solid hover:text-game-ink"
      }`}
    >
      <Icon name="calculator" />
      <span className="hidden sm:inline">{t("game.calculator")}</span>
    </button>
  );

  return (
    <>
      {/* The bar is the shell's, and the shell is what mounts this — so the
          portal is done here rather than through StageActionBar, which would
          make the two files import each other. */}
      {bar ? createPortal(button, bar) : button}
      {open && (
        <Keypad
          expression={expression}
          result={result}
          onChange={setExpression}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** What a key does to the expression being typed. */
type Key =
  | { label: string; insert: string; kind: "digit" | "operator" | "bracket" }
  | { label: string; action: "clear" | "back" | "equals"; kind: "control" };

const KEYS: Key[][] = [
  [
    { label: "C", action: "clear", kind: "control" },
    { label: "(", insert: "(", kind: "bracket" },
    { label: ")", insert: ")", kind: "bracket" },
    { label: "⌫", action: "back", kind: "control" },
  ],
  [
    { label: "7", insert: "7", kind: "digit" },
    { label: "8", insert: "8", kind: "digit" },
    { label: "9", insert: "9", kind: "digit" },
    { label: "÷", insert: "/", kind: "operator" },
  ],
  [
    { label: "4", insert: "4", kind: "digit" },
    { label: "5", insert: "5", kind: "digit" },
    { label: "6", insert: "6", kind: "digit" },
    { label: "×", insert: "*", kind: "operator" },
  ],
  [
    { label: "1", insert: "1", kind: "digit" },
    { label: "2", insert: "2", kind: "digit" },
    { label: "3", insert: "3", kind: "digit" },
    { label: "−", insert: "-", kind: "operator" },
  ],
  [
    { label: "0", insert: "0", kind: "digit" },
    { label: ",", insert: ".", kind: "digit" },
    { label: "xʸ", insert: "^", kind: "operator" },
    { label: "+", insert: "+", kind: "operator" },
  ],
];

const OPERATORS = "+-*/^";

/**
 * The expression after a key, with the two corrections every calculator makes
 * silently: an operator typed over an operator replaces it rather than piling
 * up, and a decimal point that has no number in front of it grows a zero.
 */
function withInsert(expression: string, key: Extract<Key, { insert: string }>): string {
  const last = expression.slice(-1);

  if (key.kind === "operator") {
    // A minus right after "(" or at the very front is a sign, not an operator.
    const sign = key.insert === "-" && (expression === "" || last === "(");
    if (!sign && (expression === "" || OPERATORS.includes(last))) {
      if (expression === "") return expression;
      return expression.slice(0, -1) + key.insert;
    }
    return expression + key.insert;
  }

  if (key.insert === ".") {
    // Only one point per number, and never a bare one.
    const number = expression.split(/[+\-*/^()]/).pop() ?? "";
    if (number.includes(".")) return expression;
    return number === "" ? `${expression}0.` : expression + ".";
  }

  return expression + key.insert;
}

function Keypad({
  expression,
  result,
  onChange,
  onClose,
}: {
  expression: string;
  result: number | null;
  onChange: (next: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const panel = useRef<HTMLDivElement>(null);

  // The keypad covers the bottom of the screen, and on a phone that is most of
  // it — a listing the sum is being copied out of can end up behind it. So the
  // page grows by the keypad's height while it is up, which is what makes the
  // question scrollable clear of it. It is laid on the body because the page
  // is what scrolls; the bars are fixed and do not move with it.
  useEffect(() => {
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${panel.current?.offsetHeight ?? 0}px`;
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, []);

  const press = (key: Key) => {
    if (key.kind !== "control") {
      onChange(withInsert(expression, key));
      return;
    }
    if (key.action === "clear") onChange("");
    if (key.action === "back") onChange(expression.slice(0, -1));
    // "=" folds the result back in, so the next sum can carry on from it.
    if (key.action === "equals" && result !== null) onChange(formatResult(result));
  };

  return (
    <div
      ref={panel}
      role="group"
      aria-label={t("game.calculator")}
      // Above the bar the toggle sits in, and above the virtual keyboard when a
      // stage has one up (the bar rides on the same variable).
      style={{ bottom: "calc(var(--virtual-keyboard-height, 0px) + 5.5rem)" }}
      // Full width on a phone and a panel at the side from `sm` up. A phone has
      // no side to put it at: the same keypad floated to the right there lands
      // over the listing the sum is being read out of.
      className="animate-fade-in fixed inset-x-3 z-30 rounded-2xl border-2 border-game-200 bg-white p-3 shadow-xl sm:left-auto sm:w-68"
    >
      <div className="mb-2 rounded-xl bg-gray-50 px-3 py-2 text-right">
        <div className="min-h-6 truncate font-mono text-lg text-gray-700" aria-hidden>
          {expression.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−") || "0"}
        </div>
        <div className="min-h-7 truncate font-mono text-xl font-bold text-game-ink">
          {result === null ? "" : `= ${formatResult(result)}`}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {KEYS.flat().map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={() => press(key)}
            className={`rounded-lg py-2.5 text-lg font-semibold transition-colors ${
              key.kind === "digit"
                ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                : key.kind === "control"
                  ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  : "bg-game-50 text-game-ink hover:bg-game-100"
            }`}
          >
            {key.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => press({ label: "=", action: "equals", kind: "control" })}
          disabled={result === null}
          className="col-span-3 rounded-lg bg-game-solid py-2.5 text-lg font-bold text-white transition-colors hover:bg-game-solid-hover disabled:bg-gray-200 disabled:text-gray-400"
        >
          =
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("game.calculatorClose")}
          className="rounded-lg bg-gray-200 py-2.5 text-lg font-semibold text-gray-600 transition-colors hover:bg-gray-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
