import { useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";

export default function JoinCode({ code }: { code: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // The code goes to the join page rather than straight into the lobby: a
  // player still has to say who they are before /play/:code will have them.
  const joinUrl = `${window.location.origin}/join?code=${encodeURIComponent(code)}`;

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500">{t("lobby.shareCode")}</p>
      <div className="flex items-stretch gap-3">
        <button
          onClick={copy}
          className="text-5xl font-mono font-bold tracking-widest text-game-ink bg-game-50 border-2 border-game-300 rounded-xl px-8 py-4 hover:border-game-solid transition-colors"
        >
          {code}
        </button>
        <button
          onClick={() => setShowQr((open) => !open)}
          aria-expanded={showQr}
          title={showQr ? t("lobby.hideQr") : t("lobby.showQr")}
          className={`grid place-items-center rounded-xl border-2 px-4 transition-colors ${
            showQr
              ? "border-game-solid bg-game-50 text-game-ink"
              : "border-game-300 text-game-ink/70 hover:border-game-solid hover:text-game-ink"
          }`}
        >
          <span className="sr-only">{showQr ? t("lobby.hideQr") : t("lobby.showQr")}</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="currentColor"
            className="w-8 h-8"
          >
            <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8-2h3v3h-3v-3zm5 0h3v3h-3v-3zm-5 5h3v3h-3v-3zm5 0h3v3h-3v-3z" />
          </svg>
        </button>
      </div>
      <button
        onClick={copy}
        className="text-sm text-gray-500 hover:text-game-ink transition-colors"
      >
        {copied ? t("lobby.copied") : t("lobby.copyCode")}
      </button>
      {showQr && (
        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="rounded-xl border-2 border-game-200 bg-white p-4">
            <QRCodeSVG
              value={joinUrl}
              title={t("lobby.scanToJoin")}
              level="M"
              marginSize={1}
              size={288}
              className="h-auto w-full max-w-72"
            />
          </div>
          <p className="text-sm text-gray-500">{t("lobby.scanToJoin")}</p>
          <p className="text-xs text-gray-400 break-all text-center">{joinUrl}</p>
        </div>
      )}
    </div>
  );
}
