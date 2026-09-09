// Tipos de domínio compartilhados pelas rotas da API.
// (O front-end mantém uma cópia equivalente em web/src/types.ts,
// já que os dois projetos TS não compartilham um tsconfig.)

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string | null;
};

/** Uma variação de série/repetição/carga para uma semana/bloco do plano. */
export type PlanExerciseVariation = {
  week: number;
  sets: number;
  reps: string;
  loadKg: number | null;
};

export type PlanExerciseDraft = {
  exerciseName: string;
  muscleGroup: string | null;
  /** id de um exercício já existente no catálogo, se houver match. */
  matchedExerciseId: string | null;
  order: number;
  supersetGroup: string | null;
  restSeconds: number | null;
  variations: PlanExerciseVariation[];
};

export type PlanWorkoutDraft = {
  name: string;
  order: number;
  exercises: PlanExerciseDraft[];
};

/** Estrutura intermediária de um plano, antes de ser salvo no banco. */
export type PlanDraft = {
  workouts: PlanWorkoutDraft[];
  notes?: string;
};

export type PlanExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  order: number;
  supersetGroup: string | null;
  restSeconds: number | null;
  variations: PlanExerciseVariation[];
  /** Variação resolvida para a ocorrência atual do usuário que está consultando. */
  current: PlanExerciseVariation;
  /** Última carga/reps usadas por esse usuário nesse exercício (referência rápida). */
  lastUsed: { loadKg: number | null; reps: number | null; date: string } | null;
};

export type PlanWorkout = {
  id: string;
  name: string;
  order: number;
  exercises: PlanExercise[];
};

export type NextWorkout = {
  hasPlan: boolean;
  planId: string | null;
  workout: PlanWorkout | null;
  sequenceLength: number;
};

export type LoggedSetInput = {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number | null;
  loadKg: number | null;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiChatResponse = { type: "message"; text: string } | { type: "plan"; plan: PlanDraft };

export type ExerciseHistoryPoint = {
  sessionId: string;
  date: string;
  maxLoadKg: number | null;
  volume: number;
  isPr: boolean;
};
