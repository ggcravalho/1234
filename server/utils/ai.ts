import { type Content, type FunctionDeclaration, GoogleGenAI } from "@google/genai";
import type { AiChatResponse, ChatMessage, PlanDraft } from "../types";
import { matchExercise } from "./exercises";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY não configurada. Crie uma chave gratuita em https://aistudio.google.com/apikey e defina essa variável de ambiente para usar os recursos de IA.",
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

// Modelo do tier gratuito da API do Gemini (Google AI Studio). Pode ser
// sobrescrito via env caso um modelo mais novo/melhor esteja disponível.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// Esquema JSON do plano completo — reaproveitado tanto para extração direta
// (responseJsonSchema) quanto como parâmetros da function "submit_plan" no
// chat assistente.
const PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    notes: { type: "string", description: "Observações gerais do plano/bloco, opcional." },
    workouts: {
      type: "array",
      description:
        "Sequência de treinos do ciclo (ex: Treino A, B, C), na ordem em que devem ser feitos.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Ex: 'Treino A'" },
          order: { type: "integer", description: "Posição na sequência, começando em 0." },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exerciseName: { type: "string" },
                muscleGroup: {
                  type: "string",
                  description: "Grupo muscular principal, ex: 'Peito'.",
                },
                order: { type: "integer" },
                supersetGroup: {
                  type: "string",
                  description:
                    "Identificador (ex: 'SS1') que agrupa exercícios feitos em sequência/circuito. Deixe vazio se não houver.",
                },
                restSeconds: {
                  type: "integer",
                  description: "Descanso entre séries, em segundos.",
                },
                variations: {
                  type: "array",
                  description:
                    "Uma entrada por semana/bloco de periodização. Se não houver variação ao longo do tempo, envie uma única entrada com week=1.",
                  items: {
                    type: "object",
                    properties: {
                      week: { type: "integer" },
                      sets: { type: "integer" },
                      reps: { type: "string", description: "Ex: '8-10' ou '12'." },
                      loadKg: {
                        type: "number",
                        description: "Carga sugerida em kg, se especificada.",
                      },
                    },
                    required: ["week", "sets", "reps"],
                  },
                },
              },
              required: ["exerciseName", "order", "variations"],
            },
          },
        },
        required: ["name", "order", "exercises"],
      },
    },
  },
  required: ["workouts"],
};

const SUBMIT_PLAN_FUNCTION: FunctionDeclaration = {
  name: "submit_plan",
  description:
    "Envia o plano de treino final, já estruturado em treinos (A, B, C...) e exercícios, respeitando variações de série/repetição/carga por semana ou bloco quando existirem.",
  parametersJsonSchema: PLAN_JSON_SCHEMA,
};

function toolInputToPlanDraft(input: Record<string, unknown>): PlanDraft {
  const workouts = (input.workouts as Record<string, unknown>[] | undefined) ?? [];
  return {
    notes: typeof input.notes === "string" ? input.notes : undefined,
    workouts: workouts.map((w, wIndex) => {
      const exercises = (w.exercises as Record<string, unknown>[] | undefined) ?? [];
      return {
        name: String(w.name ?? `Treino ${String.fromCharCode(65 + wIndex)}`),
        order: typeof w.order === "number" ? w.order : wIndex,
        exercises: exercises.map((ex, exIndex) => {
          const name = String(ex.exerciseName ?? "Exercício");
          const muscleGroup = typeof ex.muscleGroup === "string" ? ex.muscleGroup : null;
          const match = matchExercise(name);
          const rawVariations = (ex.variations as Record<string, unknown>[] | undefined) ?? [];
          return {
            exerciseName: name,
            muscleGroup: match?.muscleGroup ?? muscleGroup,
            matchedExerciseId: match?.id ?? null,
            order: typeof ex.order === "number" ? ex.order : exIndex,
            supersetGroup: (ex.supersetGroup as string) || null,
            restSeconds: typeof ex.restSeconds === "number" ? ex.restSeconds : null,
            variations:
              rawVariations.length > 0
                ? rawVariations.map((v, i) => ({
                    week: typeof v.week === "number" ? v.week : i + 1,
                    sets: typeof v.sets === "number" ? v.sets : 3,
                    reps: String(v.reps ?? "10"),
                    loadKg: typeof v.loadKg === "number" ? v.loadKg : null,
                  }))
                : [{ week: 1, sets: 3, reps: "10", loadKg: null }],
          };
        }),
      };
    }),
  };
}

const PLAN_STRUCTURE_GUIDE = `
Você ajuda a estruturar planos de treino de academia para o app "Bitu's Fit".
O plano é compartilhado por um casal que treina junto, então não pergunte
"para qual usuário" — ele é único e vale para os dois.

Regras importantes:
- Um plano é uma sequência cíclica de treinos (ex: Treino A, B, C), que se repete do início ao chegar no fim.
- Cada exercício pode ter séries/reps/carga diferentes por semana ou bloco de periodização — use o campo "variations" para isso.
  Se o plano não varia ao longo do tempo, envie uma única variação (week=1).
- Agrupe exercícios feitos em sequência/circuito (superséries) com o mesmo "supersetGroup".
- Use nomes de exercícios comuns em português (ex: "Supino Reto", "Puxada Alta").
`.trim();

/** Interpreta um plano colado em texto livre e retorna a estrutura de dados do plano. */
export async function parsePlanFromText(text: string): Promise<PlanDraft> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text }] }],
    config: {
      systemInstruction: `${PLAN_STRUCTURE_GUIDE}\n\nTarefa: o usuário colou um plano de treino escrito livremente (pode ter vindo de outra IA ou de um personal trainer). Interprete o texto e extraia a estrutura completa, preservando o que foi escrito o mais fielmente possível. Responda apenas com o JSON estruturado do plano.`,
      responseMimeType: "application/json",
      responseJsonSchema: PLAN_JSON_SCHEMA,
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Não foi possível interpretar o plano enviado.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("A IA retornou uma resposta em formato inesperado ao interpretar o plano.");
  }
  return toolInputToPlanDraft(parsed);
}

/**
 * Conduz um turno do chat assistente de criação de plano. Recebe o
 * histórico da conversa e um resumo do histórico de treino como contexto;
 * retorna ou uma pergunta/mensagem de continuação, ou o plano finalizado.
 */
export async function runPlanChatTurn(
  messages: ChatMessage[],
  trainingContext: string,
): Promise<AiChatResponse> {
  const system = `${PLAN_STRUCTURE_GUIDE}

Você está conduzindo uma conversa livre (não um formulário fixo) para entender
os objetivos e preferências do usuário para o próximo bloco de treino.
Faça perguntas em linguagem natural, uma ou duas por vez, sobre coisas como:
objetivo (hipertrofia, força, resistência...), dias disponíveis por semana,
exercícios que gosta ou quer evitar, lesões/limitações, duração do bloco.
Use o contexto de histórico de treino abaixo para sugerir cargas e evolução
coerentes com o que a pessoa já vem fazendo.

Contexto de histórico de treino:
${trainingContext}

Quando já tiver informação suficiente, chame a função "submit_plan" com o
plano completo. Enquanto estiver reunindo informação, apenas responda em texto.`;

  const contents: Content[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: system,
      tools: [{ functionDeclarations: [SUBMIT_PLAN_FUNCTION] }],
    },
  });

  const calls = response.functionCalls;
  const submitCall = calls?.find((c) => c.name === "submit_plan");
  if (submitCall) {
    return {
      type: "plan",
      plan: toolInputToPlanDraft((submitCall.args as Record<string, unknown>) ?? {}),
    };
  }
  return {
    type: "message",
    text: response.text || "Pode me contar um pouco mais sobre seus objetivos?",
  };
}
