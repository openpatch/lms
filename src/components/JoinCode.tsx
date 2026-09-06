import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function JoinCode({ code }: { code: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500">{t("lobby.shareCode")}</p>
      <button
        onClick={copy}
        className="text-5xl font-mono font-bold tracking-widest text-brand-600 bg-white border-2 border-brand-200 rounded-xl px-8 py-4 hover:border-brand-400 transition-colors"
      >
        {code}
      </button>
      <button
        onClick={copy}
        className="text-sm text-gray-500 hover:text-brand-600 transition-colors"
      >
        {copied ? t("lobby.copied") : t("lobby.copyCode")}
      </button>
    </div>
  );
}
