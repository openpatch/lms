import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export default function Join() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setError(t("join.invalidCode"));
      return;
    }
    if (!trimmedName) {
      setError(t("join.emptyName"));
      return;
    }

    // Store name in localStorage so it survives browser close
    localStorage.setItem(`lms:player:${trimmedCode}`, trimmedName);
    navigate(`/play/${trimmedCode}`);
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">{t("join.title")}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            {t("join.codeLabel")}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("join.codePlaceholder")}
            maxLength={6}
            className="w-full text-center text-2xl font-mono font-bold tracking-widest px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            {t("join.nameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("join.namePlaceholder")}
            maxLength={20}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors"
        >
          {t("join.submit")}
        </button>
      </form>
    </div>
  );
}
