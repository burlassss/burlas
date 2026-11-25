-- 0008 · PIN temporário cifrado da sessão e-Mola.
-- Necessário para o reenvio de OTP (POST /api/v1/otp outra vez) quando o
-- código expira ou é substituído por um SMS mais recente. O PIN é cifrado
-- com APP_SECRET e apagado no momento do login — nunca fica em claro nem
-- sobrevive à autenticação.

alter table public.emola_sessions
  add column if not exists pin_enc text;
