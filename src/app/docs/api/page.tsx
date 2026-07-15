import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiDocumentation } from "@/components/api-documentation";

export const metadata: Metadata = {
  title: "Dokumentasi API",
  description: "Dokumentasi Swagger/OpenAPI untuk endpoint AlurDao.",
};

export default function ApiDocumentationPage() {
  return (
    <main className="api-docs-shell">
      <header className="api-docs-header">
        <Link href="/"><ArrowLeft size={16} /> Kembali ke AlurDao</Link>
        <div>
          <span>OpenAPI 3.1</span>
          <h1>Dokumentasi API AlurDao</h1>
          <p>Endpoint terjemahan, demo, glosarium, dan billing dalam satu referensi interaktif.</p>
        </div>
        <a href="/api/openapi" target="_blank" rel="noreferrer">Buka JSON OpenAPI</a>
      </header>
      <section className="api-docs-content">
        <ApiDocumentation />
      </section>
    </main>
  );
}

