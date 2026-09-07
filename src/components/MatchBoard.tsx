import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Assignment } from "../../shared/matching";
import { place } from "../../shared/matching";
import MathTex from "./Math";

export interface MatchCard {
  /** KaTeX shown on the card. */
  latex: string;
}

interface MatchContextValue {
  cards: MatchCard[];
  assignment: Assignment;
  selected: number | null;
  setSelected: (card: number | null) => void;
  onChange: (next: Assignment) => void;
  disabled: boolean;
}

const MatchContext = createContext<MatchContextValue | null>(null);

function useMatch(): MatchContextValue {
  const value = useContext(MatchContext);
  if (!value) throw new Error("MatchTray and MatchSlot only work inside a MatchBoard");
  return value;
}

export interface MatchBoardProps {
  cards: MatchCard[];
  assignment: Assignment;
  onChange: (next: Assignment) => void;
  disabled?: boolean;
  /** The layout: a MatchTray plus MatchSlots wherever the stage needs them. */
  children: ReactNode;
}

/**
 * Cards that are dropped into slots. Two ways to move a card, because one of
 * them has to work on a phone: tap the card and then the slot, or drag it.
 */
export default function MatchBoard({
  cards,
  assignment,
  onChange,
  disabled = false,
  children,
}: MatchBoardProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <MatchContext.Provider
      value={{ cards, assignment, selected, setSelected, onChange, disabled }}
    >
      {children}
    </MatchContext.Provider>
  );
}

const CARD_CLASS =
  "px-3 py-2 text-xl rounded-lg border-2 transition-all select-none touch-manipulation";

/** The pool of cards that have not been placed yet. */
export function MatchTray({ className = "" }: { className?: string }) {
  const { cards, assignment, selected, setSelected, disabled } = useMatch();
  const open = cards.map((card, index) => ({ card, index })).filter(({ index }) => assignment[index] == null);

  return (
    <div className={`flex flex-wrap justify-center gap-2 min-h-[3.5rem] ${className}`}>
      {open.map(({ card, index }) => (
        <button
          key={index}
          draggable={!disabled}
          onDragStart={(e) => {
            setSelected(index);
            e.dataTransfer.setData("text/plain", String(index));
          }}
          onClick={() => !disabled && setSelected(selected === index ? null : index)}
          className={`${CARD_CLASS} ${
            selected === index
              ? "border-brand-500 bg-brand-50 scale-105"
              : "border-gray-300 bg-white hover:border-brand-300"
          }`}
        >
          <MathTex tex={card.latex} />
        </button>
      ))}
    </div>
  );
}

export interface MatchSlotProps {
  slot: number;
  /** Shown while the slot is empty. */
  placeholder?: ReactNode;
  className?: string;
}

/** One drop target. Place the selected card by tapping, or drop a card on it. */
export function MatchSlot({ slot, placeholder, className = "" }: MatchSlotProps) {
  const { cards, assignment, selected, setSelected, onChange, disabled } = useMatch();
  const [over, setOver] = useState(false);
  const found = assignment.findIndex((value) => value === slot);
  const card = found === -1 ? null : found;

  const drop = (index: number | null) => {
    if (disabled || index == null) return;
    onChange(place(assignment, index, slot));
    setSelected(null);
  };

  // Tapping puts the selected card here; tapping a filled slot with nothing
  // selected sends its card back to the tray.
  const handleClick = () => {
    if (disabled) return;
    if (selected != null) drop(selected);
    else if (card != null) onChange(place(assignment, card, null));
  };

  return (
    <button
      onClick={handleClick}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const index = Number(e.dataTransfer.getData("text/plain"));
        drop(Number.isInteger(index) ? index : selected);
      }}
      className={`${CARD_CLASS} min-w-[4.5rem] ${
        over
          ? "border-brand-500 bg-brand-50"
          : card != null
            ? "border-brand-400 bg-white"
            : "border-dashed border-gray-300 bg-gray-50 text-gray-400"
      } ${className}`}
    >
      {card != null ? <MathTex tex={cards[card].latex} /> : (placeholder ?? "?")}
    </button>
  );
}
