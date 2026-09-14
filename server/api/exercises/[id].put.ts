import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { requireUser } from "../../utils/auth";
import { updateExercise } from "../../utils/exercises";

export default defineEventHandler(async (event) => {
  requireUser(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Id inválido." });

  const body = await readBody<{ name?: string; muscleGroup?: string | null }>(event);
  const exercise = updateExercise(id, { name: body?.name, muscleGroup: body?.muscleGroup });
  if (!exercise) throw createError({ statusCode: 404, statusMessage: "Exercício não encontrado." });
  return { exercise };
});
