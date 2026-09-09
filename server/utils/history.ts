import { getDb } from "../db/client";
import type { ExerciseHistoryPoint } from "../types";

export type ExerciseWithHistory = { id: string; name: string; muscleGroup: string | null };

/** Exercícios que o usuário já registrou pelo menos uma série. */
export function listExercisesWithHistory(userId: string): ExerciseWithHistory[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT e.id as id, e.name as name, e.muscle_group as muscleGroup
       FROM logged_sets ls
       JOIN workout_sessions ws ON ws.id = ls.workout_session_id
       JOIN exercises e ON e.id = ls.exercise_id
       WHERE ws.user_id = ?
       ORDER BY e.name COLLATE NOCASE`,
    )
    .all(userId) as ExerciseWithHistory[];
  return rows;
}

/**
 * Histórico de carga/volume de um exercício para um usuário, sessão a
 * sessão, com destaque de recordes pessoais (PR) de carga máxima.
 */
export function getExerciseHistory(userId: string, exerciseId: string): ExerciseHistoryPoint[] {
  const rows = getDb()
    .prepare(
      `SELECT ws.id as sessionId, ws.started_at as date, ls.reps as reps, ls.load_kg as loadKg
       FROM logged_sets ls
       JOIN workout_sessions ws ON ws.id = ls.workout_session_id
       WHERE ws.user_id = ? AND ls.exercise_id = ?
       ORDER BY ws.started_at ASC`,
    )
    .all(userId, exerciseId) as {
    sessionId: string;
    date: string;
    reps: number | null;
    loadKg: number | null;
  }[];

  const bySession = new Map<string, { date: string; maxLoadKg: number | null; volume: number }>();
  for (const row of rows) {
    const entry = bySession.get(row.sessionId) ?? { date: row.date, maxLoadKg: null, volume: 0 };
    if (row.loadKg != null) {
      entry.maxLoadKg =
        entry.maxLoadKg == null ? row.loadKg : Math.max(entry.maxLoadKg, row.loadKg);
      entry.volume += (row.reps ?? 0) * row.loadKg;
    }
    bySession.set(row.sessionId, entry);
  }

  let best = -Infinity;
  const points: ExerciseHistoryPoint[] = [];
  for (const [sessionId, entry] of bySession) {
    const isPr = entry.maxLoadKg != null && entry.maxLoadKg > best;
    if (entry.maxLoadKg != null && entry.maxLoadKg > best) best = entry.maxLoadKg;
    points.push({
      sessionId,
      date: entry.date,
      maxLoadKg: entry.maxLoadKg,
      volume: entry.volume,
      isPr,
    });
  }
  return points;
}

/** Resumo textual do histórico recente de treino, usado como contexto para a IA. */
export function buildTrainingContextSummary(userId: string, label: string): string {
  const db = getDb();
  const sessions = db
    .prepare(
      `SELECT id, plan_workout_name as name, started_at as date
       FROM workout_sessions
       WHERE user_id = ? AND completed_at IS NOT NULL
       ORDER BY started_at DESC LIMIT 8`,
    )
    .all(userId) as { id: string; name: string; date: string }[];

  if (sessions.length === 0) {
    return `${label}: sem histórico de treinos registrados ainda.`;
  }

  const lines: string[] = [`${label} — últimos treinos concluídos:`];
  for (const s of sessions) {
    const sets = db
      .prepare(
        `SELECT e.name as exerciseName, ls.set_number as setNumber, ls.reps as reps, ls.load_kg as loadKg
         FROM logged_sets ls JOIN exercises e ON e.id = ls.exercise_id
         WHERE ls.workout_session_id = ?
         ORDER BY e.name, ls.set_number`,
      )
      .all(s.id) as {
      exerciseName: string;
      setNumber: number;
      reps: number | null;
      loadKg: number | null;
    }[];

    const byExercise = new Map<string, string[]>();
    for (const set of sets) {
      const arr = byExercise.get(set.exerciseName) ?? [];
      arr.push(`${set.reps ?? "?"}x${set.loadKg ?? "?"}kg`);
      byExercise.set(set.exerciseName, arr);
    }
    const exerciseSummaries = [...byExercise.entries()]
      .map(([name, sets2]) => `${name} (${sets2.join(", ")})`)
      .join("; ");
    lines.push(
      `- ${s.date.slice(0, 10)} ${s.name}: ${exerciseSummaries || "sem séries registradas"}`,
    );
  }
  return lines.join("\n");
}
