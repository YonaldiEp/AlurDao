import { ZodError } from "zod";
import { AiProviderError } from "@/lib/ai/errors";
import { translationRequestSchema } from "@/lib/ai/schema";
import { translateText } from "@/lib/ai/translate";
import { jsonError, jsonSuccess } from "@/lib/api/response";

function createContext() {
  return { requestId: crypto.randomUUID(), startedAt: Date.now() };
}

export async function POST(request: Request) {
  const context = createContext();

  try {
    const body: unknown = await request.json();
    const input = translationRequestSchema.parse(body);
    const result = await translateText(input);
    return jsonSuccess(result, context);
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
