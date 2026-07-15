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

async function recordApiEvent(
  request: Request,
  context: ReturnType<typeof createContext>,
  userId: string | null,
  values: { statusCode: number; inputCharacters?: number; outputCharacters?: number; provider?: string; model?: string; errorCode?: string },
) {
  if (!userId) return;
  try {
    const supabase = await createRequestClient(request);
    await supabase.from("api_usage_events").insert({
      user_id: userId,
      request_id: context.requestId,
      endpoint: "/api/translate",
      provider: values.provider || null,
      model: values.model || null,
      status_code: values.statusCode,
      duration_ms: Date.now() - context.startedAt,
      input_characters: values.inputCharacters || 0,
      output_characters: values.outputCharacters || 0,
      error_code: values.errorCode || null,
    });
  } catch (error) {
    console.error(`[api-monitor:${context.requestId}]`, error);
  }
}

export async function POST(request: Request) {
  const context = createContext();
  let quotaReserved = false;
  let eventUserId: string | null = null;
  let eventInputCharacters = 0;

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
    eventUserId = userData.user.id;

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
    eventInputCharacters = inputCharacters;

    // Ambil profil pengguna untuk validasi batas karakter per plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userData.user.id)
      .single();

    const maxAllowed = profile?.plan === "admin" ? 20000 : profile?.plan === "premium" ? 10000 : 5000;
    if (inputCharacters > maxAllowed) {
      await recordApiEvent(request, context, eventUserId, { statusCode: 400, inputCharacters, errorCode: "VALIDATION_ERROR" });
      return jsonError(
        "VALIDATION_ERROR",
        "Data permintaan tidak valid.",
        context,
        400,
        [
          {
            path: "sourceText",
            message: `Paket ${profile?.plan === "admin" ? "Admin" : profile?.plan === "premium" ? "Premium" : "Free"} maksimal ${maxAllowed.toLocaleString("id-ID")} karakter per permintaan.`,
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
      await recordApiEvent(request, context, eventUserId, { statusCode: 429, inputCharacters, errorCode: "QUOTA_EXCEEDED" });
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

    await recordApiEvent(request, context, eventUserId, {
      statusCode: 200,
      inputCharacters,
      outputCharacters: Array.from(result.translation).length,
      provider: result.provider,
      model: result.model,
    });

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
      await recordApiEvent(request, context, eventUserId, { statusCode: 400, inputCharacters: eventInputCharacters, errorCode: "VALIDATION_ERROR" });
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
      await recordApiEvent(request, context, eventUserId, { statusCode: 400, errorCode: "INVALID_JSON" });
      return jsonError("INVALID_JSON", "Body permintaan harus berupa JSON valid.", context, 400);
    }

    if (error instanceof AiProviderError) {
      await recordApiEvent(request, context, eventUserId, { statusCode: error.httpStatus, inputCharacters: eventInputCharacters, provider: error.provider, errorCode: error.code });
      return jsonError(error.code, error.message, context, error.httpStatus, {
        provider: error.provider,
        upstreamStatus: error.upstreamStatus,
      });
    }

    console.error(`[translate:${context.requestId}]`, error);
    await recordApiEvent(request, context, eventUserId, { statusCode: 500, inputCharacters: eventInputCharacters, errorCode: "INTERNAL_ERROR" });
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
