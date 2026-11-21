"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Send, Sparkles, Loader2, Headset } from "lucide-react";
import { responderKB, SUGESTOES_RAPIDAS } from "./slime-kb";

type Mensagem = { id: number; role: "user" | "assistente"; texto: string; pending?: boolean };

let idMsg = 1;

export interface SlimeAssistantProps {
  aberto: boolean;
  onFechar: () => void;
}

/** Chat de suporte com respostas rápidas e base de conhecimento. */
export function SlimeAssistant({ aberto, onFechar }: SlimeAssistantProps) {
  const [mensagens, setMensagens] = React.useState<Mensagem[]>([]);
  const [valor, setValor] = React.useState("");
  const [aResponder, setAResponder] = React.useState(false);
  const listaRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const bemVindo = React.useRef(false);

  const enviar = React.useCallback(async (texto: string) => {
    const limpo = texto.trim();
    if (!limpo) return;
    const idUser = idMsg++;
    const idBot = idMsg++;
    setMensagens((m) => [...m, { id: idUser, role: "user", texto: limpo }, { id: idBot, role: "assistente", texto: "", pending: true }]);
    setValor("");
    setAResponder(true);
    try {
      const resp = await fetch("/api/slime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: limpo }),
      });
      const data = await resp.json().catch(() => null);
      const resposta: string = data?.resposta ?? responderKB(limpo).resposta;
      setMensagens((m) => m.map((msg) => (msg.id === idBot ? { ...msg, texto: resposta, pending: false } : msg)));
    } catch {
      setMensagens((m) => m.map((msg) => (msg.id === idBot ? { ...msg, texto: responderKB(limpo).resposta, pending: false } : msg)));
    } finally {
      setAResponder(false);
    }
  }, []);

  // Boas-vindas na primeira abertura
  React.useEffect(() => {
    if (aberto && !bemVindo.current) {
      bemVindo.current = true;
      setMensagens([
        {
          id: idMsg++,
          role: "assistente",
          texto: "Olá! Estás no suporte MOZOUT. Escolhe uma opção rápida ou escreve a tua dúvida sobre depósitos, levantamentos, taxas ou cartões.",
        },
      ]);
    }
    if (aberto) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 240);
      return () => window.clearTimeout(t);
    }
  }, [aberto]);

  // Auto-scroll suave
  React.useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [mensagens]);

  // Esc fecha
  React.useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, onFechar]);

  // Perguntas contextuais disparadas por toda a app ("Ajudar-me")
  React.useEffect(() => {
    const onPergunta = (e: Event) => {
      const texto = (e as CustomEvent<string>).detail;
      if (typeof texto === "string" && texto.trim()) void enviar(texto);
    };
    window.addEventListener("mozout:slime:pergunta", onPergunta);
    return () => window.removeEventListener("mozout:slime:pergunta", onPergunta);
  }, [enviar]);

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          key="slime-panel"
          role="dialog"
          aria-label="Assistente MOZOUT"
          initial={{ opacity: 0, y: 48, scale: 0.82, transformOrigin: "bottom right" }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.88, transition: { duration: 0.22 } }}
          transition={{ type: "spring", stiffness: 340, damping: 26, mass: 0.9 }}
          className="fixed inset-x-2.5 bottom-[calc(6.4rem+env(safe-area-inset-bottom))] z-[46] flex h-[62dvh] max-h-[540px] flex-col overflow-hidden rounded-3xl border border-forest/15 bg-cream shadow-[0_30px_80px_-20px_rgb(15_42_29/0.55)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(76dvh,540px)] sm:w-[392px]"
        >
          {/* Cabeçalho do suporte */}
          <div className="flex items-center gap-3 bg-forest px-4 py-3 text-cream">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"><Headset className="h-5 w-5 text-lime" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.95rem] font-extrabold leading-tight text-lime">Suporte MOZOUT</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-cream/60">Ajuda e respostas rápidas</p>
            </div>
            <button onClick={onFechar} className="rounded-full p-2 text-cream/75 transition-colors hover:bg-white/10 hover:text-cream" aria-label="Fechar suporte">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Conversa */}
          <div ref={listaRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3 sm:px-4" aria-live="polite">
            {mensagens.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[82%] rounded-2xl rounded-br-md bg-forest px-3.5 py-2 text-[0.88rem] font-semibold leading-snug text-cream"
                      : "max-w-[88%] rounded-2xl rounded-bl-md border border-black/5 bg-surface px-3.5 py-2 text-[0.88rem] font-medium leading-snug text-ink shadow-sm"
                  }
                >
                  {m.pending ? (
                    <span className="flex items-center gap-1.5 py-0.5 text-ink/45">
                      <Loader2 className="h-4 w-4 animate-spin" /> Suporte a responder<span className="dot-blink">.</span><span className="dot-blink">.</span><span className="dot-blink">.</span>
                    </span>
                  ) : (
                    m.texto
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sugestões rápidas */}
          {mensagens.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 border-t border-black/5 px-3 pt-2">
              {SUGESTOES_RAPIDAS.map((s) => (
                <button
                  key={s}
                  onClick={() => void enviar(s)}
                  className="rounded-full border border-forest/20 bg-lime-soft px-3 py-1.5 text-[0.72rem] font-extrabold text-forest transition-colors hover:bg-lime"
                >
                  <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />{s}</span>
                </button>
              ))}
            </div>
          )}

          {/* Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void enviar(valor);
            }}
            className="flex items-center gap-2 border-t border-black/8 bg-surface p-2.5"
          >
            <input
              ref={inputRef}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Escreve a tua dúvida…"
              maxLength={500}
              className="h-11 min-w-0 flex-1 rounded-2xl border-2 border-mist bg-cream px-3.5 text-[0.9rem] font-semibold outline-none transition-colors placeholder:text-ink/35 focus:border-forest"
              aria-label="A tua pergunta"
            />
            <button
              type="submit"
              disabled={aResponder || !valor.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest text-lime transition-all hover:bg-moss disabled:opacity-40"
              aria-label="Enviar"
            >
              {aResponder ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>

          <div className="border-t border-black/5 px-3 py-2 text-center text-[0.72rem] font-semibold text-ink/55">
            Precisas de uma pessoa? <Link href="mailto:suporte@mozout.co.mz" className="font-extrabold text-forest underline underline-offset-2">Contacta a equipa</Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
