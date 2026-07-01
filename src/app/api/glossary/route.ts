import { z, ZodError } from "zod";
import { genreIds } from "@/config/genres";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

const glossaryQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  genre: z.enum(genreIds).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

function createContext() {
  return { requestId: crypto.randomUUID(), startedAt: Date.now() };
}

export async function GET(request: Request) {
  const context = createContext();

  try {
    const searchParams = Object.fromEntries(new URL(request.url).searchParams);
    const query = glossaryQuerySchema.parse(searchParams);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_glossary", {
      search_query: query.q || null,
      genre_filter: query.genre || null,
      result_limit: query.limit,
    });

    if (error) {
      console.error(`[glossary:${context.requestId}]`, error.message);
      return jsonError(
        "DATABASE_ERROR",
        "Bank kosakata tidak dapat dimuat.",
        context,
        500,
      );
    }

    const terms = data ?? [];
    return jsonSuccess({ terms, count: terms.length }, context);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(
        "VALIDATION_ERROR",
        "Parameter pencarian tidak valid.",
        context,
        400,
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }

    console.error(`[glossary:${context.requestId}]`, error);
    return jsonError(
      "INTERNAL_ERROR",
      "Terjadi kesalahan internal saat memuat bank kosakata.",
      context,
      500,
    );
  }
}
