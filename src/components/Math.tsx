import { useEffect, useRef } from "react";
import katex from "katex";

interface MathProps {
  tex: string;
  display?: boolean;
  className?: string;
}

export default function Math({ tex, display = false, className }: MathProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    katex.render(tex, containerRef.current, {
      displayMode: display,
      throwOnError: false,
      errorColor: "#ef4444",
    });
  }, [tex, display]);

  return <span ref={containerRef} className={className} />;
}
