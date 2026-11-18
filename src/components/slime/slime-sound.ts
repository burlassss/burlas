/** Sons WebAudio sintetizados — leves, sem ficheiros. Desativados por omissão. */

let ctx: AudioContext | null = null;
function contexto(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export type SomSlime = "pop" | "boing" | "erro" | "sucesso" | "abrir" | "z";

export function tocarSom(tipo: SomSlime) {
  const ac = contexto();
  if (!ac) return;
  const agora = ac.currentTime;

  const nota = (freq: number, inicio: number, dur: number, ganho = 0.18, onda: OscillatorType = "sine") => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = onda;
    osc.frequency.setValueAtTime(freq, agora + inicio);
    gain.gain.setValueAtTime(0.0001, agora + inicio);
    gain.gain.exponentialRampToValueAtTime(ganho, agora + inicio + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, agora + inicio + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(agora + inicio);
    osc.stop(agora + inicio + dur + 0.02);
  };

  switch (tipo) {
    case "pop":
      nota(620, 0, 0.12, 0.22, "triangle");
      nota(880, 0.03, 0.14, 0.18, "sine");
      break;
    case "boing":
      nota(220, 0, 0.16, 0.2, "sine");
      nota(330, 0.07, 0.18, 0.16, "sine");
      break;
    case "erro":
      nota(196, 0, 0.16, 0.16, "square");
      nota(147, 0.15, 0.22, 0.14, "square");
      break;
    case "sucesso":
      nota(523, 0, 0.12, 0.2, "sine");
      nota(659, 0.08, 0.12, 0.2, "sine");
      nota(784, 0.16, 0.18, 0.22, "sine");
      break;
    case "abrir":
      nota(392, 0, 0.1, 0.18, "triangle");
      nota(587, 0.06, 0.14, 0.2, "triangle");
      break;
    case "z":
      nota(130, 0, 0.5, 0.08, "sine");
      break;
  }
}
