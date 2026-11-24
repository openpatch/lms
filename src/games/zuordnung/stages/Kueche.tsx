import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { liveTally } from "../../../../shared/framework";
import {
  type KuecheOrder,
  type KuecheRoundExtra,
} from "../../../../shared/games/zuordnung";
import type { StageProps } from "../../../lib/game-registry";
import Icon from "../../../components/icons";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import { serverTime } from "../../../lib/server-time";
import RecipeCard from "../components/RecipeCard";

/** How long the verdict of a settled ticket stays on screen, tiles lit up. */
const FLASH_MS = 900;

const TILE =
  "px-2 py-3 rounded-lg border-2 border-gray-200 bg-white text-lg font-semibold tabular-nums " +
  "hover:border-game-400 hover:bg-game-50 transition-colors disabled:opacity-60";
const TILE_PICKED = "border-game-solid bg-game-100 text-game-ink";
/** The flash of a settled ticket: the picked tile lights up green or red … */
const TILE_RIGHT = "border-emerald-500 bg-emerald-100 text-emerald-800";
const TILE_WRONG = "border-rose-500 bg-rose-100 text-rose-700";
/** … and when it was wrong, the right tile lights up green beside it. */
const TILE_TRUTH = "border-emerald-500 bg-emerald-50 text-emerald-700";

/** What the flash of a settled ticket carries: the verdict and the truth per slot. */
interface Flash {
  ok: boolean;
  key: number;
  picks: number[];
  truth: string[];
}

/** The stack of pancakes the player has earned, plus the flash of the last ticket. */
function PancakeStack({ count, flash }: { count: number; flash: Flash | null }) {
  const { t } = useTranslation();
  const shown = Math.min(count, 10);
  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col-reverse" aria-hidden>
        {Array.from({ length: shown }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 w-10 rounded-full ${flash && !flash.ok ? "bg-rose-400" : "bg-amber-400"}`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-600 tabular-nums">
        {count > 0 ? `× ${count}` : ""}
      </span>
      {flash && (
        <span
          key={flash.key}
          className={`text-sm font-semibold ${flash.ok ? "text-emerald-600" : "text-rose-500"}`}
        >
          {flash.ok ? t("games.zuordnung.servedFlash") : t("games.zuordnung.burntFlash")}
        </span>
      )}
    </div>
  );
}

/**
 * Küchen-Panik — the live one. Orders arrive one at a time; per slot the
 * player taps the amount tile they think is right and sends the order off.
 * There is no per-ticket clock — the round's clock in the header is the only
 * timer, so the game is simply: serve as many orders as you can, correctly.
 *
 * The tickets came with the round, so every device runs the same list; what a
 * device does not have is which tile is right — it reports its picks and the
 * server settles the ticket. The verdict comes back in this player's own
 * settled entry: the ticket just served stays on screen for a moment with the
 * picked tiles lit up green or red (and the right one in green when it was
 * wrong), the full-screen flash of the shell says the same, and the tally is
 * what moves this player on to the next ticket.
 */
export default function KuecheStage({ data, sendAction, playerId }: StageProps) {
  const { t } = useTranslation();
  const extra = data.extra as unknown as KuecheRoundExtra;
  const { orders } = extra;
  const tally = liveTally(data, playerId);
  /** The next ticket the server will accept from this player. */
  const index = tally.hits + tally.misses;

  /** The ticket on screen — lags `index` by one flash after a verdict. */
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  /** The tile picked per slot of the ticket on screen. */
  const [picks, setPicks] = useState<(number | undefined)[]>([]);
  /** When the ticket on screen became current on this device. */
  const [startedAt, setStartedAt] = useState(() => serverTime());
  /** Whether the ticket on screen was already sent — taps after that do nothing. */
  const [sent, setSent] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);

  // A verdict arrived: flash the ticket on screen with its picks lit up, then
  // move on to the next one. A jump (rejoin mid-round) syncs without flashing.
  useEffect(() => {
    if (index === shownRef.current) return;
    const mine = extra.settled?.[playerId] ?? [];
    const entry = index >= 1 ? mine[index - 1] : undefined;
    if (entry && index === shownRef.current + 1) {
      setFlash({ ok: entry.correct, key: index, picks: entry.picks, truth: entry.truth });
      const timer = setTimeout(() => {
        setFlash(null);
        shownRef.current = index;
        setShown(index);
        setPicks([]);
        setSent(false);
        setStartedAt(serverTime());
      }, FLASH_MS);
      return () => clearTimeout(timer);
    }
    shownRef.current = index;
    setShown(index);
    setPicks([]);
    setSent(false);
    setStartedAt(serverTime());
  }, [index, extra, playerId]);

  const order: KuecheOrder | undefined = orders[shown];

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-4">
        <PancakeStack count={tally.hits} flash={flash} />
        <p className="text-gray-500">{t("games.zuordnung.allDone")}</p>
      </div>
    );
  }

  const ready = picks.length === order.slots.length && picks.every((pick) => pick !== undefined);

  const pick = (slot: number, tile: number) => {
    if (sent) return;
    setPicks((previous) => {
      const next = [...previous];
      next[slot] = tile;
      return next;
    });
  };

  const submit = () => {
    if (!ready || sent) return;
    // The time is sent along for the round's average; it no longer decides
    // whether the ticket counts — only the picked tiles do.
    const ms = Math.round(serverTime() - startedAt);
    setSent(true);
    sendAction({ action: "hits", events: [{ id: order.id, ms, picks }] });
  };

  /** How a tile renders while the verdict flash is up. */
  const tileClass = (slotIndex: number, tileIndex: number, tile: string): string => {
    if (!flash) return picks[slotIndex] === tileIndex ? TILE_PICKED : "";
    const picked = flash.picks[slotIndex] === tileIndex;
    if (picked) {
      return flash.truth[slotIndex] === tile ? TILE_RIGHT : TILE_WRONG;
    }
    // Not picked, but the right one — light it up so the mistake is visible.
    return flash.truth[slotIndex] === tile ? TILE_TRUTH : "";
  };

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-medium text-gray-500 tabular-nums">
          {t("games.zuordnung.progress", { index: shown + 1, total: orders.length })}
        </span>
        <PancakeStack count={tally.hits} flash={flash} />
      </div>

      <div key={order.id} className="animate-question-in flex w-full flex-col items-center gap-4">
        <Icon name={order.icon} className="text-4xl" />
        <p className="text-center text-lg font-medium text-gray-800">
          {t(order.wordingKey, order.params)}
        </p>

        {order.recipe.length > 0 && (
          <div className="w-full max-w-xs rounded-xl border-2 border-game-200 bg-game-50 px-5 py-2">
            <RecipeCard lines={order.recipe} />
          </div>
        )}

        {order.slots.map((slot, slotIndex) => (
          <div key={slot.labelKey} className="w-full">
            <div className="mb-1 text-sm font-medium text-gray-600">{t(slot.labelKey)}</div>
            <div className="grid grid-cols-4 gap-2">
              {slot.tiles.map((tile, tileIndex) => (
                <button
                  key={tileIndex}
                  type="button"
                  disabled={sent}
                  onClick={() => pick(slotIndex, tileIndex)}
                  className={`${TILE} ${tileClass(slotIndex, tileIndex, tile)}`}
                >
                  {tile}
                  {slot.unit ? ` ${slot.unit}` : ""}
                  {order.task === "pfanne"
                    ? ` ${t("games.zuordnung.minutes", { count: Number(tile.replace(",", ".")) })}`
                    : ""}
                </button>
              ))}
            </div>
          </div>
        ))}

        <StageActionBar>
          <GameButton onClick={submit} disabled={!ready || sent}>
            {t("games.zuordnung.serve")}
          </GameButton>
        </StageActionBar>
      </div>
    </div>
  );
}

/** The arithmetic at a glance: the factor for a ticket, the product for pans. */
export function KuecheRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1 text-sm text-gray-500">
      <p>{t("games.zuordnung.rulesExampleKueche", { for: 4, cookingFor: 10, factor: "2,5" })}</p>
      <p className="text-xs text-gray-400">{t("games.zuordnung.rulesExampleKuechePans")}</p>
    </div>
  );
}
