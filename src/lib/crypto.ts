import crypto from "node:crypto";

const SECRET = process.env.APP_SECRET ?? "mozout-dev-secret-change-me";

function key(): Buffer {
  return crypto.createHash("sha256").update(SECRET).digest();
}

/** Encripta dados sensíveis (nº de cartão, CVV) com AES-256-GCM. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith("enc:v1:")) return payload; // tolera dados legados em texto simples
  const [, , ivB64, tagB64, dataB64] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function tokenAleatorio(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function codigoSeisDigitos(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}
