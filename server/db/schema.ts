// Schema SQL do Bitu's Fit.
//
// Entidades compartilhadas entre os dois usuários: exercises, plans,
// plan_workouts, plan_exercises.
// Entidades individuais: users, sessions (login), workout_sessions,
// logged_sets, user_progress (posição de cada um na sequência do plano).
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  muscle_group TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id),
  is_active INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS plan_workouts (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  name TEXT NOT NULL,
  order_in_sequence INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_exercises (
  id TEXT PRIMARY KEY,
  plan_workout_id TEXT NOT NULL REFERENCES plan_workouts(id),
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  order_in_workout INTEGER NOT NULL,
  superset_group TEXT,
  rest_seconds INTEGER,
  -- Técnica de execução (pirâmide, drop-set, rest-pause, isometria...), opcional.
  technique TEXT,
  -- JSON: PlanExerciseVariation[] — permite variações por semana/bloco.
  variations_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan_workout_id TEXT REFERENCES plan_workouts(id),
  plan_workout_name TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS logged_sets (
  id TEXT PRIMARY KEY,
  workout_session_id TEXT NOT NULL REFERENCES workout_sessions(id),
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  reps INTEGER,
  load_kg REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  plan_id TEXT REFERENCES plans(id),
  current_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_plan_workouts_plan ON plan_workouts(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_workout ON plan_exercises(plan_workout_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_logged_sets_session ON logged_sets(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_logged_sets_exercise ON logged_sets(exercise_id);
`;
