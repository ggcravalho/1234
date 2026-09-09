import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { NextWorkout } from "../types";

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [next, setNext] = useState<NextWorkout | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<NextWorkout>("/workouts/next");
      setNext(data);
    } catch {
      setError("Não foi possível carregar seu próximo treino.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdvance() {
    setAdvancing(true);
    try {
      const data = await api.post<NextWorkout>("/workouts/advance");
      setNext(data);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="px-5 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">Olá,</p>
          <h1 className="text-xl font-bold text-zinc-900">{user?.name}</h1>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-full px-3 py-1.5 text-sm text-zinc-400"
        >
          Sair
        </button>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {next && !next.hasPlan && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center">
          <p className="mb-4 text-zinc-600">
            Ainda não existe um plano de treino ativo. Criem um juntos para começar.
          </p>
          <Link
            to="/plano/novo"
            className="inline-block rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white"
          >
            Criar plano de treino
          </Link>
        </div>
      )}

      {next?.hasPlan && next.workout && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
            <p className="text-sm font-medium text-brand-600">Próximo treino</p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-900">{next.workout.name}</h2>
            <ul className="mt-4 space-y-1.5 text-sm text-zinc-600">
              {next.workout.exercises.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between">
                  <span>{ex.exerciseName}</span>
                  <span className="text-zinc-400">
                    {ex.current.sets}x{ex.current.reps}
                    {ex.current.loadKg ? ` · ${ex.current.loadKg}kg` : ""}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => navigate("/treino/ao-vivo")}
              className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white active:scale-[0.98]"
            >
              Iniciar treino
            </button>
            <button
              type="button"
              onClick={handleAdvance}
              disabled={advancing}
              className="mt-2 w-full rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-500 disabled:opacity-60"
            >
              {advancing ? "Avançando…" : "Avançar treino (pular sem registrar)"}
            </button>
          </div>

          <Link
            to="/plano/novo"
            className="block text-center text-sm text-zinc-400 underline underline-offset-2"
          >
            Criar um novo plano de treino
          </Link>
        </div>
      )}
    </div>
  );
}
