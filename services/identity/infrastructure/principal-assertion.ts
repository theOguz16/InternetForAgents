import { createHmac, timingSafeEqual } from "node:crypto";
import { ROLES, type Principal, type Role } from "../domain/principal.js";

// Personal gateway'i doğrulanmış principal'ı Registry'ye bu imzalı başlıkla iletir.
// Registry kimlik veritabanını görmez; yalnız paylaşılan secret ile imzayı doğrular.
// Bu, E02 servis kimliği gelene kadar en dar köprüdür: imza belirli bir HTTP
// yöntemine, yola ve kısa bir zaman penceresine bağlıdır; başka uca taşınamaz.
export const PRINCIPAL_HEADER = "x-ifa-principal";
export const ASSERTION_MAX_SKEW_MS = 30_000;
export const MIN_SECRET_LENGTH = 32;

interface Payload { sub: string; name: string; role: Role; m: string; p: string; iat: number }
const b64 = (value: string | Buffer) => Buffer.from(value).toString("base64url");
const sign = (secret: string, body: string) => createHmac("sha256", secret).update(`v1.${body}`).digest("base64url");

export function assertSecret(secret: string | undefined): string | undefined {
  if (secret === undefined || secret === "") return undefined;
  if (secret.length < MIN_SECRET_LENGTH) throw new Error("REGISTRY_PRINCIPAL_SECRET en az 32 karakter olmalı");
  return secret;
}

export function signPrincipal(principal: Principal, secret: string, request: { method: string; path: string }, now = Date.now()): string {
  const payload: Payload = { sub: principal.id, name: principal.name, role: principal.role, m: request.method.toUpperCase(), p: request.path, iat: Math.floor(now / 1000) };
  const body = b64(JSON.stringify(payload));
  return `v1.${body}.${sign(secret, body)}`;
}

/** Geçerli imza, aynı yöntem/yol ve zaman penceresi sağlanırsa principal döner; aksi halde undefined. */
export function verifyPrincipal(header: string, secret: string, request: { method: string; path: string }, now = Date.now()): Principal | undefined {
  if (header.length > 2048) return undefined;
  const parts = header.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return undefined;
  const expected = Buffer.from(sign(secret, parts[1]));
  const provided = Buffer.from(parts[2]);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return undefined;
  let payload: Payload;
  try { payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")); } catch { return undefined; }
  if (!payload || typeof payload.sub !== "string" || !payload.sub || typeof payload.name !== "string" || !ROLES.includes(payload.role)
    || payload.m !== request.method.toUpperCase() || payload.p !== request.path || !Number.isInteger(payload.iat)) return undefined;
  if (Math.abs(now - payload.iat * 1000) > ASSERTION_MAX_SKEW_MS) return undefined;
  return { id: payload.sub, name: payload.name, role: payload.role };
}
