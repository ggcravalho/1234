import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import ExercisePicker from "../components/ExercisePicker";
import type { Exercise, PlanDraft, PlanExerciseDraft, PlanWorkoutDraft } from "../types";

type LocationState = { plan: PlanDraft; source: "paste" | "ai_chat" | "manual" };

function emptyExercise(order: number): PlanExerciseDraft {
  return {
    exerciseName: "Novo exercício",
    muscleGroup: null,
    matchedExerciseId: null,
    order,
    supersetGroup: null,
    restSeconds: 60,
    variations: [{ week: 1, sets: 3, reps: "10", loadKg: null }],
  };
}

export default function PlanReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [plan, setPlan] = useState<PlanDraft | null>(state?.plan ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<number | null>(null);

  if (!plan) {
    return (
      <div className="p-6 text-center">
        <p className="mb-3 text-zinc-500">Nenhum plano para revisar ainda.</p>
        <button
          type="button"
          onClick={() => navigate("/plano/novo")}
          className="text-brand-600 underline"
        >
          Voltar
        </button>
      </div>
    );
  }

  function updateWorkout(index: number, updater: (w: PlanWorkoutDraft) => PlanWorkoutDraft) {
    setPlan((prev) =>
      prev
        ? { ...prev, workouts: prev.workouts.map((w, i) => (i === index ? updater(w) : w)) }
        : prev,
    );
  }

  function updateExercise(
    workoutIndex: number,
    exIndex: number,
    updater: (ex: PlanExerciseDraft) => PlanExerciseDraft,
  ) {
    updateWorkout(workoutIndex, (w) => ({
      ...w,
      exercises: w.exercises.map((ex, i) => (i === exIndex ? updater(ex) : ex)),
    }));
  }

  function addWorkout() {
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            workouts: [
              ...prev.workouts,
              {
                name: `Treino ${String.fromCharCode(65 + prev.workouts.length)}`,
                order: prev.workouts.length,
                exercises: [],
              },
            ],
          }
        : prev,
    );
  }

  function removeWorkout(index: number) {
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            workouts: prev.workouts
              .filter((_, i) => i !== index)
              .map((w, i) => ({ ...w, order: i })),
          }
        : prev,
    );
  }

  function removeExercise(workoutIndex: number, exIndex: number) {
    updateWorkout(workoutIndex, (w) => ({
      ...w,
      exercises: w.exercises.filter((_, i) => i !== exIndex).map((ex, i) => ({ ...ex, order: i })),
    }));
  }

  function addVariation(workoutIndex: number, exIndex: number) {
    updateExercise(workoutIndex, exIndex, (ex) => ({
      ...ex,
      variations: [
        ...ex.variations,
        { week: ex.variations.length + 1, sets: 3, reps: "10", loadKg: null },
      ],
    }));
  }

  function removeVariation(workoutIndex: number, exIndex: number, vIndex: number) {
    updateExercise(workoutIndex, exIndex, (ex) => ({
      ...ex,
      variations: ex.variations.filter((_, i) => i !== vIndex),
    }));
  }

  function handlePickExercise(exercise: Exercise) {
    if (addingTo === null) return;
    updateWorkout(addingTo, (w) => ({
      ...w,
      exercises: [
        ...w.exercises,
        {
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          matchedExerciseId: exercise.id,
          order: w.exercises.length,
          supersetGroup: null,
          restSeconds: 60,
          variations: [{ week: 1, sets: 3, reps: "10", loadKg: null }],
        },
      ],
    }));
    setAddingTo(null);
  }

  async function handleSave() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/plans", { plan, source: state?.source ?? "manual" });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o plano.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-6 pb-6">
      <h1 className="mb-1 text-xl font-bold text-zinc-900">Revisar plano</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Confira e ajuste antes de salvar. Ao salvar, este plano passa a valer para os dois.
      </p>

      <div className="space-y-5">
        {plan.workouts.map((workout, wIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lista de rascunho ainda sem ids; todos os campos são controlados pelo estado
          <div key={wIndex} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <div className="mb-3 flex items-center gap-2">
              <input
                value={workout.name}
                onChange={(e) => updateWorkout(wIndex, (w) => ({ ...w, name: e.target.value }))}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 font-semibold"
              />
              <button
                type="button"
                onClick={() => removeWorkout(wIndex)}
                className="rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-400"
              >
                Remover treino
              </button>
            </div>

            <div className="space-y-3">
              {workout.exercises.map((ex, exIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: lista de rascunho ainda sem ids; todos os campos são controlados pelo estado
                <div key={exIndex} className="rounded-xl border border-zinc-100 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={ex.exerciseName}
                      onChange={(e) =>
                        updateExercise(wIndex, exIndex, (item) => ({
                          ...item,
                          exerciseName: e.target.value,
                          matchedExerciseId: null,
                        }))
                      }
                      className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => removeExercise(wIndex, exIndex)}
                      className="text-xs text-zinc-400"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mb-2 flex flex-wrap gap-2 text-xs">
                    <input
                      value={ex.muscleGroup ?? ""}
                      onChange={(e) =>
                        updateExercise(wIndex, exIndex, (item) => ({
                          ...item,
                          muscleGroup: e.target.value || null,
                        }))
                      }
                      placeholder="Grupo muscular"
                      className="w-32 rounded-lg border border-zinc-200 px-2 py-1"
                    />
                    <input
                      value={ex.supersetGroup ?? ""}
                      onChange={(e) =>
                        updateExercise(wIndex, exIndex, (item) => ({
                          ...item,
                          supersetGroup: e.target.value || null,
                        }))
                      }
                      placeholder="Superset (ex: SS1)"
                      className="w-32 rounded-lg border border-zinc-200 px-2 py-1"
                    />
                    <input
                      type="number"
                      value={ex.restSeconds ?? ""}
                      onChange={(e) =>
                        updateExercise(wIndex, exIndex, (item) => ({
                          ...item,
                          restSeconds: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      placeholder="Descanso (s)"
                      className="w-28 rounded-lg border border-zinc-200 px-2 py-1"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Séries / repetições / carga por semana
                    </p>
                    {ex.variations.map((v, vIndex) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: lista de rascunho ainda sem ids; todos os campos são controlados pelo estado
                      <div key={vIndex} className="flex items-center gap-1.5 text-xs">
                        <span className="w-14 text-zinc-400">Sem. {v.week}</span>
                        <input
                          type="number"
                          value={v.sets}
                          onChange={(e) =>
                            updateExercise(wIndex, exIndex, (item) => ({
                              ...item,
                              variations: item.variations.map((vv, i) =>
                                i === vIndex ? { ...vv, sets: Number(e.target.value) } : vv,
                              ),
                            }))
                          }
                          className="w-12 rounded-lg border border-zinc-200 px-1.5 py-1 text-center"
                        />
                        <span>x</span>
                        <input
                          value={v.reps}
                          onChange={(e) =>
                            updateExercise(wIndex, exIndex, (item) => ({
                              ...item,
                              variations: item.variations.map((vv, i) =>
                                i === vIndex ? { ...vv, reps: e.target.value } : vv,
                              ),
                            }))
                          }
                          className="w-16 rounded-lg border border-zinc-200 px-1.5 py-1 text-center"
                        />
                        <input
                          type="number"
                          value={v.loadKg ?? ""}
                          onChange={(e) =>
                            updateExercise(wIndex, exIndex, (item) => ({
                              ...item,
                              variations: item.variations.map((vv, i) =>
                                i === vIndex
                                  ? {
                                      ...vv,
                                      loadKg: e.target.value ? Number(e.target.value) : null,
                                    }
                                  : vv,
                              ),
                            }))
                          }
                          placeholder="kg"
                          className="w-16 rounded-lg border border-zinc-200 px-1.5 py-1 text-center"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariation(wIndex, exIndex, vIndex)}
                          className="ml-auto text-zinc-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addVariation(wIndex, exIndex)}
                      className="text-xs font-medium text-brand-600"
                    >
                      + Variação de semana/bloco
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setAddingTo(wIndex)}
                className="flex-1 rounded-xl border border-dashed border-zinc-300 py-2 text-sm text-zinc-500"
              >
                + Exercício
              </button>
              <button
                type="button"
                onClick={() =>
                  updateWorkout(wIndex, (w) => ({
                    ...w,
                    exercises: [...w.exercises, emptyExercise(w.exercises.length)],
                  }))
                }
                className="flex-1 rounded-xl border border-dashed border-zinc-300 py-2 text-sm text-zinc-500"
              >
                + Exercício manual
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addWorkout}
        className="mt-4 w-full rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500"
      >
        + Adicionar treino à sequência
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar plano para os dois"}
      </button>

      {addingTo !== null && (
        <ExercisePicker
          title="Adicionar exercício"
          onSelect={handlePickExercise}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  );
}
