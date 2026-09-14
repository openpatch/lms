import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, Navigate } from "react-router";
import { signIn, useSession } from "../lib/auth";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const { data: session } = useSession();

  // Where the teacher was headed before they were asked to sign in.
  const next = (location.state as { next?: string } | null)?.next ?? "/arena";

  // Already signed in — either the teacher came here by hand, or the guard sent
  // them before the session had loaded. Either way, carry on where they wanted.
  if (session) return <Navigate to={next} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");

    const { error: signInError } = await signIn.email({ email: email.trim(), password });
    setPending(false);

    if (signInError) {
      setError(t("auth.failed"));
      return;
    }
    void navigate(next, { replace: true });
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-2">{t("auth.title")}</h1>
      <p className="text-sm text-gray-500 text-center mb-8">{t("auth.teachersOnly")}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-2">
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-2">
            {t("auth.password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none"
            required
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
        >
          {pending ? t("auth.signingIn") : t("auth.signIn")}
        </button>

        <p className="text-xs text-gray-400 text-center">{t("auth.noSignUp")}</p>
      </form>
    </div>
  );
}
