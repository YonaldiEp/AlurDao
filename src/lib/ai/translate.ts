import "server-only";

import { genreProfiles } from "@/config/genres";
import { AiProviderError } from "./errors";
import type { TranslationRequest, TranslationResult } from "./schema";

type ProviderResult = Omit<TranslationResult, "durationMs">;

const styleInstructions: Record<TranslationRequest["style"], string> = {
  natural: "Gunakan bahasa Indonesia natural, mengalir, dan nyaman dibaca.",
  dramatic: "Gunakan bahasa Indonesia dramatis dan sinematis tanpa berlebihan.",
  formal: "Gunakan bahasa Indonesia formal dan rapi.",
  light: "Gunakan bahasa Indonesia ringan, lincah, dan mudah dipahami.",
};

const retryableStatuses = new Set([408, 429, 500, 502, 503, 504]);

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  provider: string,
  timeoutMs = 120_000,
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok || !retryableStatuses.has(response.status) || attempt === maxAttempts) {
        return response;
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
        throw new AiProviderError(
          isTimeout ? "AI_TIMEOUT" : "AI_UPSTREAM_ERROR",
          isTimeout
            ? `${provider} melewati batas waktu pemrosesan.`
            : `${provider} tidak dapat dihubungi.`,
          isTimeout ? 504 : 503,
          provider,
        );
      }
    }

    await sleep(350 * 2 ** (attempt - 1));
  }

  throw new AiProviderError(
    "AI_UPSTREAM_ERROR",
    `${provider} tidak dapat dihubungi.`,
    503,
    provider,
  );
}

function throwForUpstreamResponse(response: Response, provider: string): never {
  if (response.status === 429) {
    throw new AiProviderError(
      "AI_RATE_LIMITED",
      `Batas penggunaan ${provider} sedang tercapai. Coba kembali beberapa saat lagi.`,
      429,
      provider,
      response.status,
    );
  }

  throw new AiProviderError(
    "AI_UPSTREAM_ERROR",
    `${provider} gagal memproses permintaan terjemahan.`,
    502,
    provider,
    response.status,
  );
}

function buildPrompt(input: TranslationRequest) {
  const genre = genreProfiles[input.genre];
  const glossary = input.glossary.length
    ? `\n\nGlosarium wajib:\n${input.glossary
        .map(
          (item) =>
            `- ${item.sourceTerm} = ${item.translatedTerm}${item.notes ? ` (${item.notes})` : ""}`,
        )
        .join("\n")}`
    : "";

  return `Anda adalah penerjemah profesional novel China lintas genre. Genre novel ini adalah ${genre.label} (${genre.hanzi}).\n\nTugas: terjemahkan dari ${input.sourceLanguage} ke ${input.targetLanguage}.\n${styleInstructions[input.style]}\n${genre.translationInstruction}\nPertahankan nama tokoh dan pahami konteks narasi. Jangan menambah penjelasan, catatan, judul, atau teks yang tidak ada pada sumber. Keluarkan hanya hasil terjemahan.${glossary}\n\nTeks sumber:\n${input.sourceText}`;
}

async function openAICompatible(
  input: TranslationRequest,
  config: { baseUrl: string; apiKey: string; model: string; provider: string },
): Promise<ProviderResult> {
  const response = await fetchWithRetry(
    `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "You translate fiction accurately and return only the translated prose.",
          },
          { role: "user", content: buildPrompt(input) },
        ],
        temperature: 0.35,
        stream: false,
      }),
    },
    config.provider,
  );

  if (!response.ok) throwForUpstreamResponse(response, config.provider);

  const data = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string | Array<{ type?: string; text?: string }> };
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  const content = data.choices?.[0]?.message?.content;
  const translation = (typeof content === "string"
    ? content
    : content?.map((part) => part.text ?? "").join("")
  )?.trim();

  if (!translation) {
    throw new AiProviderError(
      "AI_EMPTY_RESPONSE",
      `${config.provider} tidak menghasilkan terjemahan.`,
      502,
      config.provider,
    );
  }

  return {
    translation,
    provider: config.provider,
    model: config.model,
    usage: data.usage
      ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

async function gemini(input: TranslationRequest): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiProviderError(
      "AI_NOT_CONFIGURED",
      "GEMINI_API_KEY belum diatur.",
      503,
      "Gemini",
    );
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: { temperature: 0.35 },
      }),
    },
    "Gemini",
  );
  if (!response.ok) throwForUpstreamResponse(response, "Gemini");
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  const translation = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!translation) {
    throw new AiProviderError(
      "AI_EMPTY_RESPONSE",
      "Gemini tidak menghasilkan terjemahan.",
      502,
      "Gemini",
    );
  }
  return {
    translation,
    provider: "Gemini",
    model,
    usage: data.usageMetadata
      ? {
          inputTokens: data.usageMetadata.promptTokenCount,
          outputTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        }
      : undefined,
  };
}

function demo(input: TranslationRequest): ProviderResult {
  const isSample = input.sourceText.includes("林玄") && input.sourceText.includes("筑基境");
  const translation = isSample
    ? "Lin Xuan perlahan membuka matanya. Energi spiritual di dalam dantiannya bergemuruh deras bagai sungai yang meluap. Ia tahu, akhirnya dirinya berhasil menembus Ranah Pendirian Fondasi. Di luar gua, kabut pagi menyelimuti Puncak Qingyun."
    : `[Mode Demo]\n\n${input.sourceText}\n\nHubungkan Mistral, Gemini, Groq, atau Ollama melalui file .env.local untuk menghasilkan terjemahan AI nyata.`;
  return { translation, provider: "Demo", model: "contoh-lokal" };
}

async function runSelectedProvider(input: TranslationRequest): Promise<ProviderResult> {
  const provider = (process.env.AI_PROVIDER || "demo").toLowerCase();

  if (provider === "demo") return demo(input);
  if (provider === "gemini") return gemini(input);
  if (provider === "mistral") {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new AiProviderError(
        "AI_NOT_CONFIGURED",
        "MISTRAL_API_KEY belum diatur.",
        503,
        "Mistral",
      );
    }
    return openAICompatible(input, {
      baseUrl: "https://api.mistral.ai/v1",
      apiKey,
      model: process.env.MISTRAL_MODEL || "mistral-small-latest",
      provider: "Mistral",
    });
  }
  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new AiProviderError(
        "AI_NOT_CONFIGURED",
        "GROQ_API_KEY belum diatur.",
        503,
        "Groq",
      );
    }
    return openAICompatible(input, {
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey,
      model: process.env.GROQ_MODEL || "qwen/qwen3-32b",
      provider: "Groq",
    });
  }
  if (provider === "ollama") {
    return openAICompatible(input, {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
      apiKey: "ollama",
      model: process.env.OLLAMA_MODEL || "qwen3:4b",
      provider: "Ollama",
    });
  }

  throw new AiProviderError(
    "AI_NOT_CONFIGURED",
    `Provider AI '${provider}' tidak dikenali.`,
    503,
  );
}

export async function translateText(input: TranslationRequest): Promise<TranslationResult> {
  const startedAt = Date.now();
  const result = await runSelectedProvider(input);
  return { ...result, durationMs: Date.now() - startedAt };
}
