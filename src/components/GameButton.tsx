import type { ReactNode } from "react";

export interface GameButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

/** The primary action button stages use to submit an answer. */
export default function GameButton({ onClick, disabled, children }: GameButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-8 py-3 text-lg font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
    >
      {children}
    </button>
  );
}
