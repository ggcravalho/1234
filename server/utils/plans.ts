import { getDb, withTransaction } from "../db/client";
import type {
  NextWorkout,
  PlanDraft,
  PlanExercise,
  PlanExerciseVariation,
  PlanWorkout,
} from "../types";
import { findOrCreateExercise } from "./exercises";
import { newId } from "./id";

type PlanRow = { id: string };
type PlanWorkoutRow = { id: string; plan_id: string; name: string; order_in_sequence: number };
type PlanExerciseRow = {
  id: string;
  plan_workout_id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string | null;
  order_in_workout: number;
  superset_group: string | null;
  rest_seconds: number | null;
  variations_json: string;
};

function parseVariations(json: string): PlanExerciseVariation[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore, fall through to default below
  }
  return [{ week: 1, sets: 3, reps: "10", loadKg: null }];
}

/** Escolhe a variação de séries/reps/carga aplicável, dado quantas vezes o
 * usuário já passou por esse treino do plano (cicla se houver mais
 * ocorrências do que variações cadastradas). */
export function resolveVariation(
  variations: PlanExerciseVariation[],
  occurrenceCount: number,
): PlanExerciseVariation {
  if (variations.length === 0) return { week: 1, sets: 3, reps: "10", loadKg: null };
  return variations[occurrenceCount % variations.length];
}

export function getActivePlanId(): string | null {
  const db = getDb();
  const row = db.prepare("SELECT id FROM plans WHERE is_active = 1 LIMIT 1").get() as
    | PlanRow
    | undefined;
  return row?.id ?? null;
}

function getPlanWorkouts(planId: string): PlanWorkoutRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, plan_id, name, order_in_sequence FROM plan_workouts WHERE plan_id = ? ORDER BY order_in_sequence",
    )
    .all(planId) as PlanWorkoutRow[];
}

function getPlanExerciseRows(planWorkoutId: string): PlanExerciseRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT pe.id as id, pe.plan_workout_id as plan_workout_id, pe.exercise_id as exercise_id,
              e.name as exercise_name, e.muscle_group as muscle_group,
              pe.order_in_workout as order_in_workout, pe.superset_group as superset_group,
              pe.rest_seconds as rest_seconds, pe.variations_json as variations_json
       FROM plan_exercises pe JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.plan_workout_id = ?
       ORDER BY pe.order_in_workout`,
    )
    .all(planWorkoutId) as PlanExerciseRow[];
}

function countCompletedOccurrences(userId: string, planWorkoutId: string): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as c FROM workout_sessions WHERE user_id = ? AND plan_workout_id = ? AND completed_at IS NOT NULL",
    )
    .get(userId, planWorkoutId) as { c: number };
  return row.c;
}

function getLastUsed(userId: string, exerciseId: string) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT ls.load_kg as loadKg, ls.reps as reps, ws.started_at as date
       FROM logged_sets ls
       JOIN workout_sessions ws ON ws.id = ls.workout_session_id
       WHERE ws.user_id = ? AND ls.exercise_id = ? AND ls.load_kg IS NOT NULL
       ORDER BY ws.started_at DESC, ls.set_number DESC
       LIMIT 1`,
    )
    .get(userId, exerciseId) as
    | { loadKg: number | null; reps: number | null; date: string }
    | undefined;
  return row ?? null;
}

function buildPlanWorkout(row: PlanWorkoutRow, userId: string): PlanWorkout {
  const occurrenceCount = countCompletedOccurrences(userId, row.id);
  const exercises: PlanExercise[] = getPlanExerciseRows(row.id).map((pe) => {
    const variations = parseVariations(pe.variations_json);
    return {
      id: pe.id,
      exerciseId: pe.exercise_id,
      exerciseName: pe.exercise_name,
      muscleGroup: pe.muscle_group,
      order: pe.order_in_workout,
      supersetGroup: pe.superset_group,
      restSeconds: pe.rest_seconds,
      variations,
      current: resolveVariation(variations, occurrenceCount),
      lastUsed: getLastUsed(userId, pe.exercise_id),
    };
  });
  return { id: row.id, name: row.name, order: row.order_in_sequence, exercises };
}

function getOrCreateUserProgress(userId: string, planId: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT plan_id, current_order FROM user_progress WHERE user_id = ?")
    .get(userId) as { plan_id: string | null; current_order: number } | undefined;

  if (!row || row.plan_id !== planId) {
    db.prepare(
      `INSERT INTO user_progress (user_id, plan_id, current_order) VALUES (?, ?, 0)
       ON CONFLICT(user_id) DO UPDATE SET plan_id = excluded.plan_id, current_order = 0`,
    ).run(userId, planId);
    return 0;
  }
  return row.current_order;
}

export function getNextWorkoutForUser(userId: string): NextWorkout {
  const planId = getActivePlanId();
  if (!planId) {
    return { hasPlan: false, planId: null, workout: null, sequenceLength: 0 };
  }

  const workouts = getPlanWorkouts(planId);
  if (workouts.length === 0) {
    return { hasPlan: false, planId, workout: null, sequenceLength: 0 };
  }

  const currentOrder = getOrCreateUserProgress(userId, planId);
  const index = currentOrder % workouts.length;
  const workout = buildPlanWorkout(workouts[index], userId);

  return { hasPlan: true, planId, workout, sequenceLength: workouts.length };
}

/** Avança manualmente a posição do usuário na sequência, sem registrar treino. */
export function advanceUserSequence(userId: string): NextWorkout {
  const planId = getActivePlanId();
  if (!planId) return { hasPlan: false, planId: null, workout: null, sequenceLength: 0 };

  const workouts = getPlanWorkouts(planId);
  if (workouts.length === 0) return { hasPlan: false, planId, workout: null, sequenceLength: 0 };

  const currentOrder = getOrCreateUserProgress(userId, planId);
  const nextOrder = currentOrder + 1;
  const db = getDb();
  db.prepare("UPDATE user_progress SET current_order = ? WHERE user_id = ?").run(nextOrder, userId);
  return getNextWorkoutForUser(userId);
}

/** Chamado após concluir um treino: avança a posição do usuário na sequência. */
export function advanceAfterCompletion(userId: string) {
  const planId = getActivePlanId();
  if (!planId) return;
  const workouts = getPlanWorkouts(planId);
  if (workouts.length === 0) return;
  const currentOrder = getOrCreateUserProgress(userId, planId);
  const db = getDb();
  db.prepare("UPDATE user_progress SET current_order = ? WHERE user_id = ?").run(
    currentOrder + 1,
    userId,
  );
}

export function getPlanWorkoutMeta(planWorkoutId: string): { name: string } | null {
  const db = getDb();
  const row = db.prepare("SELECT name FROM plan_workouts WHERE id = ?").get(planWorkoutId) as
    | { name: string }
    | undefined;
  return row ?? null;
}

/**
 * Salva um novo plano (a partir do texto colado ou do assistente de IA),
 * substituindo o plano ativo para os dois usuários. O catálogo de
 * exercícios e o histórico de cada usuário continuam intactos.
 */
export function savePlan(
  draft: PlanDraft,
  createdByUserId: string,
  source: "paste" | "ai_chat" | "manual",
): { planId: string } {
  return withTransaction((db) => {
    db.prepare("UPDATE plans SET is_active = 0 WHERE is_active = 1").run();

    const planId = newId();
    db.prepare(
      "INSERT INTO plans (id, created_by, is_active, source, notes) VALUES (?, ?, 1, ?, ?)",
    ).run(planId, createdByUserId, source, draft.notes ?? null);

    const sortedWorkouts = [...draft.workouts].sort((a, b) => a.order - b.order);
    for (const workout of sortedWorkouts) {
      const workoutId = newId();
      db.prepare(
        "INSERT INTO plan_workouts (id, plan_id, name, order_in_sequence) VALUES (?, ?, ?, ?)",
      ).run(workoutId, planId, workout.name, workout.order);

      const sortedExercises = [...workout.exercises].sort((a, b) => a.order - b.order);
      for (const ex of sortedExercises) {
        const exercise = ex.matchedExerciseId
          ? { id: ex.matchedExerciseId }
          : findOrCreateExercise(ex.exerciseName, ex.muscleGroup);
        const variations =
          ex.variations.length > 0
            ? ex.variations
            : [{ week: 1, sets: 3, reps: "10", loadKg: null }];

        db.prepare(
          `INSERT INTO plan_exercises
             (id, plan_workout_id, exercise_id, order_in_workout, superset_group, rest_seconds, variations_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          newId(),
          workoutId,
          exercise.id,
          ex.order,
          ex.supersetGroup,
          ex.restSeconds,
          JSON.stringify(variations),
        );
      }
    }

    // Os dois usuários recomeçam a sequência do zero com o novo plano.
    const users = db.prepare("SELECT id FROM users").all() as { id: string }[];
    for (const u of users) {
      db.prepare(
        `INSERT INTO user_progress (user_id, plan_id, current_order) VALUES (?, ?, 0)
         ON CONFLICT(user_id) DO UPDATE SET plan_id = excluded.plan_id, current_order = 0`,
      ).run(u.id, planId);
    }

    return { planId };
  });
}
