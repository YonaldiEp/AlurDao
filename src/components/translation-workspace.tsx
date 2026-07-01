"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { genreOptions, type GenreId } from "@/config/genres";
import type { TranslationResult } from "@/lib/ai/schema";
import type { ApiResponse } from "@/lib/api/response";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Clipboard,
  Clock3,
  FilePlus2,
  Languages,
  LoaderCircle,
  PanelLeftClose,
  RotateCcw,
  Settings2,
  Sparkles,
} from "lucide-react";

const sampleSource = "林玄缓缓睁开双眼，丹田内的灵气如江河般奔涌。他知道，自己终于突破了筑基境。山洞之外，晨雾笼罩着青云峰。";

export function TranslationWorkspace() {
  const [sourceText, setSourceText] = useState(sampleSource);
  const [translation, setTranslation] = useState("");
  const [genre, setGenre] = useState<GenreId>("xianxia");
  const [style, setStyle] = useState("natural");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Mode demo siap digunakan");
  const [copied, setCopied] = useState(false);

  const characters = useMemo(() => Array.from(sourceText).length, [sourceText]);

  async function translate() {
    if (!sourceText.trim()) {
      setMessage("Masukkan teks yang ingin diterjemahkan.");
      return;
    }

    setIsLoading(true);
    setMessage("AI sedang memahami konteks bab...");
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          sourceLanguage: "Chinese",
          targetLanguage: "Indonesian",
          genre,
          style,
        }),
      });
      const result = (await response.json()) as ApiResponse<TranslationResult>;
      if (!result.success) {
        throw new Error(result.error.message);
      }
      setTranslation(result.data.translation);
      setMessage(
        `Selesai melalui ${result.data.provider} · ${result.data.model} · ${result.data.durationMs} ms`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan tak terduga.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyTranslation() {
    if (!translation) return;
    await navigator.clipboard.writeText(translation);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function reset() {
    setSourceText(sampleSource);
    setTranslation("");
    setMessage("Contoh teks dikembalikan");
  }

  return (
    <main className="studio-shell">
      <aside className="studio-sidebar">
        <Link href="/" className="brand studio-brand">
          <span className="brand-mark">译</span>
          <span>Alur<span>Dao</span></span>
        </Link>

        <button className="new-project-button"><FilePlus2 size={17} /> Project baru</button>

        <div className="sidebar-label">Project</div>
        <nav className="project-list" aria-label="Daftar project">
          <button className="project-item active">
            <span className="book-icon"><BookOpen size={16} /></span>
            <span><strong>Legenda Pedang Abadi</strong><small>Bab 127 · baru saja</small></span>
          </button>
          <button className="project-item">
            <span className="book-icon"><BookOpen size={16} /></span>
            <span><strong>Jalan Sang Alkemis</strong><small>Bab 42 · 2 hari lalu</small></span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="usage-box">
            <div><span>Kuota bulanan</span><strong>12%</strong></div>
            <div className="usage-track"><i /></div>
            <small>12.340 dari 15.000 karakter</small>
          </div>
          <button className="profile-button">
            <span className="avatar">YE</span>
            <span><strong>Yonaldi Ernanda</strong><small>Paket gratis</small></span>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>

      <section className="studio-main">
        <header className="studio-topbar">
          <div>
            <Link href="/" className="back-link"><ArrowLeft size={15} /> Beranda</Link>
            <span className="crumb-divider">/</span>
            <strong>Legenda Pedang Abadi</strong>
            <span className="chapter-pill">Bab 127</span>
          </div>
          <div className="topbar-actions">
            <span className="saved-state"><Check size={14} /> Tersimpan</span>
            <button aria-label="Tutup panel"><PanelLeftClose size={18} /></button>
          </div>
        </header>

        <div className="editor-toolbar">
          <div className="select-control">
            <span>Dari</span>
            <button>中文 Mandarin <ChevronDown size={14} /></button>
          </div>
          <Languages className="swap-icon" size={18} />
          <div className="select-control">
            <span>Ke</span>
            <button>🇮🇩 Indonesia <ChevronDown size={14} /></button>
          </div>
          <div className="toolbar-spacer" />
          <label className="style-select">
            <span>Genre</span>
            <select
              value={genre}
              onChange={(event) => setGenre(event.target.value as GenreId)}
            >
              {genreOptions.map((option) => (
                <option value={option.id} key={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="style-select">
            <span>Gaya</span>
            <select value={style} onChange={(event) => setStyle(event.target.value)}>
              <option value="natural">Natural</option>
              <option value="dramatic">Dramatis</option>
              <option value="formal">Formal</option>
              <option value="light">Ringan</option>
            </select>
          </label>
        </div>

        <div className="editor-grid">
          <section className="editor-pane source-pane">
            <div className="pane-heading">
              <div><span className="pane-dot source" /> Teks sumber</div>
              <button onClick={reset}><RotateCcw size={14} /> Reset</button>
            </div>
            <textarea
              aria-label="Teks Mandarin sumber"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Tempel teks novel Mandarin di sini..."
            />
            <div className="pane-footer">
              <span>{characters.toLocaleString("id-ID")} karakter</span>
              <span>Mandarin terdeteksi</span>
            </div>
          </section>

          <section className="editor-pane result-pane">
            <div className="pane-heading">
              <div><span className="pane-dot result" /> Hasil terjemahan</div>
              <button onClick={copyTranslation} disabled={!translation}>
                {copied ? <Check size={14} /> : <Clipboard size={14} />}
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
            {translation ? (
              <div className="translation-output">{translation}</div>
            ) : (
              <div className="empty-result">
                <span><Sparkles size={26} /></span>
                <strong>Hasil akan muncul di sini</strong>
                <p>AI akan menjaga konteks, gaya bahasa, dan konsistensi istilah novelmu.</p>
              </div>
            )}
            <div className="pane-footer">
              <span className="status-message"><Clock3 size={13} /> {message}</span>
              <span>{Array.from(translation).length.toLocaleString("id-ID")} karakter</span>
            </div>
          </section>
        </div>

        <footer className="studio-actionbar">
          <div className="glossary-preview">
            <span>Glosarium aktif</span>
            <i>丹田 → dantian</i><i>灵气 → energi spiritual</i><i>筑基 → Fondasi</i>
          </div>
          <button className="button button-primary translate-button" onClick={translate} disabled={isLoading || !sourceText.trim()}>
            {isLoading ? <LoaderCircle className="spinner" size={18} /> : <Sparkles size={18} />}
            {isLoading ? "Menerjemahkan..." : "Terjemahkan dengan AI"}
          </button>
        </footer>
      </section>
    </main>
  );
}
