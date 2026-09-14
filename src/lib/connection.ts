import { useRef, useState, useCallback } from "react";
import usePartySocket from "partysocket/react";
import type {
  ClientMessage,
  ServerMessage,
  LobbyState,
  LobbyClosedReason,
} from "../../shared/types";

// The client talks to the host it was served from: Caddy proxies /parties to
// the game server in production, and the Vite dev server does the same locally.
// VITE_SERVER_HOST is only an escape hatch for pointing at another machine.
const SERVER_HOST = (import.meta.env.VITE_SERVER_HOST as string | undefined) || window.location.host;

export function serverUrl(path: string): string {
  return SERVER_HOST === window.location.host ? path : `${window.location.protocol}//${SERVER_HOST}${path}`;
}

/** A per-lobby client id, stable across reloads, that the server uses to recognise a player. */
export function getStableId(roomId: string): string {
  const key = `lms:clientId:${roomId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

/** The id this browser uses when opening lobbies. Becomes a teacher account id later. */
export function getHostId(): string {
  const key = "lms:hostId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export interface GameConnection {
  socket: ReturnType<typeof usePartySocket> | null;
  lobbyState: LobbyState | null;
  error: string | null;
  /** Set once the lobby is gone; the socket is closed and will not reconnect. */
  closed: LobbyClosedReason | null;
  sendMessage: (msg: ClientMessage) => void;
  sendGameAction: (payload: unknown) => void;
  connected: boolean;
}

/**
 * Talk to one lobby. The host must pass the same id it opened the lobby with,
 * or the server will not recognise it as the host.
 */
export function useGameConnection(
  roomId: string,
  onMessage?: (msg: ServerMessage) => void,
  connectionId?: string,
): GameConnection {
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState<LobbyClosedReason | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const socketRef = useRef<ReturnType<typeof usePartySocket> | null>(null);

  const stableId = connectionId ?? getStableId(roomId);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data) as ServerMessage;
      switch (msg.type) {
        case "lobby-state":
          setLobbyState(msg.state);
          break;
        case "error":
          setError(msg.message);
          break;
        case "lobby-closed":
          setClosed(msg.reason);
          // Stop partysocket from dialling a lobby that no longer exists.
          socketRef.current?.close();
          setConnected(false);
          break;
        default:
          onMessageRef.current?.(msg);
      }
    } catch {
      console.error("Failed to parse server message");
    }
  }, []);

  const socket = usePartySocket({
    host: SERVER_HOST,
    room: roomId,
    id: stableId,
    onOpen() {
      setConnected(true);
      setError(null);
    },
    onMessage: handleMessage,
    onClose() {
      setConnected(false);
    },
    onError() {
      setError("Connection error");
      setConnected(false);
    },
  });
  socketRef.current = socket;

  const sendMessage = useCallback(
    (msg: ClientMessage) => {
      socket.send(JSON.stringify(msg));
    },
    [socket],
  );

  const sendGameAction = useCallback(
    (payload: unknown) => {
      sendMessage({ type: "game-action", payload });
    },
    [sendMessage],
  );

  return {
    socket,
    lobbyState,
    error,
    closed,
    sendMessage,
    sendGameAction,
    connected,
  };
}
