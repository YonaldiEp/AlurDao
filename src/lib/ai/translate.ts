import "server-only";

import { genreProfiles, type GenreId } from "@/config/genres";
import { AiProviderError } from "./errors";
import type { TranslationRequest, TranslationResult, ExtractedTerm } from "./schema";

type ProviderResult = Omit<TranslationResult, "durationMs">;

const styleInstructions: Record<TranslationRequest["style"], string> = {
  natural:
    "Gunakan prosa Indonesia yang alami, mengalir, dan sesuai tata bahasa (SPOK). Susun ulang klausa agar tidak terdengar seperti terjemahan harfiah, pastikan ejaan sepenuhnya baku sesuai KBBI, bebas dari salah ketik (typo), dan pertahankan sudut pandang asli.",
  dramatic:
    "Gunakan prosa Indonesia yang dramatis dan sinematis secara terkendali. Pertahankan ketegangan sumber tanpa menambah metafora, emosi, atau kejadian baru. Pastikan struktur kalimat (SPOK) tetap kuat.",
  formal:
    "Gunakan bahasa Indonesia baku, rapi, dan elegan. Pilih diksi formal yang tetap wajar sebagai prosa novel (bukan gaya dokumen resmi), dengan tata kalimat (SPOK) yang tertata rapi.",
  light:
    "Gunakan prosa Indonesia yang ringan, lincah, dan mudah dipahami, tetapi TETAP wajib menjaga struktur kalimat SPOK yang lengkap dan logis. Jangan biarkan kalimat menjadi menggantung, janggal, atau berantakan.",
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

  return `Anda adalah penerjemah sekaligus penyunting senior novel China. Genre novel ini adalah ${genre.label} (${genre.hanzi}).

Tugas utama: terjemahkan seluruh teks dari ${input.sourceLanguage} ke ${input.targetLanguage}.

ATURAN WAJIB:
1. Hasil akhir harus sepenuhnya berbahasa Indonesia. DILARANG KERAS menyisipkan kata/istilah bahasa Inggris untuk elemen umum (misalnya: dilarang menulis 'County', 'City', 'Section', 'Chapter', dll; wajib gunakan 'Kabupaten/Wilayah', 'Kota', 'Bagian', 'Bab'). Bahasa Inggris HANYA diperbolehkan untuk nama teknik/jurus/sistem kultivasi jika memang tidak ada padanan bahasa Indonesia yang cocok.
2. Kalimat terjemahan harus mengikuti tata kalimat Indonesia yang baik dan benar (SPOK). Struktur kalimat bahasa Mandarin (seperti kata depan/keterangan yang terbalik atau struktur kalimat pasif yang tidak alami dalam bahasa Indonesia) harus didekonstruksi dan disusun ulang agar mengalir alami di bahasa Indonesia.
3. Utamakan kesepadanan makna dan konteks, bukan terjemahan kata per kata. Jangan menambah, menghapus, merangkum, atau mengarang informasi.
4. Pertahankan urutan paragraf, jeda adegan, dialog, dan judul/bab sesuai sumber. Jangan menciptakan judul atau catatan baru.
5. Pertahankan nama tokoh secara konsisten. Terjemahkan satuan administrasi secara wajar (misalnya 县 menjadi "Kabupaten", 镇 menjadi "Kota Kecamatan/Kota Kecil", 府 menjadi "Kediaman/Keluarga Besar/Pemerintahan" bila konteksnya wilayah).
6. DILARANG KERAS menghilangkan, meringkas, atau melebur detail entitas atau hubungan kekerabatan/keluarga (seperti abang, kakak ipar, paman, bibi, saudara sepupu, dll.) menjadi kata ganti umum (seperti 'mereka', 'ia', 'dia') jika di teks sumber menyebutkan entitas tersebut secara spesifik. Terjemahkan istilah kekerabatan tersebut dengan tepat agar keutuhan informasi tetap terjaga.
7. Untuk nama tempat/benua/negeri yang menggunakan karakter 洲 (zhou), wajib diterjemahkan menjadi 'Benua [Nama Pinyin]' (contoh: 南凰洲 menjadi 'Benua Nanhuang' atau 'Benua Phoenix'). Dilarang keras memotong, memodifikasi, atau menghilangkan huruf konsonan pada nama pinyin (misalnya: dilarang keras memodifikasi 'Nanhuang' menjadi 'Nanhuan').
8. ${styleInstructions[input.style]}
9. ${genre.translationInstruction}

Sebelum menjawab, lakukan penyuntingan akhir secara diam-diam:
- Pastikan setiap kalimat memiliki subjek dan predikat yang jelas, serta rujukan kata gantinya tidak ambigu;
- Pastikan hubungan kekerabatan/keluarga yang spesifik di teks sumber (seperti '兄嫂' - abang dan kakak ipar) diterjemahkan lengkap menjadi subjek/objek yang tepat (misalnya 'keluarga abang dan kakak iparku' atau 'kakak laki-laki dan iparku'), bukan diringkas atau disingkat menjadi kata ganti 'mereka' atau 'mereka semua';
- Singkirkan segala bentuk salah ketik (typo) atau ejaan non-baku (rujuk pada KBBI/EYD);
- Pastikan nama tempat dan nama tokoh tidak tertukar atau mengalami salah terjemah akibat kontaminasi baris lain (contoh: jika sumber menulis '洛水县' (Loshui), jangan terjemahkan menjadi 'Jiangning');
- Baca ulang setiap kalimat sebagai prosa Indonesia dan perbaiki bagian yang terdengar kaku.

Keluarkan hanya teks terjemahan final yang sudah disunting. Jangan tampilkan analisis, komentar, label, atau penjelasan.${glossary}

Teks sumber:
${input.sourceText}`;
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
        temperature: 0.2,
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
        generationConfig: { temperature: 0.2 },
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



function cleanJsonResponse(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

function buildExtractPrompt(sourceText: string, genreLabel: string, genreHanzi: string) {
  return `Anda adalah asisten penerjemah novel Mandarin. Genre novel ini adalah ${genreLabel} (${genreHanzi}). Tugas Anda adalah memindai teks Mandarin berikut dan mengekstrak entitas penting (nama tokoh, nama sekte/faksi, nama tempat/benua, nama teknik/jurus, nama pusaka/item).
        
Untuk setiap entitas yang ditemukan, tentukan:
1. Istilah asli Mandarin (sourceTerm).
2. Cara baca Pinyin (pinyin).
3. Usulan terjemahan Indonesia yang alami (translatedTerm). Wajib ikuti aturan transliterasi:
   - Nama benua/wilayah dengan akhiran 洲 (zhou) diterjemahkan sebagai 'Benua [Pinyin]' (misal: 南凰洲 -> Benua Nanhuang atau Benua Phoenix). Jangan ubah/hilangkan konsonan pinyin asli (misalnya: dilarang keras mengubah 'Nanhuang' menjadi 'Nanhuan').
   - Nama tokoh (character) diterjemahkan sebagai nama pinyin (misal: 林玄 -> Lin Xuan).
4. Kategori entitas (category), wajib salah satu dari: 'character', 'sect', 'realm', 'technique', 'artifact', 'place', 'other'.
5. Catatan singkat konteks (notes) jika diperlukan.

Kembalikan hasil dalam format JSON array saja. Jangan berikan teks penjelasan, analisis, markdown, atau komentar lain di luar JSON. Format JSON harus berupa array objek dengan struktur:
[
  {
    "sourceTerm": "Mandarin",
    "pinyin": "Pinyin",
    "translatedTerm": "Terjemahan Indonesia",
    "category": "character | sect | realm | technique | artifact | place | other",
    "notes": "Penjelasan singkat"
  }
]

Teks sumber:
${sourceText}`;
}

async function openAICompatibleExtract(
  sourceText: string,
  genre: GenreId,
  config: { baseUrl: string; apiKey: string; model: string; provider: string }
): Promise<ExtractedTerm[]> {
  const genreProfile = genreProfiles[genre];
  const prompt = buildExtractPrompt(sourceText, genreProfile.label, genreProfile.hanzi);
  
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
            content: "You are a JSON assistant. Return ONLY valid JSON array and nothing else.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        stream: false,
      }),
    },
    config.provider,
  );

  if (!response.ok) throwForUpstreamResponse(response, config.provider);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Invalid response format from provider");
  }
  try {
    return JSON.parse(cleanJsonResponse(content)) as ExtractedTerm[];
  } catch (err) {
    console.error("Failed to parse extracted JSON:", content, err);
    throw new Error("Gagal mengurai hasil ekstraksi kosakata dari AI.");
  }
}

async function geminiExtract(sourceText: string, genre: GenreId): Promise<ExtractedTerm[]> {
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
  const genreProfile = genreProfiles[genre];
  const prompt = buildExtractPrompt(sourceText, genreProfile.label, genreProfile.hanzi);
  
  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.1,
          responseMimeType: "application/json" 
        },
      }),
    },
    "Gemini",
  );
  if (!response.ok) throwForUpstreamResponse(response, "Gemini");
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
  if (!text) {
    throw new Error("Gemini tidak mengembalikan hasil ekstraksi.");
  }
  try {
    return JSON.parse(cleanJsonResponse(text)) as ExtractedTerm[];
  } catch (err) {
    console.error("Failed to parse extracted JSON from Gemini:", text, err);
    throw new Error("Gagal mengurai hasil ekstraksi kosakata dari Gemini.");
  }
}

function demoExtract(): ExtractedTerm[] {
  return [
    {
      sourceTerm: "南凰洲",
      pinyin: "nán huáng zhōu",
      translatedTerm: "Benua Nanhuang",
      category: "place",
      notes: "Benua legendaris Phoenix Selatan di bagian timur"
    },
    {
      sourceTerm: "林玄",
      pinyin: "lín xuán",
      translatedTerm: "Lin Xuan",
      category: "character",
      notes: "Tokoh utama cerita"
    },
    {
      sourceTerm: "筑基境",
      pinyin: "zhù jī jìng",
      translatedTerm: "Ranah Pendirian Fondasi",
      category: "realm",
      notes: "Tingkatan kultivasi awal"
    }
  ];
}

export async function extractEntities(sourceText: string, genre: GenreId): Promise<ExtractedTerm[]> {
  const provider = (process.env.AI_PROVIDER || "demo").toLowerCase();

  if (provider === "demo") return demoExtract();
  if (provider === "gemini") return geminiExtract(sourceText, genre);
  if (provider === "mistral") {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new AiProviderError("AI_NOT_CONFIGURED", "MISTRAL_API_KEY belum diatur.", 503, "Mistral");
    }
    return openAICompatibleExtract(sourceText, genre, {
      baseUrl: "https://api.mistral.ai/v1",
      apiKey,
      model: process.env.MISTRAL_MODEL || "mistral-small-latest",
      provider: "Mistral",
    });
  }
  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new AiProviderError("AI_NOT_CONFIGURED", "GROQ_API_KEY belum diatur.", 503, "Groq");
    }
    return openAICompatibleExtract(sourceText, genre, {
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey,
      model: process.env.GROQ_MODEL || "qwen/qwen3-32b",
      provider: "Groq",
    });
  }
  if (provider === "ollama") {
    return openAICompatibleExtract(sourceText, genre, {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
      apiKey: "ollama",
      model: process.env.OLLAMA_MODEL || "qwen3:4b",
      provider: "Ollama",
    });
  }

  throw new Error(`Provider AI '${provider}' tidak dikenali.`);
}
