import { defineEventHandler, getQuery } from "h3";
import { requireUser } from "../../utils/auth";
import { getNextWorkoutForUser } from "../../utils/plans";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const query = getQuery(event);
  const userId = typeof query.userId === "string" ? query.userId : user.id;
  return getNextWorkoutForUser(userId);
});
