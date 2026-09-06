import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "de" ? "en" : "de");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="./logo.svg" alt="" className="w-8 h-8" />
            <span className="text-xl font-bold text-brand-600">{t("common.appName")}</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLang}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {i18n.language === "de" ? "EN" : "DE"}
            </button>
            {location.pathname !== "/arena" && (
              <Link
                to="/arena"
                className="text-sm text-gray-600 hover:text-brand-600 transition-colors"
              >
                {t("common.enterArena")}
              </Link>
            )}
            <Link
              to="/join"
              className="text-sm text-gray-600 hover:text-brand-600 transition-colors"
            >
              {t("common.join")}
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center gap-2 text-sm text-gray-400">
          <div>
            {t("common.appName")} — {t("common.tagline")}
          </div>
          <div className="flex items-center gap-2">
            <span>
              {t("common.builtBy")} <span className="text-red-500">&#10084;</span> {t("common.byOpenPatch")}
            </span>
            <span className="text-gray-300">&bull;</span>
            <a
              href="https://github.com/openpatch/lms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-600 transition-colors"
            >
              {t("common.github")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
