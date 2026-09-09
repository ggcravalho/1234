import { createError, defineEventHandler, readBody } from "h3";
import type { PlanDraft } from "../../types";
import { requireUser } from "../../utils/auth";
import { savePlan } from "../../utils/plans";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const body = await readBody<{ plan?: PlanDraft; source?: "paste" | "ai_chat" | "manual" }>(event);

  if (!body?.plan || !Array.isArray(body.plan.workouts) || body.plan.workouts.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Plano inválido: informe ao menos um treino.",
    });
  }

  const { planId } = savePlan(body.plan, user.id, body.source ?? "manual");
  return { planId };
});
