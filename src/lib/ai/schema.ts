import { z } from "zod";
import { genreIds } from "@/config/genres";

export const glossaryItemSchema = z.object({
  sourceTerm: z.string().trim().min(1).max(120),
  translatedTerm: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(300).optional(),
});

export const translationRequestSchema = z.object({
  chapterId: z.string().uuid().optional(),
  sourceText: z.string().trim().min(1, "Teks sumber tidak boleh kosong.").max(20_000, "Maksimal 20.000 karakter per permintaan."),
  sourceLanguage: z.string().trim().default("Chinese"),
  targetLanguage: z.string().trim().default("Indonesian"),
  genre: z.enum(genreIds).default("xianxia"),
  style: z.enum(["natural", "dramatic", "formal", "light"]).default("natural"),
  glossary: z.array(glossaryItemSchema).max(200).default([]),
});

export type TranslationRequest = z.infer<typeof translationRequestSchema>;

export type TranslationResult = {
  translation: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  durationMs: number;
};

export interface ExtractedTerm {
  sourceTerm: string;
  pinyin: string;
  translatedTerm: string;
  category: "character" | "sect" | "realm" | "technique" | "artifact" | "place" | "other";
  notes?: string;
}
