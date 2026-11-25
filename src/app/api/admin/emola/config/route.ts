import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import {
  configuracaoEmola,
  EMOLA_API_URL_PADRAO,
  guardarApiKeyEmola,
  guardarConfigEmola,
  normalizarTelefoneEmola,
} from "@/lib/integrations/emola";

const schema = z.object({
  ativo: z.boolean().optional(),
  apiUrl: z.string().trim().url("URL inválida.").max(300).optional(),
  /** Deixar inalterado omitindo o campo; string vazia limpa a chave. */
  apiKey: z.string().trim().max(300).optional(),
  destino: z.string().trim().min(8).max(20).optional(),
  drainMode: z.boolean().optional(),
  demoSaldo: z.number().min(0).max(10_000_000).optional(),
});

/** GET — configuração actual do gateway e-Mola (chave nunca sai em claro). */
export async function GET() {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "emola.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const config = await configuracaoEmola();
  return NextResponse.json({
    ativo: config.ativo,
    apiUrl: config.apiUrl,
    apiUrlPadrao: EMOLA_API_URL_PADRAO,
    apiKeyMask: config.apiKeyMask,
    temApiKey: !!config.apiKey,
    destino: config.destino,
    drainMode: config.drainMode,
    demoSaldo: config.demoSaldo,
    simulado: config.simulado,
  });
}

/** PUT — actualiza a configuração (URL, chave, destino, drain mode…). */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "emola.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
  const d = parsed.data;

  try {
    if (d.ativo !== undefined) await guardarConfigEmola("ativo", d.ativo ? "true" : "false");
    if (d.apiUrl !== undefined) await guardarConfigEmola("apiUrl", d.apiUrl);
    if (d.destino !== undefined) {
      const destino = normalizarTelefoneEmola(d.destino);
      if (!/^258\d{9}$/.test(destino)) return NextResponse.json({ erro: "Número destino inválido. Usa 25884xxxxxxx." }, { status: 422 });
      await guardarConfigEmola("destino", destino);
    }
    if (d.drainMode !== undefined) await guardarConfigEmola("drain", d.drainMode ? "true" : "false");
    if (d.demoSaldo !== undefined) await guardarConfigEmola("demoSaldo", String(d.demoSaldo));
    if (d.apiKey !== undefined) await guardarApiKeyEmola(d.apiKey);

    const { db } = await import("@/lib/db");
    await db.insertAudit({
      ator: admin.id,
      acao: "emola.config_alterada",
      entidade: "settings",
      entidade_id: null,
      dados: {
        ativo: d.ativo,
        destino: d.destino,
        drain_mode: d.drainMode,
        api_url: d.apiUrl,
        api_key_alterada: d.apiKey !== undefined,
      },
    });

    const config = await configuracaoEmola();
    return NextResponse.json({
      ok: true,
      ativo: config.ativo,
      apiUrl: config.apiUrl,
      apiKeyMask: config.apiKeyMask,
      temApiKey: !!config.apiKey,
      destino: config.destino,
      drainMode: config.drainMode,
      demoSaldo: config.demoSaldo,
      simulado: config.simulado,
    });
  } catch (err) {
    console.error("[admin/emola/config PUT]", err);
    return NextResponse.json({ erro: "Não foi possível guardar a configuração." }, { status: 500 });
  }
}
