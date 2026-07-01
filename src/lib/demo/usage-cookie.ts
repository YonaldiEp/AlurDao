import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_COOKIE_NAME = "alurdao_demo_usage_v1";
export const DEMO_DAILY_LIMIT = 2;
export const DEMO_MAX_CHARACTERS = 500;
export const DEMO_WINDOW_SECONDS = 24 * 60 * 60;

export type DemoUsage = {
  count: number;
  resetAt: number;
};

function getSecret() {
  const secret = process.env.DEMO_COOKIE_SECRET
    || process.env.MISTRAL_API_KEY
    || process.env.GEMINI_API_KEY
    || process.env.GROQ_API_KEY;

  if (!secret) {
    throw new Error("DEMO_COOKIE_SECRET belum diatur untuk membatasi penggunaan demo.");
  }

  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function encodeDemoUsage(usage: DemoUsage) {
  const payload = Buffer.from(JSON.stringify(usage), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeDemoUsage(value: string | undefined): DemoUsage | null {
  if (!value) return null;

  try {
    const [payload, signature] = value.split(".");
    if (!payload || !signature) return null;

    const actual = Buffer.from(signature, "base64url");
    const expected = Buffer.from(sign(payload), "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<DemoUsage>;
    if (!Number.isInteger(parsed.count) || !Number.isFinite(parsed.resetAt)) return null;
    if ((parsed.count ?? -1) < 0 || (parsed.resetAt ?? 0) <= 0) return null;

    return { count: parsed.count as number, resetAt: parsed.resetAt as number };
  } catch {
    return null;
  }
}

export function normalizeDemoUsage(value: string | undefined, now = Date.now()): DemoUsage {
  const decoded = decodeDemoUsage(value);
  if (!decoded || decoded.resetAt <= now) {
    return { count: 0, resetAt: now + DEMO_WINDOW_SECONDS * 1000 };
  }
  return decoded;
}

export function demoUsageSnapshot(usage: DemoUsage) {
  return {
    limit: DEMO_DAILY_LIMIT,
    used: usage.count,
    remaining: Math.max(DEMO_DAILY_LIMIT - usage.count, 0),
    resetAt: new Date(usage.resetAt).toISOString(),
  };
}
