import { readFile } from "node:fs/promises";

const baseUrl = process.env.EVALUATION_BASE_URL || "http://127.0.0.1:3000";
const accessToken = process.env.EVALUATION_ACCESS_TOKEN;
const casesUrl = new URL("../evaluation/cases.json", import.meta.url);
const cases = JSON.parse(await readFile(casesUrl, "utf8"));
const results = [];

for (const testCase of cases) {
  const startedAt = Date.now();

  try {
    const response = await fetch(`${baseUrl}/api/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        sourceText: testCase.sourceText,
        sourceLanguage: "Chinese",
        targetLanguage: "Indonesian",
        genre: testCase.genre,
        style: "natural",
        glossary: testCase.glossary,
      }),
    });
    const payload = await response.json();

    if (!payload.success) {
      results.push({
        id: testCase.id,
        genre: testCase.genre,
        passed: false,
        latencyMs: Date.now() - startedAt,
        error: payload.error,
      });
      continue;
    }

    const translation = payload.data.translation;
    const missingTerms = testCase.expectedTerms.filter(
      (term) => !translation.toLocaleLowerCase("id-ID").includes(term.toLocaleLowerCase("id-ID")),
    );
    const sourceCopied = translation.includes(testCase.sourceText);

    results.push({
      id: testCase.id,
      genre: testCase.genre,
      passed: missingTerms.length === 0 && !sourceCopied,
      provider: payload.data.provider,
      model: payload.data.model,
      latencyMs: Date.now() - startedAt,
      checks: {
        outputNotEmpty: translation.trim().length > 0,
        sourceNotCopied: !sourceCopied,
        requiredTermsPresent: missingTerms.length === 0,
        missingTerms,
      },
    });
  } catch (error) {
    results.push({
      id: testCase.id,
      genre: testCase.genre,
      passed: false,
      latencyMs: Date.now() - startedAt,
      error: {
        code: "EVALUATION_REQUEST_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

const passed = results.filter((result) => result.passed).length;
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  summary: {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length ? Number((passed / results.length).toFixed(3)) : 0,
  },
  results,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (passed !== results.length) process.exitCode = 1;
