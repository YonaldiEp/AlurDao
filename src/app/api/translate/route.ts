import { ZodError } from "zod";
import { AiProviderError } from "@/lib/ai/errors";
import { translationRequestSchema } from "@/lib/ai/schema";
import { translateText } from "@/lib/ai/translate";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createRequestClient } from "@/lib/supabase/server";

type QuotaSnapshot = {
  allowed: boolean;
  unlimited: boolean;
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
};

function createContext() {
  return { requestId: crypto.randomUUID(), startedAt: Date.now() };
}

export async function POST(request: Request) {
  const context = createContext();
  let quotaReserved = false;

  try {
    const supabase = await createRequestClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return jsonError(
        "AUTH_REQUIRED",
        "Masuk ke akun untuk menggunakan fitur terjemahan.",
        context,
        401,
      );
    }

    const body: unknown = await request.json();
    const input = translationRequestSchema.parse(body);

    if (input.chapterId) {
      const { data: chapter, error: chapterError } = await supabase
        .from("chapters")
        .select("id")
        .eq("id", input.chapterId)
        .maybeSingle();
      if (chapterError || !chapter) {
        return jsonError(
          "CHAPTER_FORBIDDEN",
          "Bab tidak ditemukan atau bukan milik akun ini.",
          context,
          403,
        );
      }
    }

    const inputCharacters = Array.from(input.sourceText).length;

    // Ambil profil pengguna untuk validasi batas karakter per plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userData.user.id)
      .single();

    const maxAllowed = profile?.plan === "admin" ? 20000 : 5000;
    if (inputCharacters > maxAllowed) {
      return jsonError(
        "VALIDATION_ERROR",
        "Data permintaan tidak valid.",
        context,
        400,
        [
          {
            path: "sourceText",
            message: `Paket ${profile?.plan === "admin" ? "Admin" : "Free"} maksimal ${maxAllowed.toLocaleString("id-ID")} karakter per permintaan.`,
          },
        ],
      );
    }

    const { data: quotaData, error: quotaError } = await supabase.rpc(
      "reserve_translation_quota",
      {
        reservation_id: context.requestId,
        requested_characters: inputCharacters,
      },
    );
    if (quotaError) throw quotaError;

    const quota = quotaData as QuotaSnapshot;
    if (!quota.allowed) {
      return jsonError(
        "QUOTA_EXCEEDED",
        "Kuota terjemahan bulanan paketmu telah habis.",
        context,
        429,
        quota,
      );
    }
    quotaReserved = true;

    const result = await translateText(input);
    await supabase.rpc("complete_translation_quota", {
      reservation_id: context.requestId,
    });
    quotaReserved = false;

    if (input.chapterId) {
      const { error: historyError } = await supabase.from("translation_runs").insert({
        chapter_id: input.chapterId,
        provider: result.provider,
        model: result.model,
        input_characters: inputCharacters,
        output_characters: Array.from(result.translation).length,
        duration_ms: result.durationMs,
        status: "completed",
      });
      if (historyError) {
        console.error(`[translate-history:${context.requestId}]`, historyError.message);
      }
    }

    return jsonSuccess({ ...result, quota }, context);
  } catch (error) {
    if (quotaReserved) {
      try {
        const supabase = await createRequestClient(request);
        await supabase.rpc("refund_translation_quota", {
          reservation_id: context.requestId,
        });
      } catch (refundError) {
        console.error(`[translate-refund:${context.requestId}]`, refundError);
      }
    }

    if (error instanceof ZodError) {
      console.error(`[translate-validation:${context.requestId}]`, JSON.stringify(error.format(), null, 2));
      return jsonError(
        "VALIDATION_ERROR",
        "Data permintaan tidak valid.",
        context,
        400,
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
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

    console.error(`[translate:${context.requestId}]`, error);
    return jsonError(
      "INTERNAL_ERROR",
      "Terjadi kesalahan internal saat menerjemahkan.",
      context,
      500,
    );
  }
}

export async function GET() {
  const context = createContext();
  return jsonError(
    "METHOD_NOT_ALLOWED",
    "Gunakan metode POST untuk menerjemahkan teks.",
    context,
    405,
  );
}
