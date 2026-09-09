import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { AiChatResponse, ChatMessage } from "../types";

const INITIAL_MESSAGE =
  "Oi! Vamos montar o próximo bloco de treino. Me conta: qual é o objetivo principal " +
  "agora (ganhar força, hipertrofia, resistência...) e quantos dias por semana vocês " +
  "conseguem treinar?";

export default function PlanChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [includePartner, setIncludePartner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const content = input.trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<AiChatResponse>("/ai/chat", {
        messages: next,
        includePartner,
      });
      if (response.type === "plan") {
        navigate("/plano/revisar", { state: { plan: response.plan, source: "ai_chat" } });
        return;
      }
      setMessages([...next, { role: "assistant", content: response.text }]);
      queueMicrotask(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível conversar com a IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col px-4 pt-5">
      <h1 className="mb-1 text-xl font-bold text-zinc-900">Assistente de treino</h1>
      <label className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={includePartner}
          onChange={(e) => setIncludePartner(e.target.checked)}
        />
        Considerar também o histórico do(a) parceiro(a)
      </label>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.map((m, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: histórico de chat é somente anexado, a ordem nunca muda
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "ml-auto bg-brand-600 text-white"
                : "bg-white text-zinc-800 ring-1 ring-zinc-100"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="text-xs text-zinc-400">A IA está pensando…</p>}
        <div ref={scrollRef} />
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pb-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escreva sua resposta…"
          className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded-xl bg-brand-600 px-4 font-semibold text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
