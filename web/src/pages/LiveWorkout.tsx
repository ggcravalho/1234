import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import ExercisePicker from "../components/ExercisePicker";
import RestTimer from "../components/RestTimer";
import type { Exercise, NextWorkout } from "../types";

type SetEntry = { reps: number | null; loadKg: number | null; done: boolean };

type Slot = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  supersetGroup: string | null;
  restSeconds: number | null;
  targetLabel: string;
  lastUsedLabel: string | null;
  sets: SetEntry[];
  skipped: boolean;
  extra: boolean;
};

function parseFirstNumber(text: string, fallback: number): number {
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function slotsFromWorkout(workout: NextWorkout["workout"]): Slot[] {
  if (!workout) return [];
  return [...workout.exercises]
    .sort((a, b) => a.order - b.order)
    .map((ex) => {
      const defaultReps = parseFirstNumber(ex.current.reps, 10);
      const defaultLoad = ex.lastUsed?.loadKg ?? ex.current.loadKg ?? null;
      return {
        key: ex.id,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        muscleGroup: ex.muscleGroup,
        supersetGroup: ex.supersetGroup,
        restSeconds: ex.restSeconds,
        targetLabel: `${ex.current.sets}x${ex.current.reps}${ex.current.loadKg ? ` · ${ex.current.loadKg}kg sugerido` : ""}`,
        lastUsedLabel: ex.lastUsed
          ? `Última vez: ${ex.lastUsed.reps ?? "?"}x${ex.lastUsed.loadKg ?? "?"}kg`
          : null,
        sets: Array.from({ length: ex.current.sets }, () => ({
          reps: defaultReps,
          loadKg: defaultLoad,
          done: false,
        })),
        skipped: false,
        extra: false,
      };
    });
}

/** Agrupa slots consecutivos que compartilham o mesmo supersetGroup. */
function groupSlots(slots: Slot[]): { groupId: string | null; slots: Slot[] }[] {
  const groups: { groupId: string | null; slots: Slot[] }[] = [];
  for (const slot of slots) {
    const last = groups[groups.length - 1];
    if (slot.supersetGroup && last?.groupId === slot.supersetGroup) {
      last.slots.push(slot);
    } else {
      groups.push({ groupId: slot.supersetGroup, slots: [slot] });
    }
  }
  return groups;
}

export default function LiveWorkout() {
  const navigate = useNavigate();
  const [workoutMeta, setWorkoutMeta] = useState<{ id: string | null; name: string } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [timerNonce, setTimerNonce] = useState(0);
  const [picker, setPicker] = useState<{ mode: "swap" | "add"; slotIndex?: number } | null>(null);

  useEffect(() => {
    api
      .get<NextWorkout>("/workouts/next")
      .then((data) => {
        if (!data.hasPlan || !data.workout) {
          setError("Nenhum treino disponível. Crie um plano primeiro.");
          return;
        }
        setWorkoutMeta({ id: data.workout.id, name: data.workout.name });
        setSlots(slotsFromWorkout(data.workout));
      })
      .catch(() => setError("Não foi possível carregar o treino."))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => groupSlots(slots), [slots]);
  const hasAnyDoneSet = slots.some((s) => !s.skipped && s.sets.some((set) => set.done));

  function updateSlot(index: number, updater: (slot: Slot) => Slot) {
    setSlots((prev) => prev.map((s, i) => (i === index ? updater(s) : s)));
  }

  function toggleSetDone(slotIndex: number, setIndex: number) {
    updateSlot(slotIndex, (slot) => ({
      ...slot,
      sets: slot.sets.map((set, i) => (i === setIndex ? { ...set, done: !set.done } : set)),
    }));
  }

  function updateSetField(
    slotIndex: number,
    setIndex: number,
    field: "reps" | "loadKg",
    value: string,
  ) {
    const numeric = value === "" ? null : Number(value);
    updateSlot(slotIndex, (slot) => ({
      ...slot,
      sets: slot.sets.map((set, i) => (i === setIndex ? { ...set, [field]: numeric } : set)),
    }));
  }

  function addSet(slotIndex: number) {
    updateSlot(slotIndex, (slot) => {
      const last = slot.sets[slot.sets.length - 1];
      return {
        ...slot,
        sets: [...slot.sets, { reps: last?.reps ?? 10, loadKg: last?.loadKg ?? null, done: false }],
      };
    });
  }

  function toggleSkip(slotIndex: number) {
    updateSlot(slotIndex, (slot) => ({ ...slot, skipped: !slot.skipped }));
  }

  function handlePickExercise(exercise: Exercise) {
    if (picker?.mode === "swap" && picker.slotIndex !== undefined) {
      updateSlot(picker.slotIndex, (slot) => ({
        ...slot,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        lastUsedLabel: null,
      }));
    } else if (picker?.mode === "add") {
      setSlots((prev) => [
        ...prev,
        {
          key: `extra-${exercise.id}-${prev.length}`,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          supersetGroup: null,
          restSeconds: null,
          targetLabel: "Exercício extra",
          lastUsedLabel: null,
          sets: [
            { reps: 10, loadKg: null, done: false },
            { reps: 10, loadKg: null, done: false },
            { reps: 10, loadKg: null, done: false },
          ],
          skipped: false,
          extra: true,
        },
      ]);
    }
    setPicker(null);
  }

  async function handleFinish() {
    if (!workoutMeta) return;
    setSaving(true);
    setError(null);
    try {
      const sets = slots
        .filter((s) => !s.skipped)
        .flatMap((s) =>
          s.sets
            .filter((set) => set.done)
            .map((set, i) => ({
              exerciseId: s.exerciseId,
              exerciseName: s.exerciseName,
              muscleGroup: s.muscleGroup,
              setNumber: i + 1,
              reps: set.reps,
              loadKg: set.loadKg,
            })),
        );

      await api.post("/workouts/sessions", {
        planWorkoutId: workoutMeta.id,
        planWorkoutName: workoutMeta.name,
        sets,
      });
      navigate("/");
    } catch {
      setError("Não foi possível salvar o treino. Verifique se ao menos uma série foi marcada.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6 text-center text-zinc-400">Carregando treino…</p>;
  if (error && slots.length === 0) {
    return <p className="p-6 text-center text-red-600">{error}</p>;
  }

  return (
    <div className="px-4 pt-5">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-zinc-900">{workoutMeta?.name}</h1>
        <p className="text-sm text-zinc-500">Marque as séries conforme for realizando.</p>
      </header>

      <div className="space-y-4">
        {groups.map((group, gIndex) => (
          <div
            key={`${group.groupId ?? "single"}-${gIndex}`}
            className={
              group.groupId
                ? "space-y-2 rounded-2xl border-2 border-dashed border-brand-200 p-2"
                : ""
            }
          >
            {group.groupId && (
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                Superséries · feitas em sequência
              </p>
            )}
            {group.slots.map((slot) => {
              const slotIndex = slots.indexOf(slot);
              return (
                <div
                  key={slot.key}
                  className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 ${
                    slot.skipped ? "opacity-50" : ""
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-zinc-900">{slot.exerciseName}</h3>
                      <p className="text-xs text-zinc-400">{slot.targetLabel}</p>
                      {slot.lastUsedLabel && (
                        <p className="text-xs text-brand-600">{slot.lastUsedLabel}</p>
                      )}
                    </div>
                    <div className="flex gap-1 text-xs text-zinc-400">
                      <button
                        type="button"
                        onClick={() => setPicker({ mode: "swap", slotIndex })}
                        className="rounded-full border border-zinc-200 px-2 py-1"
                      >
                        Trocar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSkip(slotIndex)}
                        className="rounded-full border border-zinc-200 px-2 py-1"
                      >
                        {slot.skipped ? "Reativar" : "Pular"}
                      </button>
                    </div>
                  </div>

                  {!slot.skipped && (
                    <div className="space-y-1.5">
                      {slot.sets.map((set, setIndex) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: séries são sempre editadas/renderizadas na mesma ordem em que existem no array
                        <div key={setIndex} className="flex items-center gap-2">
                          <span className="w-5 text-center text-xs text-zinc-400">
                            {setIndex + 1}
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="reps"
                            value={set.reps ?? ""}
                            onChange={(e) =>
                              updateSetField(slotIndex, setIndex, "reps", e.target.value)
                            }
                            className="w-16 rounded-lg border border-zinc-200 px-2 py-2 text-center text-sm"
                          />
                          <span className="text-xs text-zinc-400">x</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="kg"
                            value={set.loadKg ?? ""}
                            onChange={(e) =>
                              updateSetField(slotIndex, setIndex, "loadKg", e.target.value)
                            }
                            className="w-20 rounded-lg border border-zinc-200 px-2 py-2 text-center text-sm"
                          />
                          <span className="text-xs text-zinc-400">kg</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRestSeconds(slot.restSeconds ?? 60);
                              setTimerNonce((n) => n + 1);
                            }}
                            className="ml-auto rounded-full border border-zinc-200 px-2 py-1.5 text-xs text-zinc-500"
                            title="Iniciar descanso"
                          >
                            ⏱
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSetDone(slotIndex, setIndex)}
                            className={`h-8 w-8 rounded-full text-sm font-bold ${
                              set.done ? "bg-brand-600 text-white" : "bg-zinc-100 text-zinc-400"
                            }`}
                          >
                            ✓
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSet(slotIndex)}
                        className="mt-1 text-xs font-medium text-brand-600"
                      >
                        + Adicionar série extra
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPicker({ mode: "add" })}
        className="mt-4 w-full rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500"
      >
        + Adicionar exercício não planejado
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleFinish}
        disabled={saving || !hasAnyDoneSet}
        className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Concluir treino"}
      </button>

      {restSeconds != null && (
        <RestTimer key={timerNonce} seconds={restSeconds} onClose={() => setRestSeconds(null)} />
      )}

      {picker && (
        <ExercisePicker
          title={picker.mode === "swap" ? "Trocar exercício" : "Adicionar exercício"}
          onSelect={handlePickExercise}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
