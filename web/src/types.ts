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

export type PlanExerciseVariation = {
  week: number;
  sets: number;
  reps: string;
  loadKg: number | null;
};

export type PlanExerciseDraft = {
  exerciseName: string;
  muscleGroup: string | null;
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
  current: PlanExerciseVariation;
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
