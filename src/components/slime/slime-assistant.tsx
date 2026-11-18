"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Volume2, VolumeX, Sparkles, Loader2, EyeOff } from "lucide-react";
import { responderKB, SUGESTOES_RAPIDAS } from "./slime-kb";

type Mensagem = { id: number; role: "user" | "assistente"; texto: string; pending?: boolean };

let idMsg = 1;

function MiniSlime({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id="mini-slime" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#d9ff8a" />
          <stop offset="45%" stopColor="#8fe32f" />
          <stop offset="100%" stopColor="#2f7d21" />
        </radialGradient>
      </defs>
      <path d="M32 3c14.5 0 24 12.5 24 28S47 58 32 58 8 46.5 8 31 17.5 3 32 3Z" fill="url(#mini-slime)" />
      <ellipse cx="23.5" cy="30" rx="5" ry="6" fill="#fff" />
      <ellipse cx="40.5" cy="30" rx="5" ry="6" fill="#fff" />
      <circle cx="24.4" cy="31" r="2.6" fill="#12240f" />
      <circle cx="41.4" cy="31" r="2.6" fill="#12240f" />
      <circle cx="23.5" cy="30" r="0.8" fill="#fff" />
      <circle cx="40.5" cy="30" r="0.8" fill="#fff" />
      <path d="M24 42q8 5.5 16 0" stroke="#12240f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export interface SlimeAssistantProps {
  aberto: boolean;
  somLigado: boolean;
  onAlternarSom: () => void;
  onFechar: () => void;
  onOcultarParaSempre: () => void;
}

/** Painel de assistência da mascote. Conversa determinística por omissão; nunca executa operações. */
export function SlimeAssistant({ aberto, somLigado, onAlternarSom, onFechar, onOcultarParaSempre }: SlimeAssistantProps) {
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
          texto: "Olá! Eu sou a Mozinha, a tua ajudante aqui na MOZOUT 🫧 Pergunta-me o que quiseres sobre depósitos, levantamentos, taxas, cartões… prometo não inventar nada.",
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
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 bg-forest px-4 py-3 text-cream">
            <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
              <MiniSlime className="h-11 w-11 drop-shadow" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.95rem] font-extrabold leading-tight text-lime">Mozinha</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-cream/60">assistente MOZOUT</p>
            </div>
            <button
              onClick={onAlternarSom}
              className="rounded-full p-2 text-cream/75 transition-colors hover:bg-white/10 hover:text-cream"
              aria-label={somLigado ? "Desativar sons" : "Ativar sons"}
              title={somLigado ? "Sons: ligados" : "Sons: desligados"}
            >
              {somLigado ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
            </button>
            <button onClick={onFechar} className="rounded-full p-2 text-cream/75 transition-colors hover:bg-white/10 hover:text-cream" aria-label="Fechar assistente">
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Mozinha a pensar<span className="dot-blink">.</span><span className="dot-blink">.</span><span className="dot-blink">.</span>
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
              placeholder="Pergunta à Mozinha…"
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

          {/* Ocultar mascote */}
          <button
            onClick={onOcultarParaSempre}
            className="flex items-center justify-center gap-1.5 border-t border-black/5 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-ink/35 transition-colors hover:text-ink/60"
          >
            <EyeOff className="h-3.5 w-3.5" /> Ocultar a Mozinha neste dispositivo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
