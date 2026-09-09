import { defineEventHandler, getQuery } from "h3";
import { requireUser } from "../../utils/auth";
import { listExercisesWithHistory } from "../../utils/history";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const query = getQuery(event);
  const userId = typeof query.userId === "string" ? query.userId : user.id;
  return { exercises: listExercisesWithHistory(userId) };
});
