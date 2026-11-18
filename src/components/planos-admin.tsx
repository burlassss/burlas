"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Power, Star, ShoppingBag, Repeat2, Plane, Loader2, Check } from "lucide-react";
import { Button, Modal, Input, Label, Select, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/db/types";

const ICONE: Record<string, React.ElementType> = { shopping: ShoppingBag, repeat: Repeat2, plane: Plane };
const ICONES_DISPONIVEIS = ["shopping", "repeat", "plane"];

export function PlanosAdmin({ planos }: { planos: Plan[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editando, setEditando] = React.useState<Plan | null>(null);
  const [criando, setCriando] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function salvar(plano: Partial<Plan> & { id?: string }) {
    setBusy(plano.id ?? "novo");
    try {
      const url = plano.id ? `/api/admin/planos/${plano.id}` : "/api/admin/planos";
      const method = plano.id ? "PATCH" : "POST";
      const resp = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(plano) });
      const data = await resp.json();
      if (!resp.ok) { toast("erro", "Não foi possível guardar o plano", data.erro); return; }
      toast("sucesso", plano.id ? "Plano atualizado" : "Plano criado");
      setEditando(null);
      setCriando(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function alternarAtivo(plano: Plan) {
    setBusy(`ativo:${plano.id}`);
    try {
      await fetch(`/api/admin/planos/${plano.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !plano.ativo }) });
      toast("sucesso", plano.ativo ? "Plano desativado" : "Plano ativado");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function destacar(plano: Plan) {
    setBusy(`dest:${plano.id}`);
    try {
      await fetch(`/api/admin/planos/${plano.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destaque: !plano.destaque }) });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink/55">{planos.filter((p) => p.ativo).length} de {planos.length} planos ativos</p>
        <Button variant="dark" size="sm" onClick={() => setCriando(true)}><Plus className="h-4 w-4" /> Novo plano</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {planos.map((plano) => {
          const Icone = ICONE[plano.icone] ?? ShoppingBag;
          return (
            <article key={plano.id} className={cn("flex flex-col rounded-3xl border p-5", plano.ativo ? "border-black/5 bg-surface" : "border-dashed border-mist bg-sand/40 opacity-75")}>
              <div className="flex items-start justify-between gap-2">
                <Icone className="h-7 w-7 text-forest" strokeWidth={1.7} />
                <div className="flex items-center gap-1.5">
                  <button onClick={() => destacar(plano)} disabled={busy === `dest:${plano.id}`} title={plano.destaque ? "Remover destaque" : "Destacar"} className="rounded-lg p-2 hover:bg-sand" aria-label="Destacar plano">
                    <Star className={cn("h-4 w-4", plano.destaque ? "fill-amber-400 text-amber-500" : "text-ink/30")} />
                  </button>
                  <button onClick={() => alternarAtivo(plano)} disabled={busy === `ativo:${plano.id}`} title={plano.ativo ? "Desativar" : "Ativar"} className="rounded-lg p-2 hover:bg-sand" aria-label="Ativar ou desativar">
                    {busy === `ativo:${plano.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className={cn("h-4 w-4", plano.ativo ? "text-forest" : "text-ink/35")} />}
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-tight text-ink">{plano.nome}</h3>
                {!plano.ativo && <Badge tone="zinc">Inativo</Badge>}
                {plano.destaque && <Badge tone="amber">Destaque</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-xs font-medium text-ink/55">{plano.descricao}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.72rem] font-semibold text-ink/70">
                <div className="flex justify-between gap-2"><dt>Ativação</dt><dd className="tabular-nums">${plano.taxa_ativacao_usd}</dd></div>
                <div className="flex justify-between gap-2"><dt>Mensalidade</dt><dd className="tabular-nums">${plano.mensalidade_usd}</dd></div>
                <div className="flex justify-between gap-2"><dt>Limite gastos</dt><dd className="tabular-nums">${plano.limite_gasto_usd.toLocaleString()}</dd></div>
                <div className="flex justify-between gap-2"><dt>Validade</dt><dd className="tabular-nums">{plano.validade_meses} meses</dd></div>
              </dl>
              <Button variant="outline" size="sm" className="mt-4 self-start" onClick={() => setEditando(plano)}><Pencil className="h-4 w-4" /> Editar plano</Button>
            </article>
          );
        })}
      </div>

      {(editando || criando) && (
        <FormularioPlano
          titulo={editando ? `Editar — ${editando.nome}` : "Novo plano"}
          inicial={editando}
          onClose={() => { setEditando(null); setCriando(false); }}
          onSalvar={salvar}
          busy={!!busy}
        />
      )}
    </div>
  );
}

function FormularioPlano({
  titulo, inicial, onClose, onSalvar, busy,
}: {
  titulo: string;
  inicial: Plan | null;
  onClose: () => void;
  onSalvar: (p: Partial<Plan> & { id?: string }) => void;
  busy: boolean;
}) {
  const [form, setForm] = React.useState({
    id: inicial?.id,
    nome: inicial?.nome ?? "",
    slug: inicial?.slug ?? "",
    tipo: inicial?.tipo ?? "compras",
    descricao: inicial?.descricao ?? "",
    taxa_ativacao_usd: String(inicial?.taxa_ativacao_usd ?? 10),
    mensalidade_usd: String(inicial?.mensalidade_usd ?? 2.5),
    limite_gasto_usd: String(inicial?.limite_gasto_usd ?? 2000),
    limite_carga_usd: String(inicial?.limite_carga_usd ?? 5000),
    validade_meses: String(inicial?.validade_meses ?? 36),
    icone: inicial?.icone ?? "shopping",
    cor: inicial?.cor ?? "from-[#101f16] via-[#173a29] to-[#0b241a]",
    beneficios: (Array.isArray(inicial?.beneficios) ? inicial.beneficios : []).join("\n"),
    ordem: String(inicial?.ordem ?? 1),
  });

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    onSalvar({
      id: form.id,
      nome: form.nome,
      ...(form.id ? {} : { slug: form.slug, tipo: form.tipo as Plan["tipo"] }),
      descricao: form.descricao,
      taxa_ativacao_usd: Number(form.taxa_ativacao_usd) || 0,
      mensalidade_usd: Number(form.mensalidade_usd) || 0,
      limite_gasto_usd: Number(form.limite_gasto_usd) || 1,
      limite_carga_usd: Number(form.limite_carga_usd) || 1,
      validade_meses: Number(form.validade_meses) || 36,
      ordem: Number(form.ordem) || 10,
      icone: form.icone,
      cor: form.cor,
      beneficios: form.beneficios.split("\n").map((b) => b.trim()).filter(Boolean),
    });
  }

  return (
    <Modal open onClose={onClose} title={titulo} size="lg">
      <form onSubmit={submeter} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="nome">Nome do plano</Label><Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
        {!form.id && (
          <>
            <div><Label htmlFor="slug">Slug</Label><Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="ex.: compras-online" required /></div>
            <div><Label htmlFor="tipo">Tipo</Label><Select id="tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Plan["tipo"] })}><option value="compras">Compras online</option><option value="assinaturas">Assinaturas</option><option value="viagem">Viagem</option></Select></div>
          </>
        )}
        <div className="sm:col-span-2"><Label htmlFor="desc">Descrição</Label><Input id="desc" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div><Label htmlFor="ativ" hint="USD">Taxa de ativação</Label><Input id="ativ" inputMode="decimal" type="number" min={0} step="0.01" value={form.taxa_ativacao_usd} onChange={(e) => setForm({ ...form, taxa_ativacao_usd: e.target.value })} /></div>
        <div><Label htmlFor="mens" hint="USD/mês">Mensalidade</Label><Input id="mens" inputMode="decimal" type="number" min={0} step="0.01" value={form.mensalidade_usd} onChange={(e) => setForm({ ...form, mensalidade_usd: e.target.value })} /></div>
        <div><Label htmlFor="gasto" hint="USD/mês">Limite de gastos</Label><Input id="gasto" type="number" min={1} value={form.limite_gasto_usd} onChange={(e) => setForm({ ...form, limite_gasto_usd: e.target.value })} /></div>
        <div><Label htmlFor="carga" hint="USD">Limite de carregamento</Label><Input id="carga" type="number" min={1} value={form.limite_carga_usd} onChange={(e) => setForm({ ...form, limite_carga_usd: e.target.value })} /></div>
        <div><Label htmlFor="valid" hint="meses">Validade</Label><Input id="valid" type="number" min={1} value={form.validade_meses} onChange={(e) => setForm({ ...form, validade_meses: e.target.value })} /></div>
        <div><Label htmlFor="ordem">Ordem</Label><Input id="ordem" type="number" min={0} value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label htmlFor="icone">Ícone</Label><Select id="icone" value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })}>{ICONES_DISPONIVEIS.map((i) => <option key={i} value={i}>{i}</option>)}</Select></div>
        <div className="sm:col-span-2"><Label htmlFor="benef" hint="um por linha">Benefícios</Label><textarea id="benef" value={form.beneficios} onChange={(e) => setForm({ ...form, beneficios: e.target.value })} rows={4} className="w-full rounded-2xl border-2 border-mist bg-surface p-3 text-sm font-medium focus:border-forest focus:outline-none" /></div>
        <Button type="submit" loading={busy} className="sm:col-span-2" size="lg"><Check className="h-5 w-5" /> Guardar alterações</Button>
      </form>
    </Modal>
  );
}
