import { createError, defineEventHandler, readBody } from "h3";
import { getDb } from "../../db/client";
import type { ChatMessage } from "../../types";
import { runPlanChatTurn } from "../../utils/ai";
import { requireUser } from "../../utils/auth";
import { buildTrainingContextSummary } from "../../utils/history";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const body = await readBody<{ messages?: ChatMessage[]; includePartner?: boolean }>(event);
  const messages = body?.messages ?? [];
  if (messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Envie ao menos uma mensagem." });
  }

  let context = buildTrainingContextSummary(user.id, "Você");
  if (body?.includePartner) {
    const partner = getDb()
      .prepare("SELECT id, name FROM users WHERE id != ? LIMIT 1")
      .get(user.id) as { id: string; name: string } | undefined;
    if (partner) {
      context += `\n\n${buildTrainingContextSummary(partner.id, partner.name)}`;
    }
  }

  try {
    const response = await runPlanChatTurn(messages, context);
    return response;
  } catch (err) {
    throw createError({
      statusCode: 502,
      statusMessage: err instanceof Error ? err.message : "Falha ao conversar com a IA.",
    });
  }
});
