import { defineEventHandler } from "h3";
import { requireUser } from "../../utils/auth";
import { advanceUserSequence } from "../../utils/plans";

/** Pula manualmente para o próximo treino da sequência, sem registrar um treino completo. */
export default defineEventHandler((event) => {
  const user = requireUser(event);
  return advanceUserSequence(user.id);
});
