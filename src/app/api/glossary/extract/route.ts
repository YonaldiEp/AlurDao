import { z, ZodError } from "zod";
import { genreIds } from "@/config/genres";
import { extractEntities } from "@/lib/ai/translate";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createRequestClient } from "@/lib/supabase/server";

const extractRequestSchema = z.object({
  sourceText: z.string().trim().min(1, "Teks sumber tidak boleh kosong.").max(20000, "Maksimal 20.000 karakter per permintaan."),
  genre: z.enum(genreIds).default("xianxia"),
});

function createContext() {
  return { requestId: crypto.randomUUID(), startedAt: Date.now() };
}

export async function POST(request: Request) {
  const context = createContext();

  try {
    const supabase = await createRequestClient(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return jsonError(
        "AUTH_REQUIRED",
        "Masuk ke akun untuk menggunakan fitur ekstraksi kosakata.",
        context,
        401,
      );
    }

    const body: unknown = await request.json();
    const input = extractRequestSchema.parse(body);

    const terms = await extractEntities(input.sourceText, input.genre);

    return jsonSuccess({ terms, count: terms.length }, context);
  } catch (error) {
    if (error instanceof ZodError) {
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

    console.error(`[glossary-extract:${context.requestId}]`, error);
    return jsonError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Terjadi kesalahan internal saat mengekstrak kosakata.",
      context,
      500,
    );
  }
}
