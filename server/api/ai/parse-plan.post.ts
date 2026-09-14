import { createError, defineEventHandler, readBody } from "h3";
import { parsePlanFromText } from "../../utils/ai";
import { requireUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  requireUser(event);
  const body = await readBody<{ text?: string }>(event);
  const text = body?.text?.trim();
  if (!text) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cole o texto do plano antes de interpretar.",
    });
  }

  try {
    const plan = await parsePlanFromText(text);
    return { plan };
  } catch (err) {
    throw createError({
      statusCode: 502,
      statusMessage: err instanceof Error ? err.message : "Falha ao interpretar o plano com a IA.",
    });
  }
});
