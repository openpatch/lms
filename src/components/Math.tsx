import { useEffect, useRef } from "react";
import katex from "katex";

interface MathProps {
  tex: string;
  /** Display style: bigger operators, on a line of its own. */
  display?: boolean;
  /** Inline style, but laid out as a block that fits the width it is given. */
  block?: boolean;
  className?: string;
}

/** How far a formula may shrink to fit; below that it is scrolled instead. */
const MIN_SCALE = 0.4;

/**
 * How wide the formula actually is. A display formula sits in a block as wide
 * as its container and is allowed to spill out of it, so the box itself says
 * nothing about the line — the pieces on the line do.
 */
function lineWidth(host: HTMLElement) {
  const line = host.querySelector(".katex-html") ?? host.querySelector(".katex");
  if (!line) return 0;
  const parts = line.children.length > 0 ? Array.from(line.children) : [line];
  let left = Infinity;
  let right = -Infinity;
  for (const part of parts) {
    const box = part.getBoundingClientRect();
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
  }
  return right - left;
}

/**
 * Shrinks the formula until it fits the width it has. A collected term like
 * -7xy² + 3x²y - 5 + 4xy² is wider than a phone at the size the stage asks
 * for, and half of it disappearing off the edge makes the question unanswerable.
 */
function fitToWidth(host: HTMLElement) {
  // Back to the size the class asks for, so this measures the full formula
  host.style.fontSize = "";
  const available = host.clientWidth;
  // In pixels, not per cent: a percentage is read against the size this span
  // inherits, which would throw away the size its own class gave it.
  const size = parseFloat(getComputedStyle(host).fontSize);
  if (available === 0 || !size) return;

  // KaTeX does not shrink quite proportionally — glyph widths and the sizes of
  // stretchy brackets come in steps — so one pass can leave a long term a few
  // per cent too wide. The next passes take that remainder off.
  let scale = 1;
  for (let pass = 0; pass < 3; pass++) {
    const natural = lineWidth(host);
    if (natural === 0 || natural <= available) return;
    scale = Math.max(MIN_SCALE, (scale * available) / natural);
    host.style.fontSize = `${size * scale}px`;
    if (scale === MIN_SCALE) return;
  }
}

export default function MathTex({ tex, display = false, block = false, className }: MathProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  // Only a formula with a width of its own can be measured against one
  const fitted = display || block;

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    katex.render(tex, host, {
      displayMode: display,
      throwOnError: false,
      errorColor: "#ef4444",
    });
    if (!fitted) return;

    // Fitting resizes the formula, which the observers below would report back
    // as something to fit again; this skips the echo of our own change.
    let adjusting = false;
    const refit = () => {
      if (adjusting) return;
      adjusting = true;
      fitToWidth(host);
      requestAnimationFrame(() => {
        adjusting = false;
      });
    };
    refit();

    // The first measurement is taken with whatever font is on the screen right
    // then, and the KaTeX fonts are usually still on their way — this formula is
    // what asks for them in the first place. Watching the line itself catches the
    // moment they land and every glyph on it changes width.
    const observer = new ResizeObserver(refit);
    observer.observe(host);
    const line = host.querySelector(".katex-html") ?? host.querySelector(".katex");
    for (const part of line?.children ?? []) observer.observe(part);

    return () => observer.disconnect();
  }, [tex, display, fitted]);

  return (
    <span
      ref={containerRef}
      // A formula in block layout takes the width it is given and scrolls rather
      // than growing its parent — without that, a wide term pushes the whole
      // stage sideways and runs off the screen.
      className={`${fitted ? "block w-full max-w-full overflow-x-auto " : ""}${className ?? ""}`}
    />
  );
}
