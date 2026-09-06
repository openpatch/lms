import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center text-center py-12">
      <h1 className="text-5xl font-bold text-gray-800 mb-4">{t("landing.title")}</h1>
      <p className="text-xl text-gray-500 mb-2">{t("landing.subtitle")}</p>
      <p className="text-base text-gray-400 max-w-2xl mb-8">{t("landing.description")}</p>
      <div className="flex gap-4 mb-16">
        <Link
          to="/arena"
          className="px-8 py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors"
        >
          {t("landing.teacher")}
        </Link>
        <Link
          to="/join"
          className="px-8 py-3 bg-white text-brand-600 font-semibold rounded-lg border-2 border-brand-200 hover:border-brand-400 transition-colors"
        >
          {t("landing.student")}
        </Link>
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-sm font-semibold uppercase text-gray-400 mb-6">{t("landing.howItWorks")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-3xl mb-3">1</div>
            <p className="text-gray-600">{t("landing.step1")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-3xl mb-3">2</div>
            <p className="text-gray-600">{t("landing.step2")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-3xl mb-3">3</div>
            <p className="text-gray-600">{t("landing.step3")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
