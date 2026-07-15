import { cookies } from "next/headers";
import { z, ZodError } from "zod";
import { genreIds } from "@/config/genres";
import { AiProviderError } from "@/lib/ai/errors";
import { translateText } from "@/lib/ai/translate";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  DEMO_COOKIE_NAME,
  DEMO_DAILY_LIMIT,
  DEMO_MAX_CHARACTERS,
  DEMO_WINDOW_SECONDS,
  demoUsageSnapshot,
  encodeDemoUsage,
  normalizeDemoUsage,
} from "@/lib/demo/usage-cookie";

export const runtime = "nodejs";

const demoRequestSchema = z.object({
  sourceText: z.string().trim().min(1, "Teks sumber tidak boleh kosong.").max(
    DEMO_MAX_CHARACTERS,
    `Demo maksimal ${DEMO_MAX_CHARACTERS} karakter.`,
  ),
  genre: z.enum(genreIds).default("xianxia"),
  style: z.enum(["natural", "dramatic", "formal", "light"]).default("natural"),
});

function createContext() {
  return { requestId: crypto.randomUUID(), startedAt: Date.now() };
}

async function getUsage() {
  const cookieStore = await cookies();
  return {
    cookieStore,
    usage: normalizeDemoUsage(cookieStore.get(DEMO_COOKIE_NAME)?.value),
  };
}

export async function GET() {
  const context = createContext();
  try {
    const { usage } = await getUsage();
    return jsonSuccess({
      ...demoUsageSnapshot(usage),
      maxCharacters: DEMO_MAX_CHARACTERS,
    }, context);
  } catch (error) {
    console.error(`[demo-status:${context.requestId}]`, error);
    return jsonError("DEMO_NOT_CONFIGURED", "Demo belum dikonfigurasi oleh pengelola.", context, 503);
  }
}

export async function POST(request: Request) {
  const context = createContext();

  try {
    const { cookieStore, usage } = await getUsage();
    if (usage.count >= DEMO_DAILY_LIMIT) {
      return jsonError(
        "DEMO_LIMIT_REACHED",
        "Batas demo browser ini sudah habis. Buat akun Free untuk melanjutkan.",
        context,
        429,
        demoUsageSnapshot(usage),
      );
    }

    const body: unknown = await request.json();
    const input = demoRequestSchema.parse(body);
    const result = await translateText({
      ...input,
      sourceLanguage: "Chinese",
      targetLanguage: "Indonesian",
      glossary: [],
    });

    const nextUsage = { count: usage.count + 1, resetAt: usage.resetAt };
    cookieStore.set(DEMO_COOKIE_NAME, encodeDemoUsage(nextUsage), {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: DEMO_WINDOW_SECONDS,
      expires: new Date(nextUsage.resetAt),
    });

    return jsonSuccess({
      ...result,
      demo: demoUsageSnapshot(nextUsage),
    }, context);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(
        "VALIDATION_ERROR",
        "Data demo tidak valid.",
        context,
        400,
        error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      );
    }

    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "Body permintaan harus berupa JSON valid.", context, 400);
    }

    if (error instanceof AiProviderError) {
      return jsonError(error.code, error.message, context, error.httpStatus, {
        provider: error.provider,
        upstreamStatus: error.upstreamStatus,
      });
    }

    console.error(`[demo-translate:${context.requestId}]`, error);
    return jsonError("INTERNAL_ERROR", "Demo gagal memproses terjemahan.", context, 500);
  }
}
