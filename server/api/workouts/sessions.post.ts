import { createError, defineEventHandler, readBody } from "h3";
import { withTransaction } from "../../db/client";
import { requireUser } from "../../utils/auth";
import { findOrCreateExercise } from "../../utils/exercises";
import { newId } from "../../utils/id";
import { advanceAfterCompletion } from "../../utils/plans";

type LoggedSetBody = {
  exerciseId?: string | null;
  exerciseName: string;
  muscleGroup?: string | null;
  setNumber: number;
  reps: number | null;
  loadKg: number | null;
};

type Body = {
  planWorkoutId?: string | null;
  planWorkoutName: string;
  sets: LoggedSetBody[];
};

/** Registra um treino ao vivo concluído (série a série) e avança a sequência do usuário. */
export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const body = await readBody<Body>(event);

  if (!body?.planWorkoutName?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Nome do treino é obrigatório." });
  }
  const sets = (body.sets ?? []).filter((s) => s.exerciseName?.trim());
  if (sets.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Registre ao menos uma série para concluir o treino.",
    });
  }

  const sessionId = withTransaction((db) => {
    const id = newId();
    db.prepare(
      `INSERT INTO workout_sessions (id, user_id, plan_workout_id, plan_workout_name, started_at, completed_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    ).run(id, user.id, body.planWorkoutId ?? null, body.planWorkoutName.trim());

    const insertSet = db.prepare(
      "INSERT INTO logged_sets (id, workout_session_id, exercise_id, set_number, reps, load_kg) VALUES (?, ?, ?, ?, ?, ?)",
    );

    for (const set of sets) {
      const exercise = set.exerciseId
        ? { id: set.exerciseId }
        : findOrCreateExercise(set.exerciseName, set.muscleGroup ?? null);
      insertSet.run(newId(), id, exercise.id, set.setNumber, set.reps, set.loadKg);
    }

    return id;
  });

  advanceAfterCompletion(user.id);

  return { sessionId };
});
