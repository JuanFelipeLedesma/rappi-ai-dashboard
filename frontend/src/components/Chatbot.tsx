"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X, Wrench } from "lucide-react";
import { api } from "@/lib/api";

type Msg = { role: "user" | "assistant"; text: string; tools?: any[] };

const SUGGESTIONS = [
  "¿Cuál es la hora con menos tiendas disponibles?",
  "Resume la disponibilidad del 5 de febrero",
  "¿Hubo caídas importantes esta semana?",
  "Compara el lunes vs. el viernes",
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hola 👋 Soy tu asistente de disponibilidad. Pregúntame sobre tendencias, caídas o cualquier métrica del dataset.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: "user" as const, text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      // Send only the prior assistant/user text for the API (backend ignores its own metadata)
      const history = next
        .slice(0, -1)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.text }));
      const r = await api.chat(text, history);
      setMessages((m) => [...m, { role: "assistant", text: r.reply, tools: r.tool_calls }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 rounded-full bg-rappi hover:bg-rappi-dark shadow-xl shadow-rappi/40 p-4 transition z-50"
          aria-label="Abrir chatbot"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 w-[420px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-ink-800 border border-ink-700 rounded-2xl shadow-2xl flex flex-col z-50">
          <div className="flex items-center justify-between p-4 border-b border-ink-700">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rappi to-rappi-dark flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm">Asistente de Disponibilidad</div>
                <div className="text-[11px] text-gray-500">Claude + tool use</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-rappi text-white"
                      : "bg-ink-900 text-gray-100 border border-ink-700"
                  }`}
                >
                  {m.text}
                  {m.tools && m.tools.length > 0 && (
                    <details className="mt-2 text-[11px] text-gray-500">
                      <summary className="cursor-pointer flex items-center gap-1 hover:text-gray-300">
                        <Wrench className="h-3 w-3" />
                        {m.tools.length} tool call{m.tools.length > 1 ? "s" : ""}
                      </summary>
                      <ul className="mt-1 pl-4 space-y-0.5">
                        {m.tools.map((t, j) => (
                          <li key={j} className="font-mono">
                            {t.name}({JSON.stringify(t.input).slice(0, 60)})
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-ink-900 border border-ink-700 rounded-2xl px-4 py-3 text-sm">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-ink-900 border border-ink-700 hover:border-rappi text-gray-300 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="p-3 border-t border-ink-700 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntame sobre los datos..."
              className="flex-1 bg-ink-900 border border-ink-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rappi"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-rappi hover:bg-rappi-dark disabled:opacity-40 px-3 transition"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
