const genres = ["xianxia", "xuanhuan", "wuxia", "qihuan", "mohuan", "kehuan"];
const styles = ["natural", "dramatic", "formal", "light"];

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "AlurDao API",
    version: "0.1.0",
    description: "API untuk terjemahan novel China, demo publik, glosarium, ekstraksi istilah, dan pembayaran Premium AlurDao.",
  },
  servers: [{ url: "/", description: "Server AlurDao saat ini" }],
  tags: [
    { name: "Translation", description: "Terjemahan dengan kuota pengguna." },
    { name: "Demo", description: "Demo publik dengan batas cookie browser." },
    { name: "Glossary", description: "Bank istilah dan ekstraksi glosarium." },
    { name: "Billing", description: "Checkout Premium dan webhook Midtrans." },
    { name: "Documentation", description: "Spesifikasi OpenAPI." },
  ],
  paths: {
    "/api/translate": {
      post: {
        tags: ["Translation"],
        summary: "Terjemahkan teks novel",
        description: "Memerlukan sesi Supabase. Kuota dicadangkan sebelum provider AI dipanggil dan dikembalikan jika provider gagal.",
        security: [{ SupabaseBearer: [] }, { SupabaseSession: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TranslationRequest" } } },
        },
        responses: {
          "200": { description: "Terjemahan berhasil", content: { "application/json": { schema: { $ref: "#/components/schemas/TranslationSuccess" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { description: "Kuota bulanan habis", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
          "502": { description: "Provider AI gagal", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      get: {
        tags: ["Translation"],
        summary: "Informasi metode endpoint",
        responses: { "405": { description: "Gunakan metode POST", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } } },
      },
    },
    "/api/demo/translate": {
      get: {
        tags: ["Demo"],
        summary: "Lihat sisa penggunaan demo",
        responses: {
          "200": { description: "Status demo", content: { "application/json": { schema: { $ref: "#/components/schemas/DemoStatusSuccess" } } } },
          "503": { description: "Demo belum dikonfigurasi", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      post: {
        tags: ["Demo"],
        summary: "Coba terjemahan tanpa akun",
        description: "Dibatasi dua percobaan per browser dalam 24 jam dan 500 karakter per request.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DemoTranslationRequest" } } } },
        responses: {
          "200": { description: "Demo berhasil", content: { "application/json": { schema: { $ref: "#/components/schemas/DemoTranslationSuccess" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "429": { description: "Batas demo habis", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/glossary": {
      get: {
        tags: ["Glossary"],
        summary: "Cari bank kosakata",
        parameters: [
          { name: "q", in: "query", description: "Mandarin, pinyin, atau terjemahan Indonesia", schema: { type: "string", maxLength: 100 } },
          { name: "genre", in: "query", schema: { type: "string", enum: genres } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
        ],
        responses: {
          "200": { description: "Daftar istilah", content: { "application/json": { schema: { $ref: "#/components/schemas/GlossarySearchSuccess" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/glossary/extract": {
      post: {
        tags: ["Glossary"],
        summary: "Ekstrak istilah dari bab dengan AI",
        security: [{ SupabaseBearer: [] }, { SupabaseSession: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GlossaryExtractRequest" } } } },
        responses: {
          "200": { description: "Istilah berhasil diekstrak", content: { "application/json": { schema: { $ref: "#/components/schemas/GlossaryExtractSuccess" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/billing/checkout": {
      post: {
        tags: ["Billing"],
        summary: "Checkout Premium",
        description: "Default saat demo adalah placeholder dan tidak membuat transaksi nyata. Jika MIDTRANS_ENABLE_REAL_CHECKOUT=true, endpoint mengembalikan URL checkout Midtrans.",
        security: [{ SupabaseSession: [] }],
        responses: {
          "200": { description: "Placeholder checkout dikembalikan", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckoutSuccess" } } } },
          "201": { description: "Checkout Midtrans berhasil dibuat", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckoutSuccess" } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "502": { description: "Provider pembayaran menolak request", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "503": { description: "Billing belum dikonfigurasi", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/billing/midtrans-notification": {
      post: {
        tags: ["Billing"],
        summary: "Terima webhook Midtrans",
        description: "Endpoint server-to-server. Signature SHA-512 diverifikasi dari order_id, status_code, gross_amount, dan Server Key.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MidtransNotification" } } } },
        responses: {
          "200": { description: "Notifikasi diproses", content: { "application/json": { schema: { $ref: "#/components/schemas/WebhookSuccess" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { description: "Signature tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Pembayaran tidak ditemukan", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/openapi": {
      get: {
        tags: ["Documentation"],
        summary: "Ambil spesifikasi OpenAPI AlurDao",
        responses: { "200": { description: "Dokumen OpenAPI 3.1 dalam format JSON" } },
      },
    },
  },
  components: {
    securitySchemes: {
      SupabaseBearer: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Access token Supabase untuk client non-browser." },
      SupabaseSession: { type: "apiKey", in: "cookie", name: "sb-project-auth-token", description: "Session cookie dikelola otomatis oleh Supabase SSR. Nama aktual mengandung project ref." },
    },
    responses: {
      BadRequest: { description: "Request atau parameter tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      Unauthorized: { description: "Sesi atau Bearer token diperlukan", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      InternalError: { description: "Kesalahan internal", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
    },
    schemas: {
      ApiMeta: {
        type: "object",
        required: ["requestId", "timestamp"],
        properties: { requestId: { type: "string", format: "uuid" }, timestamp: { type: "string", format: "date-time" }, durationMs: { type: "integer", minimum: 0 } },
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "error", "meta"],
        properties: {
          success: { type: "boolean", const: false },
          error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" }, details: {} } },
          meta: { $ref: "#/components/schemas/ApiMeta" },
        },
      },
      GlossaryItem: {
        type: "object",
        required: ["sourceTerm", "translatedTerm"],
        properties: { sourceTerm: { type: "string", maxLength: 120 }, translatedTerm: { type: "string", maxLength: 160 }, notes: { type: "string", maxLength: 300 } },
      },
      TranslationRequest: {
        type: "object",
        required: ["sourceText"],
        properties: {
          chapterId: { type: "string", format: "uuid" },
          sourceText: { type: "string", minLength: 1, maxLength: 20000 },
          sourceLanguage: { type: "string", default: "Chinese" },
          targetLanguage: { type: "string", default: "Indonesian" },
          genre: { type: "string", enum: genres, default: "xianxia" },
          style: { type: "string", enum: styles, default: "natural" },
          glossary: { type: "array", maxItems: 200, items: { $ref: "#/components/schemas/GlossaryItem" }, default: [] },
        },
        example: { sourceText: "林玄缓缓睁开双眼。", sourceLanguage: "Chinese", targetLanguage: "Indonesian", genre: "xianxia", style: "natural", glossary: [{ sourceTerm: "灵气", translatedTerm: "energi spiritual" }] },
      },
      AiTranslationData: {
        type: "object",
        required: ["translation", "provider", "model", "durationMs"],
        properties: {
          translation: { type: "string" }, provider: { type: "string" }, model: { type: "string" }, durationMs: { type: "integer" },
          usage: { type: "object", properties: { inputTokens: { type: "integer" }, outputTokens: { type: "integer" }, totalTokens: { type: "integer" } } },
        },
      },
      TranslationData: {
        allOf: [
          { $ref: "#/components/schemas/AiTranslationData" },
          {
            type: "object",
            required: ["quota"],
            properties: {
              quota: {
                type: "object",
                properties: {
                  allowed: { type: "boolean" },
                  unlimited: { type: "boolean" },
                  plan: { type: "string" },
                  limit: { type: "integer" },
                  used: { type: "integer" },
                  remaining: { type: "integer" },
                  periodStart: { type: "string" },
                },
              },
            },
          },
        ],
      },
      TranslationSuccess: { type: "object", required: ["success", "data", "meta"], properties: { success: { type: "boolean", const: true }, data: { $ref: "#/components/schemas/TranslationData" }, meta: { $ref: "#/components/schemas/ApiMeta" } } },
      DemoTranslationRequest: {
        type: "object", required: ["sourceText"],
        properties: { sourceText: { type: "string", minLength: 1, maxLength: 500 }, genre: { type: "string", enum: genres, default: "xianxia" }, style: { type: "string", enum: styles, default: "natural" } },
      },
      DemoUsage: {
        type: "object",
        properties: { used: { type: "integer" }, remaining: { type: "integer" }, limit: { type: "integer" }, resetAt: { type: "string", format: "date-time" } },
      },
      DemoStatusSuccess: {
        type: "object",
        properties: { success: { type: "boolean", const: true }, data: { allOf: [{ $ref: "#/components/schemas/DemoUsage" }, { type: "object", properties: { maxCharacters: { type: "integer" } } }] }, meta: { $ref: "#/components/schemas/ApiMeta" } },
      },
      DemoTranslationSuccess: {
        type: "object",
        properties: { success: { type: "boolean", const: true }, data: { allOf: [{ $ref: "#/components/schemas/AiTranslationData" }, { type: "object", required: ["demo"], properties: { demo: { $ref: "#/components/schemas/DemoUsage" } } }] }, meta: { $ref: "#/components/schemas/ApiMeta" } },
      },
      GlossaryTerm: {
        type: "object",
        properties: { id: { type: "string", format: "uuid" }, source_term: { type: "string" }, pinyin: { type: ["string", "null"] }, default_translation: { type: "string" }, category: { type: "string" }, definition: { type: ["string", "null"] }, review_status: { type: "string" }, genres: { type: "array", items: { type: "string", enum: genres } } },
      },
      GlossarySearchSuccess: {
        type: "object",
        properties: { success: { type: "boolean", const: true }, data: { type: "object", properties: { terms: { type: "array", items: { $ref: "#/components/schemas/GlossaryTerm" } }, count: { type: "integer" } } }, meta: { $ref: "#/components/schemas/ApiMeta" } },
      },
      GlossaryExtractRequest: {
        type: "object", required: ["sourceText"],
        properties: { sourceText: { type: "string", minLength: 1, maxLength: 20000 }, genre: { type: "string", enum: genres, default: "xianxia" } },
      },
      ExtractedTerm: {
        type: "object", required: ["sourceTerm", "pinyin", "translatedTerm", "category"],
        properties: { sourceTerm: { type: "string" }, pinyin: { type: "string" }, translatedTerm: { type: "string" }, category: { type: "string", enum: ["character", "sect", "realm", "technique", "artifact", "place", "other"] }, notes: { type: "string" } },
      },
      GlossaryExtractSuccess: {
        type: "object",
        properties: { success: { type: "boolean", const: true }, data: { type: "object", properties: { terms: { type: "array", items: { $ref: "#/components/schemas/ExtractedTerm" } }, count: { type: "integer" } } }, meta: { $ref: "#/components/schemas/ApiMeta" } },
      },
      CheckoutSuccess: {
        type: "object",
        properties: { success: { type: "boolean", const: true }, data: { type: "object", properties: { orderId: { type: "string" }, checkoutUrl: { oneOf: [{ type: "string", format: "uri" }, { type: "null" }] }, amount: { type: "integer" }, placeholder: { type: "boolean" }, message: { type: "string" } } }, meta: { $ref: "#/components/schemas/ApiMeta" } },
      },
      MidtransNotification: {
        type: "object", required: ["order_id", "status_code", "gross_amount", "signature_key"],
        properties: { order_id: { type: "string" }, transaction_id: { type: "string" }, transaction_status: { type: "string", enum: ["capture", "settlement", "pending", "deny", "cancel", "expire", "failure"] }, fraud_status: { type: "string" }, status_code: { type: "string" }, gross_amount: { type: "string" }, signature_key: { type: "string" } },
      },
      WebhookSuccess: {
        type: "object",
        properties: { success: { type: "boolean", const: true }, data: { type: "object", properties: { received: { type: "boolean" }, status: { type: "string", enum: ["pending", "paid", "failed", "expired", "cancelled"] } } }, meta: { $ref: "#/components/schemas/ApiMeta" } },
      },
    },
  },
} as const;
