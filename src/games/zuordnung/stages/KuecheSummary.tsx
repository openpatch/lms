import { useTranslation } from "react-i18next";
import type { StageProps } from "../../../lib/game-registry";
import { liveAverageMs, liveTally } from "../../../../shared/framework";
import type {
  KuecheOrder,
  KuecheRoundExtra,
  KuecheSlot,
} from "../../../../shared/games/zuordnung";
import Icon from "../../../components/icons";
import { BADGE, MARK } from "../../../components/review-badges";
import { SlotLine } from "../../../components/review-parts";

/**
 * What a round of Küchen-Panik came to — and what went wrong where.
 *
 * The tally says how many orders were served; the list under it walks the
 * tickets back the way the question rounds do: every order with the badge of
 * its verdict, and per ingredient what was picked against what belonged there.
 * The picks come from the player's own settled entries, which the server keeps
 * per player — nobody else's picks are on this device.
 */
export default function KuecheSummary({ data, playerId }: StageProps) {
  const { t } = useTranslation();
  const tally = liveTally(data, playerId);
  const average = liveAverageMs(tally);
  const { orders, settled, truth } = data.extra as unknown as KuecheRoundExtra;
  const byId = new Map((settled?.[playerId] ?? []).map((entry) => [entry.id, entry]));

  const rows: { label: string; value: string; tone: string }[] = [
    {
      label: t("games.zuordnung.summary.served"),
      value: String(tally.hits),
      tone: "text-emerald-600",
    },
    {
      label: t("games.zuordnung.summary.burnt"),
      value: String(tally.misses),
      tone: "text-gray-400",
    },
    {
      label: t("games.zuordnung.summary.streak"),
      value: String(tally.bestStreak),
      tone: "text-game-ink",
    },
    ...(average != null
      ? [
          {
            label: t("games.zuordnung.summary.average"),
            value: `${average} ms`,
            tone: "text-game-ink",
          },
        ]
      : []),
  ];

  /** A tile as it reads on the ticket: value, unit, and minutes for the pans. */
  const fmtTile = (order: KuecheOrder, slot: KuecheSlot, value: string): string =>
    `${value}${slot.unit ? ` ${slot.unit}` : ""}${
      order.task === "pfanne"
        ? ` ${t("games.zuordnung.minutes", { count: Number(value.replace(",", ".")) })}`
        : ""
    }`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-center"
          >
            <div className={`text-2xl font-bold tabular-nums ${row.tone}`}>{row.value}</div>
            <div className="text-xs text-gray-500">{row.label}</div>
          </div>
        ))}
      </div>

      <ol className="space-y-2">
        {orders.map((order) => {
          const entry = byId.get(order.id);
          // The solution comes from the settled entry when there is one, and
          // from the round-over reveal for tickets that were never served.
          const orderTruth = entry?.truth ?? truth?.[order.id];
          const state = entry == null ? "missing" : entry.correct ? "correct" : "wrong";
          return (
            <li
              key={order.id}
              className="flex items-start gap-3 rounded-lg border-2 border-gray-200 bg-white px-3 py-2"
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold ${BADGE[state]}`}
                aria-label={t(`game.answer.${state}`)}
              >
                {MARK[state]}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-gray-800">
                  <Icon name={order.icon} className="mr-1" />
                  {t(order.wordingKey, order.params)}
                </p>
                {order.slots.map((slot, slotIndex) => {
                  const pickIndex = entry?.picks[slotIndex];
                  const picked =
                    entry != null &&
                    pickIndex != null &&
                    Number.isInteger(pickIndex) &&
                    slot.tiles[pickIndex] != null
                      ? slot.tiles[pickIndex]
                      : undefined;
                  const slotTruth = orderTruth?.[slotIndex];
                  return (
                    <SlotLine
                      key={slot.labelKey}
                      label={t(slot.labelKey)}
                      given={picked != null ? fmtTile(order, slot, picked) : undefined}
                      truth={slotTruth != null ? fmtTile(order, slot, slotTruth) : ""}
                      correct={
                        slotTruth == null ? true : picked != null && picked === slotTruth
                      }
                    />
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
