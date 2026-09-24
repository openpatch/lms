import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  ShareableReportSchema,
  type FlowProgress,
} from "../../../../shared/bitflow-progress";
import type { StageProps } from "../../../lib/game-registry";

type Bitflow = typeof import("@bitflow/web-component/flow");
type Snapshot = Parameters<Bitflow["flowProgress"]>[1];
type FlowElement = HTMLElement & { flow?: unknown; attempt?: unknown; locale?: string };

/**
 * The flow in this game's colours. bitflow takes every colour from a
 * `--bitflow-*` property, so declaring them on the box it sits in re-themes it.
 * The whole primary family is set, not only the primary, or the flow's hover
 * and focus ring would stay bitflow's own green beside the game's buttons.
 */
const FLOW_THEME = {
  "--bitflow-color-primary": "var(--game-solid)",
  "--bitflow-color-primary-dark": "var(--game-solid-hover)",
  "--bitflow-color-primary-light": "var(--game-100)",
  "--bitflow-color-on-primary": "#ffffff",
  "--bitflow-shadow-outline": "0 0 0 3px color-mix(in srgb, var(--game-solid) 40%, transparent)",
} as CSSProperties;

/** How often, at most, progress goes to the server while a player works. */
const SEND_EVERY_MS = 1_000;

/**
 * A bitflow flow, on the player's own device.
 *
 * The flow is fetched from the address the teacher gave, run and marked here,
 * in the browser, the way it is anywhere else a flow is embedded. What goes to
 * the server is where the player is and a report of how it went with every
 * answer taken out by `createShareableReport` — never what they wrote.
 *
 * The attempt is kept in this browser as it goes, so a reload or a dropped
 * connection puts the player back where they were rather than at the start.
 */
export default function FlowStage({ data, playerId, sendAction }: StageProps) {
  const { t, i18n } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const url = String(data.settings.flowUrl ?? "");
  // The action is re-created on every render; the flow is not, so it reads the
  // latest through a ref rather than being torn down and set up again.
  const send = useRef(sendAction);
  useEffect(() => {
    send.current = sendAction;
  });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let element: FlowElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let latest: FlowProgress | null = null;

    const flush = () => {
      timer = undefined;
      if (latest) send.current({ action: "progress", progress: latest });
    };

    void (async () => {
      let bitflow: Bitflow;
      try {
        bitflow = await import("@bitflow/web-component/flow");
      } catch {
        if (!cancelled) setProblem(t("games.bitflow.loadFailed"));
        return;
      }

      let json: unknown;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(String(response.status));
        json = await response.json();
      } catch {
        if (!cancelled) setProblem(t("games.bitflow.fetchFailed"));
        return;
      }

      const parsed = bitflow.parseFlow(json);
      if (!parsed.ok) {
        if (!cancelled) setProblem(t("games.bitflow.invalidFlow"));
        return;
      }
      if (cancelled || !host.current) return;
      const doc = parsed.value;
      const storageKey = `lms-bitflow:${playerId}:${doc.meta.id}`;

      const progressOf = (snapshot: Snapshot): FlowProgress => {
        const where = bitflow.flowProgress(doc, snapshot);
        return {
          status: snapshot.status,
          visited: where.visited,
          total: Number.isFinite(where.remaining) ? where.visited + where.remaining : where.visited,
          // Validate at the browser boundary too. The server repeats this
          // check because a client can be changed, but doing it here also
          // keeps a mismatched bitflow package from sending a malformed frame.
          report: ShareableReportSchema.parse(
            bitflow.createShareableReport(doc, snapshot, { id: playerId }),
          ),
        };
      };

      const report = (snapshot: Snapshot, now = false) => {
        latest = progressOf(snapshot);
        try {
          localStorage.setItem(storageKey, JSON.stringify(snapshot));
        } catch {
          // Private browsing, or storage full: the flow still runs, it just
          // will not survive a reload.
        }
        if (now) {
          clearTimeout(timer);
          flush();
        } else if (timer === undefined) {
          timer = setTimeout(flush, SEND_EVERY_MS);
        }
      };

      element = document.createElement("bitflow-flow") as FlowElement;
      element.locale = i18n.language;
      // The document before the attempt: a restored attempt is checked against
      // the document it belongs to, and rejected when that has changed.
      element.flow = doc;
      let saved: Snapshot | null = null;
      try {
        const stored = localStorage.getItem(storageKey);
        saved = stored ? (JSON.parse(stored) as Snapshot) : null;
      } catch {
        saved = null;
      }
      if (saved) element.attempt = saved;

      element.addEventListener("bitflow-statechange", (event) =>
        report((event as CustomEvent).detail as Snapshot),
      );
      element.addEventListener("bitflow-complete", (event) =>
        report((event as CustomEvent).detail.attempt as Snapshot, true),
      );
      element.addEventListener("bitflow-error", (event) =>
        setProblem((event as CustomEvent).detail.message),
      );
      host.current.append(element);

      // Nothing is emitted until the player does something, so the teacher's
      // board is told straight away that this player has the flow open.
      if (saved) report(saved, true);
      else send.current({ action: "progress", progress: { status: "inProgress", visited: 0, total: 0 } });
    })();

    return () => {
      cancelled = true;
      if (timer !== undefined) flush();
      clearTimeout(timer);
      element?.remove();
    };
  }, [url, playerId, i18n.language, t]);

  return (
    <div className="w-full max-w-3xl">
      {(problem ?? (url ? null : t("games.bitflow.noFlow"))) && (
        <p role="alert" className="mb-4 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
          {problem ?? t("games.bitflow.noFlow")}
        </p>
      )}
      {/* A height of its own, so the flow scrolls its step inside it and keeps
          its buttons in view between the lobby's bars above and below. */}
      <div
        ref={host}
        style={FLOW_THEME}
        className="flex h-[calc(100dvh-13rem)] min-h-80 flex-col overflow-hidden rounded-2xl border-2 border-game-200 bg-white [&>bitflow-flow]:flex-1 [&>bitflow-flow]:min-h-0"
      />
    </div>
  );
}
