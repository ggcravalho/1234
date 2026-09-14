import { createError, defineEventHandler, getQuery, getRouterParam } from "h3";
import { requireUser } from "../../utils/auth";
import { getExerciseHistory } from "../../utils/history";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const exerciseId = getRouterParam(event, "exerciseId");
  if (!exerciseId)
    throw createError({ statusCode: 400, statusMessage: "Id do exercício inválido." });

  const query = getQuery(event);
  const userId = typeof query.userId === "string" ? query.userId : user.id;
  return { history: getExerciseHistory(userId, exerciseId) };
});
