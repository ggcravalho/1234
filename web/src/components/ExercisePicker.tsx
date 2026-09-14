import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Exercise } from "../types";

type Props = {
  title: string;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
};

/** Modal simples de busca/criação no catálogo compartilhado de exercícios. */
export default function ExercisePicker({ title, onSelect, onClose }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get<{ exercises: Exercise[] }>("/exercises").then((res) => setExercises(res.exercises));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

  const hasExactMatch = exercises.some((e) => e.name.toLowerCase() === query.trim().toLowerCase());

  async function handleCreate() {
    setCreating(true);
    try {
      const { exercise } = await api.post<{ exercise: Exercise }>("/exercises", {
        name: query.trim(),
      });
      onSelect(exercise);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
      <div className="max-h-[80vh] w-full max-w-md rounded-t-2xl bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-zinc-400">
            Fechar
          </button>
        </div>

        <input
          // biome-ignore lint/a11y/noAutofocus: modal de busca aberto pelo próprio usuário, foco imediato é o esperado
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar exercício…"
          className="mb-3 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none"
        />

        <div className="max-h-[45vh] space-y-1 overflow-y-auto">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => onSelect(ex)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left active:bg-zinc-100"
            >
              <span>{ex.name}</span>
              {ex.muscleGroup && <span className="text-xs text-zinc-400">{ex.muscleGroup}</span>}
            </button>
          ))}
          {filtered.length === 0 && query.trim() && (
            <p className="px-3 py-2 text-sm text-zinc-400">Nenhum exercício encontrado.</p>
          )}
        </div>

        {query.trim() && !hasExactMatch && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="mt-3 w-full rounded-xl border border-dashed border-brand-300 py-2.5 text-sm font-medium text-brand-600"
          >
            {creating ? "Criando…" : `+ Criar exercício "${query.trim()}"`}
          </button>
        )}
      </div>
    </div>
  );
}
