import { createError, defineEventHandler, readBody } from "h3";
import { requireUser } from "../../utils/auth";
import { createExercise } from "../../utils/exercises";

export default defineEventHandler(async (event) => {
  requireUser(event);
  const body = await readBody<{ name?: string; muscleGroup?: string | null }>(event);
  const name = body?.name?.trim();
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Nome do exercício é obrigatório." });
  }
  const exercise = createExercise(name, body?.muscleGroup ?? null);
  return { exercise };
});
