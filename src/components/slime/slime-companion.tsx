"use client";

import React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { CircleHelp, X } from "lucide-react";
import { SlimeAssistant } from "./slime-assistant";
import { tocarSom } from "./slime-sound";

type Expressao = "idle" | "curious" | "surprised" | "sleepy" | "concerned" | "happy" | "proud";

interface Hint {
  id: number;
  titulo: string;
  texto: string;
  pergunta: string;
}

interface Particula {
  id: number;
  dx: number;
  dy: number;
  tamanho: number;
  atraso: number;
}

let idParticula = 1;
let idHint = 1;

/** Tamanho responsivo da mascote */
const clampSize = () => (typeof window === "undefined" ? 104 : Math.max(76, Math.min(116, Math.round(window.innerWidth * 0.17))));

function Boca({ expressao }: { expressao: Expressao }) {
  const comum = { stroke: "#123b1e", strokeWidth: 3.4, strokeLinecap: "round" as const, fill: "none" };
  switch (expressao) {
    case "surprised":
      return <ellipse cx="60" cy="92" rx="5.4" ry="6.6" fill="#123b1e" />;
    case "sleepy":
      return <path d="M48 92h24" {...comum} strokeWidth="3" />;
    case "concerned":
      return <path d="M46 96q7-8 14 0t14 0" {...comum} strokeWidth="3" />;
    case "curious":
      return <path d="M50 90q10 6 20 0" {...comum} strokeWidth="3" />;
    case "proud":
      return <path d="M42 88q18 15 36 0" {...comum} strokeWidth="3.6" />;
    case "happy":
      return <path d="M44 88q16 12 32 0" {...comum} strokeWidth="3.4" />;
    default:
      return <path d="M47 89q13 9 26 0" {...comum} strokeWidth="3.2" />;
  }
}

/**
 * Mozinha — mascote viva do MOZOUT-USD.
 * Física gelatinosa (springs squash & stretch), olhos que seguem o cursor,
 * passeio autónomo com área segura, deteção de dificuldade em formulários,
 * painel de assistência e respeito por prefers-reduced-motion.
 * Nunca executa operações nem preenche formulários.
 */
export function SlimeCompanion() {
  const reduzMovimento = useReducedMotion();

  // Posição global (springs = física elástica)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 120, damping: 15, mass: 1.05 });
  const y = useSpring(rawY, { stiffness: 120, damping: 15, mass: 1.05 });

  // Squash & stretch
  const squashX = useSpring(1, { stiffness: 210, damping: 12, mass: 0.8 });
  const squashY = useSpring(1, { stiffness: 210, damping: 12, mass: 0.8 });
  const inclinacao = useSpring(0, { stiffness: 160, damping: 18 });

  // Salto (desvio vertical interno) e sombra
  const hop = useSpring(0, { stiffness: 260, damping: 11, mass: 0.7 });
  const sombra = useSpring(1, { stiffness: 260, damping: 18 });

  // Pupilas
  const pupilaX = useSpring(0, { stiffness: 300, damping: 22 });
  const pupilaY = useSpring(0, { stiffness: 300, damping: 22 });

  const [visivel, setVisivel] = React.useState(false);
  const [expressao, setExpressao] = React.useState<Expressao>("idle");
  const [aPiscar, setAPiscar] = React.useState(false);
  const [painelAberto, setPainelAberto] = React.useState(false);
  const [somLigado] = React.useState(false);
  const [hint, setHint] = React.useState<Hint | null>(null);
  const [particulas, setParticulas] = React.useState<Particula[]>([]);
  const [tamanho, setTamanho] = React.useState(104);

  const areaRef = React.useRef<HTMLDivElement>(null);
  const ultimaInteracao = React.useRef(0);
  const aMover = React.useRef(false);
  const passeioTimer = React.useRef<number | null>(null);
  const hintTimer = React.useRef<number | null>(null);
  const dismissadoAte = React.useRef(0);
  const sugestaoCheck = React.useRef(new WeakSet<Element>());
  const focoDesde = React.useRef(new WeakMap<Element, number>());
  const cliquesCampo = React.useRef(new WeakMap<Element, { n: number; desde: number }>());
  const ultimoErroHint = React.useRef(0);
  const expressaoRef = React.useRef<Expressao>("idle");
  const painelRef = React.useRef(false);

  React.useEffect(() => {
    painelRef.current = painelAberto;
  }, [painelAberto]);

  React.useEffect(() => {
    expressaoRef.current = expressao;
  }, [expressao]);

  /* ── Limites seguros: nunca sobre a navegação inferior nem o header ── */
  const limites = React.useCallback(() => {
    const size = clampSize();
    const mobile = window.innerWidth < 768;
    const margemBaixo = mobile ? 88 : 18; // espaço para a bottom nav
    const margemCima = mobile ? 74 : 76;
    return {
      size,
      minX: 12,
      maxX: Math.max(12, window.innerWidth - size - 12),
      minY: margemCima,
      maxY: Math.max(margemCima + 20, window.innerHeight - size - margemBaixo),
    };
  }, []);

  const registarInteracao = React.useCallback(() => {
    ultimaInteracao.current = Date.now();
    if (expressaoRef.current === "sleepy") setExpressao("idle");
  }, []);

  /* ── Posicionamento inicial ── */
  React.useEffect(() => {
    ultimaInteracao.current = Date.now();
    const raf = requestAnimationFrame(() => {
      const { size, maxX, maxY } = limites();
      rawX.set(Math.max(12, maxX - 6));
      rawY.set(maxY);
      setTamanho(size);
      setVisivel(true);
    });
    const onResize = () => {
      const { size, maxX, maxY } = limites();
      rawX.set(Math.min(Math.max(rawX.get(), 12), maxX));
      rawY.set(Math.min(Math.max(rawY.get(), 76), maxY));
      setTamanho(size);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [limites, rawX, rawY]);

  /* ── Piscar natural ── */
  React.useEffect(() => {
    if (reduzMovimento) return;
    let vivo = true;
    let t: number;
    const agendar = () => {
      t = window.setTimeout(() => {
        if (!vivo) return;
        setAPiscar(true);
        window.setTimeout(() => vivo && setAPiscar(false), 150);
        agendar();
      }, 2600 + Math.random() * 3400);
    };
    agendar();
    return () => {
      vivo = false;
      window.clearTimeout(t);
    };
  }, [reduzMovimento]);

  const aterrar = React.useCallback(() => {
    squashY.set(0.72);
    squashX.set(1.3);
    window.setTimeout(() => {
      squashY.set(1.14);
      squashX.set(0.9);
    }, 150);
    window.setTimeout(() => {
      squashY.set(1);
      squashX.set(1);
    }, 320);
  }, [squashX, squashY]);

  /* ── Passeio autónomo ── */
  React.useEffect(() => {
    if (!visivel || reduzMovimento) return;
    let vivo = true;

    const passear = () => {
      if (!vivo) return;
      // Ocasionalmente apenas "acorda" e observa, para não ser previsível
      const soEspreitar = Math.random() < 0.28;
      if (soEspreitar) {
        setExpressao(Math.random() < 0.5 ? "curious" : "idle");
        passeioTimer.current = window.setTimeout(passear, 2600 + Math.random() * 3200);
        return;
      }
      const { minX, maxX, minY, maxY } = limites();
      const destinoX = minX + Math.random() * (maxX - minX);
      const destinoY = minY + Math.random() * (maxY - minY);
      const deX = rawX.get();
      const distancia = Math.abs(destinoX - deX);
      aMover.current = true;
      setExpressao((e) => (e === "sleepy" ? "idle" : e));
      // Antecipação: estica-se antes de arrancar
      squashX.set(1.16);
      squashY.set(0.86);
      window.setTimeout(() => {
        if (!vivo) return;
        squashX.set(1.24);
        squashY.set(0.8);
        inclinacao.set(destinoX >= deX ? 7 : -7);
        rawX.set(destinoX);
        rawY.set(destinoY);
      }, 170);
      // Tempo estimado de voo até aterrar (proporcional à distância)
      const voo = 520 + Math.min(1300, distancia * 1.6);
      passeioTimer.current = window.setTimeout(() => {
        if (!vivo) return;
        aMover.current = false;
        inclinacao.set(0);
        aterrar();
        passeioTimer.current = window.setTimeout(passear, 3400 + Math.random() * 5200);
      }, 170 + voo);
    };

    passeioTimer.current = window.setTimeout(passear, 1600 + Math.random() * 1800);
    return () => {
      vivo = false;
      if (passeioTimer.current) window.clearTimeout(passeioTimer.current);
    };
  }, [visivel, reduzMovimento, limites, rawX, rawY, squashX, squashY, inclinacao, aterrar]);

  /* ── Sonolenta se ninguém interagir (75s) ── */
  React.useEffect(() => {
    if (reduzMovimento) return;
    const t = window.setInterval(() => {
      if (Date.now() - ultimaInteracao.current > 75_000 && !painelRef.current && expressaoRef.current !== "sleepy" && !aMover.current) {
        setExpressao("sleepy");
        tocarSom("z");
      }
    }, 4000);
    return () => window.clearInterval(t);
  }, [reduzMovimento]);

  /* ── Olhos seguem o cursor / toque ── */
  React.useEffect(() => {
    let pendente: number | null = null;
    const atualizar = (px: number, py: number) => {
      if (pendente !== null) return;
      pendente = requestAnimationFrame(() => {
        pendente = null;
        const el = areaRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.hypot(dx, dy);
        const fator = 34;
        pupilaX.set(Math.max(-6.2, Math.min(6.2, (dx / fator))));
        pupilaY.set(Math.max(-5, Math.min(5.2, (dy / fator))));
        if (!aMover.current) inclinacao.set(Math.max(-9, Math.min(9, dx / 26)));
        if (!painelRef.current) {
          if (dist < 150 && expressaoRef.current !== "surprised") setExpressao((e) => (e === "sleepy" ? "sleepy" : "curious"));
          else if (dist > 280 && expressaoRef.current === "curious") setExpressao("idle");
        }
      });
    };
    const onMove = (e: PointerEvent) => {
      registarInteracao();
      atualizar(e.clientX, e.clientY);
    };
    const onScroll = () => registarInteracao();
    const onKey = () => registarInteracao();
    const onLeave = () => {
      pupilaX.set(0);
      pupilaY.set(0);
      if (!aMover.current) inclinacao.set(0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("touchstart", onKey, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      if (pendente !== null) cancelAnimationFrame(pendente);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("touchstart", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [pupilaX, pupilaY, inclinacao, registarInteracao]);

  /* ── Sombra reage à altura do salto ── */
  useMotionValueEvent(hop, "change", (v) => {
    sombra.set(Math.max(0.62, Math.min(1, 1 + v / 120)));
  });

  /* ── Deteção de dificuldade real (eventos, nunca suposições) ── */
  React.useEffect(() => {
    if (hint !== null) return; // um hint de cada vez
    const podeMostrar = () => Date.now() > dismissadoAte.current;

    const campoInfo = (el: Element) => {
      const label = el as HTMLInputElement;
      const id = label.id;
      const labelEl = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const rotulo =
        labelEl?.textContent?.trim() ||
        label.getAttribute("aria-label") ||
        label.getAttribute("placeholder")?.slice(0, 42) ||
        "este campo";
      return { rotulo, vazio: !(label.value ?? "").trim() };
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as Element;
      if (el instanceof HTMLElement && el.matches("input, textarea, select")) focoDesde.current.set(el, Date.now());
    };
    const onInvalid = (e: Event) => {
      const el = e.target as Element;
      if (!(el instanceof HTMLElement) || !el.matches("input, textarea, select")) return;
      if (!podeMostrar() || Date.now() - ultimoErroHint.current < 60_000) return;
      ultimoErroHint.current = Date.now();
      const { rotulo } = campoInfo(el);
      setHint({
        id: idHint++,
        titulo: "Opa! Algo não correu bem",
        texto: "Parece que alguma coisa não correu como esperado. Queres que te ajude?",
        pergunta: `O formulário deu erro no campo "${rotulo}". O que devo verificar?`,
      });
      setExpressao("concerned");
      if (somLigado) tocarSom("erro");
    };
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as Element;
      if (!(el instanceof HTMLElement) || !el.matches("input, textarea, select")) return;
      const agora = Date.now();
      const registo = cliquesCampo.current.get(el);
      if (registo && agora - registo.desde < 1500) {
        const n = registo.n + 1;
        cliquesCampo.current.set(el, { n, desde: agora });
        if (n >= 3 && podeMostrar() && !sugestaoCheck.current.has(el)) {
          sugestaoCheck.current.add(el);
          const { rotulo } = campoInfo(el);
          setHint({
            id: idHint++,
            titulo: `Ajuda com "${rotulo}"?`,
            texto: "Estás a insistir neste campo — talvez precise de uma ajudinha? Eu explico o que é esperado.",
            pergunta: `Tenho dificuldade com o campo "${rotulo}". Explica-me o que devo pôr aí.`,
          });
          setExpressao("curious");
        }
      } else {
        cliquesCampo.current.set(el, { n: 1, desde: agora });
      }
    };

    window.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("invalid", onInvalid, true);
    window.addEventListener("pointerdown", onPointerDown, true);

    // Permanência longa num campo vazio/inválido
    const vigia = window.setInterval(() => {
      if (!podeMostrar()) return;
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || !el.matches("input, textarea, select")) return;
      const desde = focoDesde.current.get(el);
      if (!desde) return;
      const { rotulo, vazio } = campoInfo(el);
      const invalido = el.getAttribute("aria-invalid") === "true" || (el as HTMLInputElement).validity?.valid === false;
      if (Date.now() - desde > 12_000 && (vazio || invalido) && !sugestaoCheck.current.has(el)) {
        sugestaoCheck.current.add(el);
        setHint({
          id: idHint++,
          titulo: `Psst! Precisas de ajuda com "${rotulo}"?`,
          texto: "Fica à vontade — digo-te o que é esperado aqui, sem inventar nada.",
          pergunta: `Estou há algum tempo no campo "${rotulo}". O que devo introduzir?`,
        });
        setExpressao("curious");
      }
    }, 1500);

    return () => {
      window.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("invalid", onInvalid, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.clearInterval(vigia);
    };
  }, [hint, somLigado]);

  /* ── Hint auto-desaparece ── */
  React.useEffect(() => {
    if (!hint) return;
    hintTimer.current = window.setTimeout(() => setHint(null), 9000);
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, [hint]);

  const saltarPara = React.useCallback(
    (alvoX: number, alvoY: number) => {
      rawX.set(alvoX);
      rawY.set(alvoY);
      aMover.current = true;
      squashY.set(0.8);
      squashX.set(1.22);
      window.setTimeout(() => {
        aMover.current = false;
        squashY.set(1);
        squashX.set(1);
      }, 700);
    },
    [rawX, rawY, squashX, squashY],
  );

  /* ── Abrir / fechar o assistente ── */
  const alternarPainel = React.useCallback(() => {
    registarInteracao();
    setPainelAberto((aberto) => {
      const novo = !aberto;
      if (novo) {
        setExpressao("happy");
        if (somLigado) tocarSom("abrir");
        // Salta para junto do painel
        const { size, maxX, minY } = limites();
        const mobile = window.innerWidth < 640;
        const destinoX = mobile ? Math.max(12, window.innerWidth - size - 14) : Math.max(12, maxX - 4);
        const destinoY = mobile ? minY + 6 : Math.max(minY, window.innerHeight - size - 210);
        saltarPara(destinoX, destinoY);
        // Efeito elástico de "salto de alegria"
        hop.set(-46);
        window.setTimeout(() => hop.set(0), 420);
        window.setTimeout(() => setExpressao("proud"), 1300);
        window.setTimeout(() => setExpressao("idle"), 2600);
      } else {
        setExpressao("idle");
      }
      return novo;
    });
  }, [limites, hop, registarInteracao, saltarPara, somLigado]);

  /* ── Clique na criatura: boing + partículas + abre painel ── */
  const aoClicar = React.useCallback(() => {
    registarInteracao();
    if (somLigado) tocarSom("boing");
    setExpressao("surprised");
    hop.set(-52);
    squashY.set(0.78);
    squashX.set(1.28);
    window.setTimeout(() => hop.set(0), 400);
    window.setTimeout(() => {
      squashY.set(1.12);
      squashX.set(0.92);
    }, 380);
    window.setTimeout(() => {
      squashY.set(1);
      squashX.set(1);
    }, 620);
    // Partículas de gosma
    if (!reduzMovimento) {
      const novas: Particula[] = Array.from({ length: 9 }, () => ({
        id: idParticula++,
        dx: (Math.random() - 0.5) * 130,
        dy: -30 - Math.random() * 95,
        tamanho: 4 + Math.random() * 7,
        atraso: Math.random() * 0.08,
      }));
      setParticulas((p) => [...p.slice(-12), ...novas]);
    }
    window.setTimeout(() => {
      setExpressao("surprised");
      alternarPainel();
    }, 340);
  }, [alternarPainel, hop, reduzMovimento, registarInteracao, somLigado, squashX, squashY]);

  const dispensarHint = React.useCallback(() => {
    setHint(null);
    dismissadoAte.current = Date.now() + 10 * 60_000; // 10 minutos de silêncio
    if (somLigado) tocarSom("pop");
  }, [somLigado]);

  const ajudaDoHint = React.useCallback(() => {
    if (!hint) return;
    window.dispatchEvent(new CustomEvent("mozout:slime:pergunta", { detail: hint.pergunta }));
    setPainelAberto(true);
    setExpressao("happy");
    setHint(null);
    dismissadoAte.current = Date.now() + 90_000;
    if (somLigado) tocarSom("pop");
  }, [hint, somLigado]);


  const bochechas = expressao === "happy" || expressao === "proud" || expressao === "surprised";
  const olhosFechados = expressao === "proud" ? 0.62 : expressao === "sleepy" ? 0.55 : 1;

  return (
    <>
      {/* ── Criatura ── */}
      {visivel && (
        <>
          {/* Criatura (+ sombra de contacto) */}
          <motion.div ref={areaRef} className="pointer-events-none fixed left-0 top-0 z-[35]" style={{ x, y }}>
            {/* Sombra de contacto acompanha o passeio; escala com a altura do salto */}
            <motion.div
              aria-hidden
              className="absolute left-1/2 h-4 -translate-x-1/2 rounded-full bg-black/30 blur-[6px]"
              style={{ bottom: -8, width: tamanho * 0.92, scaleX: sombra }}
            />
            <motion.div style={{ y: hop }} className="pointer-events-auto">
              <motion.div
                animate={{ scaleX: 1, scaleY: 1 }}
                style={{ scaleX: squashX, scaleY: squashY, rotate: inclinacao }}
              >
                <button
                  onClick={aoClicar}
                  onPointerEnter={() => {
                    registarInteracao();
                    if (!reduzMovimento) {
                      squashY.set(0.86);
                      squashX.set(1.16);
                      window.setTimeout(() => {
                        squashY.set(1);
                        squashX.set(1);
                      }, 420);
                    }
                  }}
                  aria-label="Mozinha, a assistente do MOZOUT-USD — toca para falar comigo"
                  aria-expanded={painelAberto}
                  className="group relative block touch-manipulation select-none outline-none"
                  style={{ width: tamanho, height: tamanho * 1.07, cursor: "pointer" }}
                >
                  {/* Partículas de gelatina */}
                  <span aria-hidden className="pointer-events-none absolute inset-0">
                    <AnimatePresence>
                      {particulas.map((p) => (
                        <motion.span
                          key={p.id}
                          initial={{ x: tamanho / 2, y: tamanho * 0.42, opacity: 1, scale: 1 }}
                          animate={{ x: tamanho / 2 + p.dx, y: tamanho * 0.42 + p.dy, opacity: 0, scale: 0.25 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.75, delay: p.atraso, ease: "easeOut" }}
                          onAnimationComplete={() => setParticulas((lista) => lista.filter((q) => q.id !== p.id))}
                          className="absolute rounded-full"
                          style={{ width: p.tamanho, height: p.tamanho, background: "radial-gradient(circle at 35% 35%, #d9ff8a, #5fd335)" }}
                        />
                      ))}
                    </AnimatePresence>
                  </span>

                  {/* Respiração suave (CSS) + SVG gelatinoso */}
                  <span className={`block h-full w-full ${reduzMovimento ? "" : "slime-breathe"}`}>
                    <svg viewBox="0 0 120 130" className="h-full w-full drop-shadow-[0_14px_18px_rgb(20_60_25/0.45)] transition-transform duration-200 group-hover:scale-[1.04]" role="img" aria-hidden>
                      <defs>
                        <radialGradient id="slime-body" cx="38%" cy="30%" r="78%">
                          <stop offset="0%" stopColor="#d9ff8a" />
                          <stop offset="38%" stopColor="#9bf040" />
                          <stop offset="72%" stopColor="#4fae28" />
                          <stop offset="100%" stopColor="#2c7a1e" />
                        </radialGradient>
                        <radialGradient id="slime-inner" cx="50%" cy="42%" r="72%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                          <stop offset="70%" stopColor="#1d5c14" stopOpacity="0" />
                          <stop offset="100%" stopColor="#0e3d08" stopOpacity="0.5" />
                        </radialGradient>
                        <radialGradient id="slime-gloss" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="pupil" cx="38%" cy="36%" r="70%">
                          <stop offset="0%" stopColor="#3a5a3f" />
                          <stop offset="45%" stopColor="#16281b" />
                          <stop offset="100%" stopColor="#050c07" />
                        </radialGradient>
                      </defs>

                      {/* Corpo orgânico irregular */}
                      <path
                        d="M60 4C92 4 111 37 111 72c0 30-19.5 51-51 51S9 101.5 9 72C9 32 29 4 60 4Z"
                        fill="url(#slime-body)"
                      />
                      <path d="M60 4C92 4 111 37 111 72c0 30-19.5 51-51 51S9 101.5 9 72C9 32 29 4 60 4Z" fill="url(#slime-inner)" />
                      {/* Brilho gelatinoso */}
                      <ellipse cx="41" cy="31" rx="22" ry="13" fill="url(#slime-gloss)" opacity="0.85" transform="rotate(-14 41 31)" />
                      <ellipse cx="84" cy="52" rx="6.5" ry="10" fill="#ffffff" opacity="0.38" transform="rotate(18 84 52)" />
                      <circle cx="30" cy="82" r="3.1" fill="#ffffff" opacity="0.28" />
                      <circle cx="94" cy="74" r="2.2" fill="#123b1e" opacity="0.3" />
                      <circle cx="24" cy="62" r="1.8" fill="#123b1e" opacity="0.25" />

                      {/* Olho esquerdo */}
                      <motion.g
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                        animate={{ scaleY: aPiscar ? 0.08 : olhosFechados }}
                        transition={{ duration: 0.13, ease: "easeInOut" }}
                      >
                        <ellipse cx="40" cy="62" rx="15" ry="17" fill="#fdfefe" stroke="#0e3d08" strokeOpacity="0.22" />
                        <motion.g style={{ x: pupilaX, y: pupilaY }}>
                          <circle cx="40" cy="63.2" r="7.6" fill="url(#pupil)" />
                          <circle cx="37.6" cy="60.4" r="2.2" fill="#ffffff" opacity="0.95" />
                          <circle cx="43" cy="65.6" r="1.05" fill="#ffffff" opacity="0.7" />
                        </motion.g>
                      </motion.g>
                      {/* Olho direito */}
                      <motion.g
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                        animate={{ scaleY: aPiscar ? 0.08 : olhosFechados }}
                        transition={{ duration: 0.13, ease: "easeInOut", delay: 0.015 }}
                      >
                        <ellipse cx="80" cy="62" rx="15" ry="17" fill="#fdfefe" stroke="#0e3d08" strokeOpacity="0.22" />
                        <motion.g style={{ x: pupilaX, y: pupilaY }}>
                          <circle cx="80" cy="63.2" r="7.6" fill="url(#pupil)" />
                          <circle cx="77.6" cy="60.4" r="2.2" fill="#ffffff" opacity="0.95" />
                          <circle cx="83" cy="65.6" r="1.05" fill="#ffffff" opacity="0.7" />
                        </motion.g>
                      </motion.g>

                      {/* Bochechas quando está alegre */}
                      {bochechas && (
                        <>
                          <ellipse cx="24" cy="80" rx="4.6" ry="2.8" fill="#ff8fb0" opacity="0.55" />
                          <ellipse cx="96" cy="80" rx="4.6" ry="2.8" fill="#ff8fb0" opacity="0.55" />
                        </>
                      )}

                      {/* Boca por expressão */}
                      <Boca expressao={expressao} />

                      {/* Zzz quando adormece */}
                      {expressao === "sleepy" && !reduzMovimento && (
                        <g className="slime-zzz" fill="#2c7a1e" opacity="0.85">
                          <text x="86" y="30" fontSize="13" fontWeight="900" fontFamily="Manrope, sans-serif">z</text>
                          <text x="97" y="18" fontSize="10" fontWeight="900" fontFamily="Manrope, sans-serif">z</text>
                          <text x="105" y="8" fontSize="8" fontWeight="900" fontFamily="Manrope, sans-serif">z</text>
                        </g>
                      )}
                    </svg>
                  </span>
                </button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* ── Balão de ajuda contextual ── */}
          <AnimatePresence>
            {hint && (
              <motion.div
                key={hint.id}
                role="status"
                initial={{ opacity: 0, y: 18, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className="fixed inset-x-2.5 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] z-[44] mx-auto max-w-sm rounded-2xl border border-forest/20 bg-surface p-3 shadow-[0_18px_50px_-18px_rgb(15_42_29/0.5)] sm:inset-x-auto sm:bottom-44 sm:right-6 sm:mx-0"
              >
                <button onClick={dispensarHint} className="absolute right-2 top-2 rounded-full p-1 text-ink/35 hover:text-ink" aria-label="Agora não">
                  <X className="h-4 w-4" />
                </button>
                <p className="flex items-center gap-1.5 pr-6 text-[0.78rem] font-extrabold text-forest"><CircleHelp className="h-4 w-4 shrink-0" />{hint.titulo}</p>
                <p className="mt-1 pr-6 text-[0.78rem] font-medium leading-snug text-ink/75">{hint.texto}</p>
                <button
                  onClick={ajudaDoHint}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-1.5 text-[0.72rem] font-extrabold text-lime transition-colors hover:bg-moss"
                >
                  Ajudar-me
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── Painel de assistência ── */}
      <SlimeAssistant
        aberto={painelAberto}
        onFechar={() => setPainelAberto(false)}
      />
    </>
  );
}
