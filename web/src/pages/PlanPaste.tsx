import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { PlanDraft } from "../types";

export default function PlanPaste() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { plan } = await api.post<{ plan: PlanDraft }>("/ai/parse-plan", { text });
      navigate("/plano/revisar", { state: { plan, source: "paste" } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível interpretar o plano.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 pt-6">
      <h1 className="mb-1 text-xl font-bold text-zinc-900">Colar plano em texto</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Cole abaixo o plano completo (treinos, exercícios, séries, repetições, carga e descanso). A
        IA vai estruturar tudo para revisão.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Treino A\n1. Supino reto 4x8-10 80kg descanso 90s\n..."}
        rows={14}
        className="w-full rounded-xl border border-zinc-300 p-4 text-sm focus:border-brand-500 focus:outline-none"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Interpretando com IA…" : "Interpretar com IA"}
      </button>
    </div>
  );
}
