import { useEffect, useRef } from "react";
import type { MathfieldElement } from "mathlive";

/** Set while the virtual keyboard is up, so a pinned bar can move above it. */
const KEYBOARD_HEIGHT = "--virtual-keyboard-height";

export interface TermInputProps {
  /** The term as LaTeX. Changing it from outside resets the field. */
  value: string;
  onChange: (latex: string) => void;
  /** Enter, or the return key of the virtual keyboard. */
  onSubmit?: () => void;
  autoFocus?: boolean;
  ariaLabel?: string;
}

/**
 * A math field the players type terms into: 3x², ½a and (x+3)(x−2) come out as
 * LaTeX, which the server parses and grades (see shared/term-algebra.ts).
 *
 * On a tablet MathLive brings its own keyboard up, so a term can be written
 * without hunting for ^ and / on a soft keyboard meant for prose. The library
 * is loaded on demand — only the games that ask for a term pay for it.
 */
export default function TermInput({
  value,
  onChange,
  onSubmit,
  autoFocus = true,
  ariaLabel,
}: TermInputProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<MathfieldElement | null>(null);
  // Kept in refs so that re-rendering never has to rebuild the field
  const changeRef = useRef(onChange);
  const submitRef = useRef(onSubmit);

  useEffect(() => {
    changeRef.current = onChange;
    submitRef.current = onSubmit;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let field: MathfieldElement | null = null;
    let cancelled = false;

    import("mathlive").then(({ MathfieldElement }) => {
      if (cancelled) return;

      // The fonts MathLive wants are the KaTeX fonts, and katex.min.css already
      // puts them on the page (see main.tsx) — so its own stylesheet is not
      // needed. The sounds are keyboard clicks nobody asked for in a classroom.
      MathfieldElement.fontsDirectory = null;
      MathfieldElement.soundsDirectory = null;

      field = new MathfieldElement();
      field.style.width = "100%";
      field.style.fontSize = "1.75rem";
      field.style.padding = "0.5rem 0.75rem";

      let lastCommit = 0;
      const commit = () => {
        // Enter reaches us as a key event and as a change; submit once
        const now = Date.now();
        if (now - lastCommit < 250) return;
        lastCommit = now;
        submitRef.current?.();
      };

      field.addEventListener("input", () => changeRef.current(field!.value));
      field.addEventListener("change", () => {
        // "change" also fires when the field loses focus — that is not a submit
        if (document.activeElement === field) commit();
      });
      field.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      });

      host.appendChild(field);
      // These only take once the element is in the document
      field.value = value;
      // Letters stay variables: "sin" is three factors here, not a function
      field.smartMode = false;
      field.mathVirtualKeyboardPolicy = "auto";
      field.menuItems = [];
      fieldRef.current = field;
      if (autoFocus) field.focus();
    });

    return () => {
      cancelled = true;
      field?.remove();
      fieldRef.current = null;
    };
    // The field is built once; `value` is pushed in by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  // The virtual keyboard is fixed to the bottom of the screen and would sit on
  // top of the stage's action bar; this lets the bar step out of its way.
  useEffect(() => {
    const keyboard = window.mathVirtualKeyboard;
    if (!keyboard) return;
    const update = () => {
      const height = keyboard.visible ? keyboard.boundingRect.height : 0;
      document.documentElement.style.setProperty(KEYBOARD_HEIGHT, `${height}px`);
    };
    keyboard.addEventListener("geometrychange", update);
    update();
    return () => {
      keyboard.removeEventListener("geometrychange", update);
      document.documentElement.style.removeProperty(KEYBOARD_HEIGHT);
    };
  }, []);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (field.value !== value) field.value = value;
    field.ariaLabel = ariaLabel ?? null;
  }, [value, ariaLabel]);

  return (
    <div
      ref={hostRef}
      className="w-full max-w-md min-h-[3.25rem] bg-white border-2 border-gray-200 rounded-lg focus-within:border-game-solid overflow-x-auto"
    />
  );
}
