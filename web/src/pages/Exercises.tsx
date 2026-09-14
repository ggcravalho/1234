import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Exercise } from "../types";

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newMuscleGroup, setNewMuscleGroup] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api.get<{ exercises: Exercise[] }>("/exercises").then((res) => setExercises(res.exercises));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q));
    const groups = new Map<string, Exercise[]>();
    for (const ex of filtered) {
      const key = ex.muscleGroup || "Sem grupo definido";
      const arr = groups.get(key) ?? [];
      arr.push(ex);
      groups.set(key, arr);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [exercises, query]);

  async function handleUpdate(
    ex: Exercise,
    updates: { name?: string; muscleGroup?: string | null },
  ) {
    await api.put(`/exercises/${ex.id}`, updates);
    load();
    setEditingId(null);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post("/exercises", {
        name: newName.trim(),
        muscleGroup: newMuscleGroup.trim() || null,
      });
      setNewName("");
      setNewMuscleGroup("");
      load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="px-5 pt-6">
      <h1 className="mb-4 text-xl font-bold text-zinc-900">Catálogo de exercícios</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar exercício…"
        className="mb-4 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
      />

      <div className="space-y-5">
        {grouped.map(([group, list]) => (
          <div key={group}>
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {group}
            </h2>
            <div className="space-y-1.5">
              {list.map((ex) => (
                <div key={ex.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-100">
                  {editingId === ex.id ? (
                    <EditRow
                      exercise={ex}
                      onSave={(updates) => handleUpdate(ex, updates)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingId(ex.id)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className="text-sm text-zinc-800">{ex.name}</span>
                      <span className="text-xs text-zinc-400">editar</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="text-center text-zinc-400">Nenhum exercício encontrado.</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-4">
        <p className="mb-2 text-sm font-medium text-zinc-700">Adicionar exercício manualmente</p>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do exercício"
          className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
        <input
          value={newMuscleGroup}
          onChange={(e) => setNewMuscleGroup(e.target.value)}
          placeholder="Grupo muscular"
          className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {creating ? "Adicionando…" : "Adicionar"}
        </button>
      </div>
    </div>
  );
}

function EditRow({
  exercise,
  onSave,
  onCancel,
}: {
  exercise: Exercise;
  onSave: (updates: { name: string; muscleGroup: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(exercise.name);
  const [muscleGroup, setMuscleGroup] = useState(exercise.muscleGroup ?? "");

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
      />
      <input
        value={muscleGroup}
        onChange={(e) => setMuscleGroup(e.target.value)}
        placeholder="Grupo muscular"
        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave({ name, muscleGroup: muscleGroup.trim() || null })}
          className="flex-1 rounded-lg bg-brand-600 py-1.5 text-xs font-semibold text-white"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-zinc-200 py-1.5 text-xs text-zinc-500"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
