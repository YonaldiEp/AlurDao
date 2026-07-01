"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Cookie, LoaderCircle, Sparkles } from "lucide-react";
import { genreOptions, type GenreId } from "@/config/genres";
import type { ApiResponse } from "@/lib/api/response";
import type { TranslationResult } from "@/lib/ai/schema";

const sampleText = "林玄缓缓睁开双眼，丹田内的灵气如江河般奔涌。他知道，自己终于突破了筑基境。";

type DemoStatus = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  maxCharacters?: number;
};

type DemoResult = TranslationResult & { demo: DemoStatus };

export function LandingDemo() {
  const [sourceText, setSourceText] = useState(sampleText);
  const [genre, setGenre] = useState<GenreId>("xianxia");
  const [style, setStyle] = useState<"natural" | "light">("natural");
  const [translation, setTranslation] = useState("");
  const [status, setStatus] = useState<DemoStatus>({ limit: 2, used: 0, remaining: 2, resetAt: "" });
  const [message, setMessage] = useState("Siap mencoba terjemahan nyata.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/demo/translate")
      .then((response) => response.json() as Promise<ApiResponse<DemoStatus>>)
      .then((result) => {
        if (result.success) setStatus(result.data);
      })
      .catch(() => undefined);
  }, []);

  async function runDemo() {
    if (!sourceText.trim() || loading || status.remaining <= 0) return;
    setLoading(true);
    setMessage("AI sedang menerjemahkan dan menyunting...");

    try {
      const response = await fetch("/api/demo/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText, genre, style }),
      });
      const result = await response.json() as ApiResponse<DemoResult>;
      if (!result.success) {
        const details = result.error.details as Partial<DemoStatus> | undefined;
        if (typeof details?.remaining === "number") setStatus((current) => ({ ...current, ...details }));
        throw new Error(result.error.message);
      }

      setTranslation(result.data.translation);
      setStatus(result.data.demo);
      setMessage(`Selesai dengan ${result.data.provider}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Demo gagal dijalankan.");
    } finally {
      setLoading(false);
    }
  }

  const characters = Array.from(sourceText).length;
  const exhausted = status.remaining <= 0;

  return (
    <section className="demo-section" id="demo">
      <div className="container">
        <div className="demo-heading">
          <div><span className="kicker">Coba sebelum mendaftar</span><h2>Rasakan hasil AlurDao langsung dari halaman ini.</h2></div>
          <div className="demo-cookie-note"><Cookie size={18} /><span><strong>{status.remaining} dari {status.limit}</strong> percobaan tersisa dalam 24 jam</span></div>
        </div>

        <div className="demo-workbench">
          <section className="demo-pane">
            <div className="demo-pane-head"><strong>Teks Mandarin</strong><span>{characters}/500 karakter</span></div>
            <textarea value={sourceText} maxLength={500} onChange={(event) => setSourceText(event.target.value)} aria-label="Teks Mandarin untuk demo" />
            <div className="demo-controls">
              <label><span>Genre</span><select value={genre} onChange={(event) => setGenre(event.target.value as GenreId)}>{genreOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
              <label><span>Gaya</span><select value={style} onChange={(event) => setStyle(event.target.value as "natural" | "light")}><option value="natural">Natural</option><option value="light">Ringan</option></select></label>
              <button className="button button-primary demo-run-button" onClick={() => void runDemo()} disabled={loading || exhausted || !sourceText.trim()}>{loading ? <LoaderCircle className="spinner" size={18} /> : <Sparkles size={18} />}{loading ? "Menerjemahkan..." : exhausted ? "Batas demo habis" : "Coba terjemahkan"}</button>
            </div>
          </section>

          <section className="demo-pane demo-result-pane">
            <div className="demo-pane-head"><strong>Hasil Indonesia</strong><span>{message}</span></div>
            {translation ? <div className="demo-output">{translation}</div> : <div className="demo-empty"><Sparkles size={28} /><strong>Hasil terjemahan muncul di sini</strong><p>Contoh teks sudah disiapkan. Tekan tombol untuk mencoba.</p></div>}
            {exhausted && <div className="demo-limit-cta"><span>Demo selesai. Simpan project dan glosarium dengan akun Free.</span><Link href="/auth">Buat akun Free <ArrowRight size={15} /></Link></div>}
          </section>
        </div>

        <p className="demo-privacy"><Check size={15} /> Limit disimpan melalui cookie aman pada browser ini; teks demo tidak disimpan sebagai project.</p>
      </div>
    </section>
  );
}
