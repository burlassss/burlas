import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { dataMode } from "./db";

/**
 * Armazenamento de imagens sensíveis (KYC).
 *  · Supabase → bucket privado `kyc` (criado se não existir); devolvido o path.
 *    A app usa caminhos; a visualização no admin usa URLs assinadas de 5 min.
 *  · Demo → data URLs em memória (nada sai do processo; volátil).
 */

const MAX_BYTES = 3 * 1024 * 1024;

export interface ImagemRecebida {
  /** data URL (data:image/...;base64,...) vinda do cliente */
  dataUrl: string;
}

function splitDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;
  return { mime: m[1], buffer };
}

/** Guarda a imagem e devolve o path/URL a persistir no KYC. Lança em caso de erro. */
export async function guardarImagemKyc(userId: string, tipo: string, img: ImagemRecebida): Promise<string> {
  const partes = splitDataUrl(img.dataUrl);
  if (!partes) throw new Error("Imagem inválida. Usa JPEG, PNG ou WebP até 3 MB.");

  if (dataMode() !== "supabase") {
    // Demo: guarda a própria data URL (efémero, nada sai do processo)
    return img.dataUrl;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const s = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const ext = partes.mime === "image/png" ? "png" : partes.mime === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}-${tipo}.${ext}`;

  const upload = () => s.storage.from("kyc").upload(path, partes.buffer, { contentType: partes.mime, upsert: false });
  let { error } = await upload();
  if (error && /not found|Bucket/i.test(error.message)) {
    await s.storage.createBucket("kyc", { public: false }).catch(() => null);
    ({ error } = await upload());
  }
  if (error) throw new Error(`Não foi possível guardar a imagem: ${error.message}`);
  return path;
}

/** URL exibível no painel admin (signed URL no Supabase; data URL em demo). */
export async function urlAssinadaKyc(pathOrDataUrl: string | null): Promise<string | null> {
  if (!pathOrDataUrl) return null;
  if (pathOrDataUrl.startsWith("data:")) return pathOrDataUrl;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  try {
    const s = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await s.storage.from("kyc").createSignedUrl(pathOrDataUrl, 300);
    if (error) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
