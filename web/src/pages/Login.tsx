import { type FormEvent, useId, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-4xl">💪</div>
          <h1 className="text-2xl font-bold text-zinc-900">Bitu&apos;s Fit</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Treinem juntos, evoluam cada um no seu ritmo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={emailId} className="mb-1 block text-sm font-medium text-zinc-700">
              E-mail
            </label>
            <input
              id={emailId}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label htmlFor={passwordId} className="mb-1 block text-sm font-medium text-zinc-700">
              Senha
            </label>
            <input
              id={passwordId}
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
