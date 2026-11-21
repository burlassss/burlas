"use client";

import React from "react";
import { CheckCircle2, Loader2, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/toast";

type Sender = { sender_id: string; description?: string };
export function NotificaManager({ initial }: { initial: { apiUrl: string; senderId: string; configured: boolean; tokenConfigured: boolean; source: string } }) {
  const { toast } = useToast();
  const [apiUrl, setApiUrl] = React.useState(initial.apiUrl);
  const [senderId, setSenderId] = React.useState(initial.senderId);
  const [token, setToken] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("MOZOUT: teste de envio SMS. Se recebeste esta mensagem, a integração está operacional.");
  const [numbers, setNumbers] = React.useState("");
  const [bulkMessage, setBulkMessage] = React.useState("");
  const [senders, setSenders] = React.useState<Sender[]>([]);
  const [busy, setBusy] = React.useState("");
  const [configurado, setConfigurado] = React.useState(initial.configured);

  async function request(url: string, options?: RequestInit) {
    const r = await fetch(url, options);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.erro ?? "O pedido falhou.");
    return data;
  }
  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setBusy("guardar");
    try { await request("/api/admin/integracoes/notifica", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, apiUrl, senderId }) }); setToken(""); setConfigurado(true); toast("sucesso", "Configuração guardada", "O token foi cifrado e não é mostrado novamente."); }
    catch (e) { toast("erro", "Não foi possível guardar", e instanceof Error ? e.message : undefined); }
    finally { setBusy(""); }
  }
  async function listarSenders() {
    setBusy("senders");
    try { const d = await request("/api/admin/integracoes/notifica/senders"); setSenders(d.senders); toast("sucesso", "Sender IDs carregados", `${d.senders.length} remetente(s) disponíveis.`); }
    catch (e) { toast("erro", "Falha ao obter Sender IDs", e instanceof Error ? e.message : undefined); }
    finally { setBusy(""); }
  }
  async function teste(e: React.FormEvent) {
    e.preventDefault(); setBusy("teste");
    try { const d = await request("/api/admin/integracoes/notifica/teste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero: phone, mensagem: message }) }); toast("sucesso", "SMS de teste enviado", d.simulado ? "Envio simulado: não há token API configurado." : "Pedido aceite pela Notifica."); }
    catch (e) { toast("erro", "Teste falhou", e instanceof Error ? e.message : undefined); }
    finally { setBusy(""); }
  }
  async function campanha(e: React.FormEvent) {
    e.preventDefault();
    const recipients = numbers.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);
    if (!recipients.length || recipients.length > 100) { toast("erro", "Lista inválida", "Adiciona entre 1 e 100 números, separados por linhas ou vírgulas."); return; }
    if (!window.confirm(`Enviar esta mensagem para ${recipients.length} número(s)? Esta ação pode gerar custos na Notifica.`)) return;
    setBusy("campanha");
    try { const d = await request("/api/admin/integracoes/notifica/enviar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numeros: recipients, mensagem: bulkMessage, confirm: true }) }); const sucesso = d.resultados.filter((r: {ok:boolean}) => r.ok).length; toast(d.ok ? "sucesso" : "erro", `Campanha: ${sucesso}/${d.resultados.length} enviados`, d.resultados.filter((r: {ok:boolean}) => !r.ok).map((r: {numero:string;erro?:string}) => `${r.numero}: ${r.erro ?? "falhou"}`).join(" · ") || undefined); }
    catch (e) { toast("erro", "Campanha falhou", e instanceof Error ? e.message : undefined); }
    finally { setBusy(""); }
  }
  const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-forest px-4 text-sm font-extrabold text-white hover:bg-moss disabled:opacity-50";
  const input = "mt-1 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-forest";
  return <div className="grid gap-4 xl:grid-cols-2">
    <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-soft text-forest"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-extrabold text-ink">Configuração da API Notifica</h2><p className="text-xs font-semibold text-ink/55">{configurado ? `Token configurado · fonte: ${initial.source === "environment" ? "ambiente" : "painel"}` : "Ainda não configurada"}</p></div></div>
      <form onSubmit={guardar} className="mt-4 flex flex-col gap-3">
        <label className="text-xs font-extrabold text-ink/65">Token API <input className={input} type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={initial.tokenConfigured ? "Token guardado (em branco mantém o atual)" : "Cola o token de serviço Notifica"} autoComplete="new-password" /></label>
        <label className="text-xs font-extrabold text-ink/65">Endpoint SMS <input className={input} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} /></label>
        <label className="text-xs font-extrabold text-ink/65">Sender ID <div className="flex gap-2"><input className={input + " mt-1"} value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="Sender ID aprovado na Notifica" /><button type="button" onClick={() => void listarSenders()} disabled={!!busy} className={btn + " mt-1 shrink-0 px-3"} title="Buscar Sender IDs"><RefreshCw className={`h-4 w-4 ${busy === "senders" ? "animate-spin" : ""}`} /></button></div></label>
        {senders.length > 0 && <div className="flex flex-wrap gap-2 text-xs">{senders.map((s) => <button key={s.sender_id} type="button" onClick={() => setSenderId(s.sender_id)} className="rounded-full border border-forest/20 bg-lime-soft px-3 py-1.5 font-bold text-forest">{s.sender_id}{s.description ? ` · ${s.description}` : ""}</button>)}</div>}
        <p className="text-[0.7rem] font-medium text-ink/50">Token cifrado no servidor e nunca enviado de volta ao navegador. Se já existe variável de ambiente, ela tem precedência.</p>
        <button className={btn} disabled={!!busy}><CheckCircle2 className="h-4 w-4" />{busy === "guardar" ? "A guardar…" : "Guardar configuração"}</button>
      </form>
    </section>
    <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="font-extrabold text-ink">Testar envio individual</h2><p className="mt-1 text-xs font-medium text-ink/55">Envia uma mensagem real para o número indicado.</p>
      <form onSubmit={teste} className="mt-4 flex flex-col gap-3"><label className="text-xs font-extrabold text-ink/65">Número internacional<input required className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258841234567" /></label><label className="text-xs font-extrabold text-ink/65">Mensagem<textarea required maxLength={1600} className="mt-1 min-h-24 w-full rounded-xl border border-black/10 bg-white p-3 text-sm font-medium outline-none focus:border-forest" value={message} onChange={(e) => setMessage(e.target.value)} /></label><button className={btn} disabled={!!busy}><Send className="h-4 w-4" />{busy === "teste" ? "A enviar…" : "Enviar teste"}</button></form>
    </section>
    <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm sm:col-span-2 sm:p-6">
      <h2 className="font-extrabold text-ink">Envio em massa</h2><p className="mt-1 text-xs font-medium text-ink/55">Lista manual até 100 números por campanha. Um número por linha ou separados por vírgula. O envio pode gerar custos na Notifica.</p>
      <form onSubmit={campanha} className="mt-4 grid gap-3 lg:grid-cols-2"><label className="text-xs font-extrabold text-ink/65">Destinatários<textarea required className="mt-1 min-h-36 w-full rounded-xl border border-black/10 bg-white p-3 font-mono text-sm outline-none focus:border-forest" value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder={"+258841234567\n+258821234567"} /></label><div className="flex flex-col"><label className="text-xs font-extrabold text-ink/65">Mensagem<textarea required maxLength={1600} className="mt-1 min-h-36 w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none focus:border-forest" value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} placeholder="Escreve o conteúdo da campanha…" /></label><p className="mt-2 text-xs font-bold text-ink/50">Destinatários: {numbers.split(/[\n,;]+/).filter((n) => n.trim()).length}/100 · {bulkMessage.length}/1600</p><button className={btn + " mt-3 self-start"} disabled={!!busy}><Send className="h-4 w-4" />{busy === "campanha" ? <><Loader2 className="h-4 w-4 animate-spin" />A enviar campanha…</> : "Rever e enviar campanha"}</button></div></form>
    </section>
  </div>;
}
