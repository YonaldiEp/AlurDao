import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Case = {
  id: string;
  genre: "xianxia" | "xuanhuan" | "wuxia" | "qihuan" | "mohuan" | "kehuan";
  sourceText: string;
  glossary: Array<{ sourceTerm: string; translatedTerm: string }>;
  expectedTerms: string[];
};

async function main() {
  process.env.AI_PROVIDER = "mistral";
  const { translateText } = await import("../src/lib/ai/translate");
  const cases = JSON.parse(await readFile(resolve("evaluation/cases.json"), "utf8")) as Case[];
  const results = [];

  for (const testCase of cases) {
  const startedAt = Date.now();
  try {
    const output = await translateText({
      sourceText: testCase.sourceText,
      sourceLanguage: "Chinese",
      targetLanguage: "Indonesian",
      genre: testCase.genre,
      style: "natural",
      glossary: testCase.glossary,
    });
    const normalized = output.translation.toLocaleLowerCase("id-ID");
    const missingTerms = testCase.expectedTerms.filter((term) => !normalized.includes(term.toLocaleLowerCase("id-ID")));
    const sourceCopied = output.translation.includes(testCase.sourceText);
    const suspiciousRepetition = /\b([\p{L}-]{3,})(?:\s+\1){2,}\b/iu.test(output.translation);
    const forbiddenForeignTerms = ["mage", "county", "chapter", "section"].filter((term) => new RegExp(`\\b${term}\\b`, "i").test(output.translation));
    results.push({
      id: testCase.id,
      genre: testCase.genre,
      passed: output.translation.trim().length > 0 && !sourceCopied && !suspiciousRepetition && missingTerms.length === 0 && forbiddenForeignTerms.length === 0,
      provider: output.provider,
      model: output.model,
      latencyMs: Date.now() - startedAt,
      translation: output.translation,
      checks: { outputNotEmpty: output.translation.trim().length > 0, sourceNotCopied: !sourceCopied, requiredTermsPresent: missingTerms.length === 0, suspiciousRepetition: !suspiciousRepetition, noForbiddenForeignTerms: forbiddenForeignTerms.length === 0, forbiddenForeignTerms, missingTerms },
    });
  } catch (error) {
    results.push({ id: testCase.id, genre: testCase.genre, passed: false, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : "Unknown error" });
  }
  }

  const passed = results.filter((result) => result.passed).length;
  const report = {
  generatedAt: new Date().toISOString(),
  provider: "mistral",
  summary: { total: results.length, passed, failed: results.length - passed, passRate: Number((passed / results.length).toFixed(3)) },
  results,
  };
  await mkdir(resolve("evaluation/results"), { recursive: true });
  await writeFile(resolve("evaluation/results/mistral-latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (passed !== results.length) process.exitCode = 1;
}

void main();
