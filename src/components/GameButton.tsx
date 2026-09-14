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
      className="px-8 py-3 text-lg font-bold text-white bg-game-solid rounded-xl hover:bg-game-solid-hover disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
    >
      {children}
    </button>
  );
}
