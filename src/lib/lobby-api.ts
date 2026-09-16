import { serverUrl } from "./connection";

/**
 * Opening a lobby, from wherever a teacher asks for one.
 *
 * Two screens ask: the game's page, and the screen a lobby leaves behind when
 * it closes. They differ in what they draw around it and not in what they send,
 * and the refusal has enough shape to it — a code, a game, a headcount — that
 * having it described twice would be two places for it to drift.
 */
export interface CreateLobbyOptions {
  gameId: string;
  /** A lobby with nobody in it but the teacher, for trying the round out. */
  demo?: boolean;
  /**
   * Close whatever this teacher already has open and take its place.
   *
   * Only ever sent in answer to a `blocked` result that has already said what
   * is open and how many of the class are in it. Never a default: a lobby with
   * a class in it must not be closeable by one stray click.
   */
  replace?: boolean;
}

export type CreateLobbyResult =
  | { status: "ok"; code: string }
  /** One lobby per teacher, and this is the one in the way. */
  | { status: "blocked"; code: string; gameId: string; players: number }
  | { status: "unauthorised" }
  | { status: "unreachable" }
  | { status: "failed" };

export async function createLobby({
  gameId,
  demo = false,
  replace = false,
}: CreateLobbyOptions): Promise<CreateLobbyResult> {
  let response: Response;
  try {
    response = await fetch(serverUrl("/parties/lobbies"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId, demo, replace }),
    });
  } catch {
    return { status: "unreachable" };
  }

  if (response.status === 401) return { status: "unauthorised" };

  let data: { code?: string; gameId?: string; players?: number };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    return { status: "failed" };
  }

  if (response.status === 409 && data.code) {
    return {
      status: "blocked",
      code: data.code,
      gameId: data.gameId ?? gameId,
      players: data.players ?? 0,
    };
  }
  if (!response.ok || !data.code) return { status: "failed" };
  return { status: "ok", code: data.code };
}

/** Where a lobby of this kind is played from. */
export function lobbyPath(gameId: string, code: string, demo = false): string {
  return `/arena/${gameId}/${demo ? "demo" : "host"}/${code}`;
}
