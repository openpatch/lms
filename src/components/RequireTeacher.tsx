import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router";
import { useSession } from "../lib/auth";

/**
 * Screens only a signed-in teacher may see. Students never pass through here —
 * they join with a code and need no account.
 */
export default function RequireTeacher({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return <p className="text-center py-12 text-gray-400">{t("common.loading")}</p>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  }

  return <>{children}</>;
}
