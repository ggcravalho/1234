import { defineEventHandler } from "h3";
import { requireUser } from "../../utils/auth";
import { listExercises } from "../../utils/exercises";

export default defineEventHandler((event) => {
  requireUser(event);
  return { exercises: listExercises() };
});
