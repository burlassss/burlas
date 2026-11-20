import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { guardarImagemKyc } from "@/lib/storage";
import { notificar } from "@/lib/services/notify";
import { estadoKyc } from "@/lib/kyc";

const dataUrl = z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Imagem inválida.").max(6_500_000, "Imagem demasiado grande (máx. ~4 MB).");

const schema = z.object({
  tipo_documento: z.enum(["bi", "passaporte", "carta_conducao"]),
  numero_documento: z.string().trim().regex(/^[A-Za-z0-9-]{5,30}$/, "Número de documento inválido."),
  frente: dataUrl,
  verso: dataUrl.nullable().default(null),
  selfie: dataUrl.nullable().default(null),
});

export async function GET() {
  const user = await requireUser();
  const [estado, ultima] = await Promise.all([estadoKyc(user.id), db.findLatestKycByUser(user.id)]);
  return NextResponse.json({
    estado,
    ultima: ultima ? { id: ultima.id, estado: ultima.estado, criado_em: ultima.criado_em, motivo_recusa: ultima.motivo_recusa } : null,
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const existente = await estadoKyc(user.id);
  if (existente === "verificado") return NextResponse.json({ erro: "A tua identidade já está verificada." }, { status: 409 });
  if (existente === "pendente") return NextResponse.json({ erro: "Já tens uma verificação em análise. Aguarda a decisão." }, { status: 409 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });

  if (parsed.data.tipo_documento !== "passaporte" && !parsed.data.verso) {
    return NextResponse.json({ erro: "Envia a frente e o verso do documento." }, { status: 422 });
  }

  try {
    const [frente, verso, selfie] = await Promise.all([
      guardarImagemKyc(user.id, "frente", { dataUrl: parsed.data.frente }),
      parsed.data.verso ? guardarImagemKyc(user.id, "verso", { dataUrl: parsed.data.verso }) : Promise.resolve(null),
      parsed.data.selfie ? guardarImagemKyc(user.id, "selfie", { dataUrl: parsed.data.selfie }) : Promise.resolve(null),
    ]);
    const sub = await db.insertKycSubmission({
      user_id: user.id,
      tipo_documento: parsed.data.tipo_documento,
      numero_documento: parsed.data.numero_documento.toUpperCase(),
      frente_url: frente,
      verso_url: verso,
      selfie_url: selfie,
    });
    await notificar(user.id, { tipo: "kyc_submetido", titulo: "Documentos recebidos", corpo: "A tua verificação de identidade está em análise. Avisamos-te assim que for decidida." }).catch(() => undefined);
    await db.insertAudit({ ator: user.id, acao: "kyc.submetido", entidade: "kyc_submissions", entidade_id: sub.id, dados: { tipo_documento: sub.tipo_documento } });
    return NextResponse.json({ ok: true, id: sub.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Não foi possível guardar os documentos.";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
