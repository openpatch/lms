import { useRef, useState, useCallback } from "react";
import usePartySocket from "partysocket/react";
import type { ClientMessage, ServerMessage, LobbyState } from "../../shared/types";

// The PartyKit host. In dev, it's localhost:1997.
// In production, set VITE_PARTYKIT_HOST to your deployed PartyKit URL.
const PARTYKIT_HOST =
  (import.meta.env.VITE_PARTYKIT_HOST as string | undefined) ?? "localhost:1997";

function getStableId(roomId: string): string {
  const key = `lms:clientId:${roomId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export interface PartyConnection {
  socket: ReturnType<typeof usePartySocket> | null;
  lobbyState: LobbyState | null;
  error: string | null;
  sendMessage: (msg: ClientMessage) => void;
  sendGameAction: (payload: unknown) => void;
  connected: boolean;
}

export function usePartyConnection(roomId: string, onMessage?: (msg: ServerMessage) => void): PartyConnection {
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const stableId = getStableId(roomId);

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
        default:
          onMessageRef.current?.(msg);
      }
    } catch {
      console.error("Failed to parse server message");
    }
  }, []);

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
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
    sendMessage,
    sendGameAction,
    connected,
  };
}
