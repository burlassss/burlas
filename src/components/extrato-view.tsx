"use client";

import React from "react";
import { Download, FileText, Printer, FileDown } from "lucide-react";
import { Button, Badge, Modal, EmptyState } from "@/components/ui";
import { MovimentoIcon } from "@/components/movimento";
import { formatDataHora, formatMoeda } from "@/lib/money";
import { TIPO_MOVIMENTO } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface ExtratoItem {
  id: string;
  tipo: string;
  descricao: string;
  valor: number; // unidades
  moeda: string;
  estado: string;
  referencia: string;
  criado_em: string;
}

const FILTROS = [
  { id: "todas", label: "Todas" },
  { id: "deposito", label: "Depósitos" },
  { id: "levantamento", label: "Levantamentos" },
  { id: "compra", label: "Compras" },
  { id: "taxa", label: "Taxas" },
  { id: "reembolso", label: "Reembolsos" },
] as const;

function grupoDe(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(Date.now() - 86400000);
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-MZ", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Maputo" });
}

export function ExtratoView({ nome, itens }: { nome: string; itens: ExtratoItem[] }) {
  const [filtro, setFiltro] = React.useState<(typeof FILTROS)[number]["id"]>("todas");
  const [detalhe, setDetalhe] = React.useState<ExtratoItem | null>(null);

  const filtrados = itens.filter((i) => (filtro === "todas" ? true : i.tipo === filtro || (filtro === "taxa" && (i.tipo === "taxa" || i.tipo === "mensalidade")) || (filtro === "reembolso" && (i.tipo === "reembolso" || i.tipo === "estorno"))));

  const grupos = React.useMemo(() => {
    const map = new Map<string, ExtratoItem[]>();
    for (const item of filtrados) {
      const chave = grupoDe(item.criado_em);
      if (!map.has(chave)) map.set(chave, []);
      map.get(chave)!.push(item);
    }
    return [...map.entries()];
  }, [filtrados]);

  async function exportarPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const largura = doc.internal.pageSize.getWidth();
    doc.setFillColor(22, 60, 43);
    doc.rect(0, 0, largura, 84, "F");
    doc.setTextColor(169, 244, 77);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("MOZOUT-USD", 40, 36);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("Extrato de movimentos", 40, 54);

    doc.setTextColor(18, 31, 22);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Titular: ${nome}`, 40, 110);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })}`, 40, 126);
    doc.text(`Movimentos: ${filtrados.length}`, 40, 142);

    let y = 172;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("DATA", 40, y);
    doc.text("DESCRIÇÃO", 130, y);
    doc.text("REF.", 350, y);
    doc.text("VALOR", largura - 40, y, { align: "right" });
    y += 8;
    doc.setDrawColor(210);
    doc.line(40, y, largura - 40, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    for (const item of filtrados) {
      if (y > 800) { doc.addPage(); y = 48; }
      const data = new Date(item.criado_em).toLocaleDateString("pt-MZ", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Africa/Maputo" });
      const desc = doc.splitTextToSize(item.descricao || TIPO_MOVIMENTO[item.tipo] || item.tipo, 200);
      const valor = `${item.valor >= 0 ? "+" : ""}$${Math.abs(item.valor).toFixed(2)}`;
      doc.text(data, 40, y);
      doc.text(desc, 130, y);
      doc.setFontSize(7);
      doc.text(item.referencia, 350, y);
      doc.setFontSize(8);
      doc.text(valor, largura - 40, y, { align: "right" });
      y += Math.max(14, desc.length * 11 + 5);
    }

    const paginas = doc.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text("MOZOUT-USD, S.A. · Maputo · Extrato gerado automaticamente — não serve como recibo oficial.", 40, 830);
      doc.text(`Página ${p}/${paginas}`, largura - 40, 830, { align: "right" });
    }
    doc.save("mozout-extrato.pdf");
  }

  function exportarCsv() {
    const linhas = [
      ["data", "tipo", "descricao", "valor_usd", "referencia", "estado"].join(";"),
      ...filtrados.map((i) =>
        [new Date(i.criado_em).toISOString(), i.tipo, `"${i.descricao.replace(/"/g, "'")}"`, i.valor.toFixed(2), i.referencia, i.estado].join(";"),
      ),
    ];
    const blob = new Blob(["\ufeff" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mozout-extrato.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pt-1 sm:gap-5 sm:pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest sm:text-3xl">Extrato</h1>
          <p className="mt-1 text-sm font-medium text-ink/55">{filtrados.length} movimento{filtrados.length === 1 ? "" : "s"} · valores em dólares</p>
        </div>
        <div className="print-hidden flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarCsv}><Download className="h-4 w-4" /> CSV</Button>
          <Button variant="dark" size="sm" onClick={exportarPdf}><FileDown className="h-4 w-4" /> PDF</Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()} aria-label="Imprimir"><Printer className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="print-hidden flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por tipo">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-all",
              filtro === f.id ? "bg-forest text-lime" : "border border-mist bg-surface text-ink/60 hover:border-forest hover:text-forest",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Movimentos */}
      {filtrados.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6 text-forest" />} title="Sem movimentos" description="Ainda não há movimentos deste tipo. Quando fizeres um depósito ou compra, aparece tudo aqui." />
      ) : (
        grupos.map(([grupo, items]) => (
          <section key={grupo} aria-label={grupo}>
            <h2 className="sticky top-16 z-10 -mx-1 bg-cream/90 px-1 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-ink/50 backdrop-blur">{grupo}</h2>
            <ul className="divide-y divide-black/5 overflow-hidden rounded-3xl border border-black/5 bg-surface">
              {items.map((item) => {
                const positivo = item.valor >= 0;
                return (
                  <li key={item.id}>
                    <button onClick={() => setDetalhe(item)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-sand/40 sm:px-5">
                      <MovimentoIcon tipo={item.tipo} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink">{item.descricao || TIPO_MOVIMENTO[item.tipo]}</span>
                        <span className="mt-0.5 block text-[0.66rem] font-semibold tabular-nums text-ink/45">{formatDataHora(item.criado_em)} · {item.referencia}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={cn("block text-sm font-extrabold tabular-nums", positivo ? "text-forest" : "text-ink")}>
                          {positivo ? "+" : ""}{formatMoeda(Math.round(item.valor * 100), "USD")}
                        </span>
                        {item.estado !== "confirmado" && <Badge tone="amber" className="mt-0.5">pendente</Badge>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {/* Detalhe */}
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhe do movimento">
        {detalhe && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <MovimentoIcon tipo={detalhe.tipo} />
              <div>
                <p className="font-extrabold text-ink">{detalhe.descricao || TIPO_MOVIMENTO[detalhe.tipo]}</p>
                <p className="text-xs font-semibold text-ink/50">{formatDataHora(detalhe.criado_em)}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Tipo", TIPO_MOVIMENTO[detalhe.tipo] ?? detalhe.tipo],
                ["Estado", detalhe.estado === "confirmado" ? "Confirmado" : detalhe.estado],
                ["Referência", detalhe.referencia],
                ["Moeda", detalhe.moeda],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-2xl bg-sand/60 p-3">
                  <dt className="text-[0.6rem] font-extrabold uppercase tracking-wider text-ink/50">{k}</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs font-bold text-ink">{String(v)}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center justify-between rounded-2xl border border-forest/15 bg-lime-soft p-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-forest/70">Valor</span>
              <span className="text-2xl font-extrabold tabular-nums text-forest">{detalhe.valor >= 0 ? "+" : ""}{formatMoeda(Math.round(detalhe.valor * 100), "USD")}</span>
            </div>
            <p className="text-center text-[0.7rem] font-semibold text-ink/45">Em caso de dúvida, contacta suporte@mozout.co.mz com a referência <span className="font-mono">{detalhe.referencia}</span>.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
