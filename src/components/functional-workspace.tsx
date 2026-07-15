"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clipboard,
  Clock3,
  CreditCard,
  FilePlus2,
  Languages,
  LibraryBig,
  LoaderCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { genreOptions, type GenreId } from "@/config/genres";
import { DisplayPreferences } from "@/components/display-preferences";
import type { TranslationResult, ExtractedTerm } from "@/lib/ai/schema";
import type { ApiResponse } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  title: string;
  description: string | null;
  genre: GenreId;
  source_language: string;
  target_language: string;
  translation_style: "natural" | "dramatic" | "formal" | "light";
  updated_at: string;
};

type Chapter = {
  id: string;
  project_id: string;
  chapter_number: number;
  title: string | null;
  source_text: string;
  translated_text: string;
  status: "draft" | "translating" | "review" | "completed";
  updated_at: string;
};

type ProjectGlossary = {
  id: string;
  source_term: string;
  translated_term: string;
  category: string;
  notes: string | null;
  pinyin: string | null;
  global_term_id: string | null;
};

type GlobalTerm = {
  id: string;
  source_term: string;
  pinyin: string | null;
  default_translation: string;
  category: string;
  definition: string | null;
  review_status: string;
  genres: GenreId[];
  aliases: Array<{ alias: string; type: string }>;
};

type GlossaryApiData = { terms: GlobalTerm[]; count: number };
type SaveState = "saved" | "dirty" | "saving" | "error";

type UserProfile = {
  plan: string;
  monthly_character_limit: number;
  characters_used: number;
  project_limit: number;
  chapter_limit_per_project: number;
  quota_period_start: string;
};

type TranslationQuota = {
  allowed: boolean;
  unlimited: boolean;
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
};

type TranslationApiResult = TranslationResult & { quota: TranslationQuota };

const emptySource = "";
const categoryMap: Record<string, string> = {
  organization: "sect",
  realm: "realm",
  martial_arts: "technique",
  cultivation: "technique",
  item: "artifact",
  place: "place",
  character: "character",
};

export function FunctionalWorkspace() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const lastSavedRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [booting, setBooting] = useState(true);
  const [userName, setUserName] = useState("Pengguna");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [projectGlossary, setProjectGlossary] = useState<ProjectGlossary[]>([]);
  const [sourceText, setSourceText] = useState(emptySource);
  const [translation, setTranslation] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState("Siap menerjemahkan");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectGenre, setNewProjectGenre] = useState<GenreId>("xianxia");
  const [creatingProject, setCreatingProject] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossarySearch, setGlossarySearch] = useState("");
  const [globalTerms, setGlobalTerms] = useState<GlobalTerm[]>([]);
  const [selectedGlobalTermIds, setSelectedGlobalTermIds] = useState<string[]>([]);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [extractedTerms, setExtractedTerms] = useState<ExtractedTerm[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 700px)").matches) setSidebarOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  type Toast = {
    id: string;
    type: "success" | "info" | "error";
    message: string;
  };
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingChapter, setIsAddingChapter] = useState(false);

  const loadProjectData = useCallback(async (project: Project) => {
    const [chapterResult, glossaryResult] = await Promise.all([
      supabase
        .from("chapters")
        .select("*")
        .eq("project_id", project.id)
        .order("chapter_number", { ascending: true }),
      supabase
        .from("glossary_entries")
        .select("*")
        .eq("project_id", project.id)
        .order("source_term", { ascending: true }),
    ]);

    if (chapterResult.error) throw chapterResult.error;
    if (glossaryResult.error) throw glossaryResult.error;

    const loadedChapters = (chapterResult.data ?? []) as Chapter[];
    const firstChapter = loadedChapters[0] ?? null;
    setChapters(loadedChapters);
    setProjectGlossary((glossaryResult.data ?? []) as ProjectGlossary[]);
    setActiveChapter(firstChapter);
    setSourceText(firstChapter?.source_text ?? "");
    setTranslation(firstChapter?.translated_text ?? "");
    lastSavedRef.current = JSON.stringify({
      id: firstChapter?.id,
      source: firstChapter?.source_text ?? "",
      translation: firstChapter?.translated_text ?? "",
    });
    setSaveState("saved");
  }, [supabase]);

  const loadProjects = useCallback(async (preferredProjectId?: string) => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;

    const loadedProjects = (data ?? []) as Project[];
    setProjects(loadedProjects);
    const selected = loadedProjects.find((project) => project.id === preferredProjectId) ?? loadedProjects[0] ?? null;
    setActiveProject(selected);

    if (selected) await loadProjectData(selected);
    else {
      setChapters([]);
      setActiveChapter(null);
      setProjectGlossary([]);
      setSourceText("");
      setTranslation("");
    }
  }, [loadProjectData, supabase]);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("plan, monthly_character_limit, characters_used, project_limit, chapter_limit_per_project, quota_period_start")
      .eq("id", userId)
      .single();
    if (error) throw error;
    setProfile(data as UserProfile);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        router.replace("/auth");
        return;
      }

      setUserName(
        data.user.user_metadata.display_name ||
          data.user.user_metadata.full_name ||
          data.user.email?.split("@")[0] ||
          "Pengguna",
      );

      try {
        await Promise.all([loadProjects(), loadProfile(data.user.id)]);
      } catch (loadError) {
        setMessage(loadError instanceof Error ? loadError.message : "Data workspace gagal dimuat.");
      } finally {
        if (active) setBooting(false);
      }
    })();

    return () => { active = false; };
  }, [loadProfile, loadProjects, router, supabase]);

  useEffect(() => {
    if (!activeChapter) return;
    const snapshot = JSON.stringify({ id: activeChapter.id, source: sourceText, translation });
    if (snapshot === lastSavedRef.current) return;

    setSaveState("dirty");
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      void supabase
        .from("chapters")
        .update({ source_text: sourceText, translated_text: translation })
        .eq("id", activeChapter.id)
        .then(({ error }) => {
          if (error) {
            setSaveState("error");
            setMessage(`Autosave gagal: ${error.message}`);
            return;
          }
          lastSavedRef.current = snapshot;
          setSaveState("saved");
          setChapters((current) => current.map((chapter) => chapter.id === activeChapter.id
            ? { ...chapter, source_text: sourceText, translated_text: translation }
            : chapter));
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeChapter, sourceText, supabase, translation]);

  useEffect(() => {
    if (!glossaryOpen || !activeProject) return;
    const timer = window.setTimeout(() => {
      setGlossaryLoading(true);
      const params = new URLSearchParams({ genre: activeProject.genre, limit: "50" });
      if (glossarySearch.trim()) params.set("q", glossarySearch.trim());
      void fetch(`/api/glossary?${params}`)
        .then((response) => response.json() as Promise<ApiResponse<GlossaryApiData>>)
        .then((result) => {
          if (!result.success) throw new Error(result.error.message);
          setGlobalTerms(result.data.terms);
          setSelectedGlobalTermIds((current) => current.filter((id) => result.data.terms.some((term) => term.id === id)));
        })
        .catch((error) => setMessage(error instanceof Error ? error.message : "Kosakata gagal dimuat."))
        .finally(() => setGlossaryLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeProject, glossaryOpen, glossarySearch]);

  async function selectProject(project: Project) {
    setActiveProject(project);
    setMessage("Memuat project...");
    try {
      await loadProjectData(project);
      setMessage("Project siap");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Project gagal dimuat.");
    }
  }

  function selectChapter(chapter: Chapter) {
    setActiveChapter(chapter);
    setSourceText(chapter.source_text);
    setTranslation(chapter.translated_text);
    lastSavedRef.current = JSON.stringify({
      id: chapter.id,
      source: chapter.source_text,
      translation: chapter.translated_text,
    });
    setSaveState("saved");
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newProjectTitle.trim()) return;
    setCreatingProject(true);
    const { data, error } = await supabase.rpc("create_project_with_first_chapter", {
      project_title: newProjectTitle.trim(),
      project_genre: newProjectGenre,
      project_style: "natural",
      project_description: null,
    });
    setCreatingProject(false);
    if (error) {
      setMessage(error.message.includes("PROJECT_LIMIT_REACHED")
        ? "Batas project untuk paket Free telah tercapai."
        : error.message);
      return;
    }
    setNewProjectTitle("");
    setProjectModalOpen(false);
    await loadProjects(data as string);
    setMessage("Project baru berhasil dibuat");
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Hapus project “${project.title}” beserta seluruh babnya?`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) { setMessage(error.message); return; }
    await loadProjects();
    setMessage("Project dihapus");
  }

  async function addChapter() {
    if (!activeProject) return;
    if (isAddingChapter) return;

    const nextDefaultNumber = chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapter_number)) + 1 : 1;
    const input = window.prompt("Masukkan nomor bab baru:", String(nextDefaultNumber));
    if (input === null) return;

    const chosenNumber = parseInt(input.trim(), 10);
    if (isNaN(chosenNumber) || chosenNumber <= 0) {
      showToast("Nomor bab harus berupa angka bulat positif.", "error");
      return;
    }

    if (chapters.some((c) => c.chapter_number === chosenNumber)) {
      showToast(`Bab ${chosenNumber} sudah ada di project ini.`, "error");
      return;
    }

    const allowedChapters = profile?.chapter_limit_per_project ?? 30;
    if (profile && profile.plan !== "admin" && chapters.length >= allowedChapters) {
      showToast("Batas bab paket Gratis telah tercapai.", "error");
      return;
    }

    setIsAddingChapter(true);
    setMessage("Sedang menambahkan bab baru...");
    try {
      const { data, error } = await supabase
        .from("chapters")
        .insert({
          project_id: activeProject.id,
          chapter_number: chosenNumber,
          title: `Bab ${chosenNumber}`,
          source_text: "",
          translated_text: "",
        })
        .select("*")
        .single();

      if (error) throw error;

      const chapter = data as Chapter;
      setChapters((current) => [...current, chapter].sort((a, b) => a.chapter_number - b.chapter_number));
      selectChapter(chapter);
      setMessage(`Bab ${chapter.chapter_number} ditambahkan`);
      showToast(`Bab ${chapter.chapter_number} berhasil ditambahkan!`, "success");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Gagal menambahkan bab baru.";
      setMessage(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsAddingChapter(false);
    }
  }

  async function deleteChapter() {
    if (!activeChapter || chapters.length <= 1) {
      showToast("Project harus memiliki minimal satu bab.", "info");
      return;
    }
    if (isDeleting) return;
    if (!window.confirm(`Hapus ${activeChapter.title || `Bab ${activeChapter.chapter_number}`}?`)) return;

    setIsDeleting(true);
    setMessage("Sedang menghapus bab...");
    try {
      const { error } = await supabase.from("chapters").delete().eq("id", activeChapter.id);
      if (error) throw error;

      const remaining = chapters.filter((chapter) => chapter.id !== activeChapter.id);
      setChapters(remaining);
      selectChapter(remaining[0]);
      setMessage("Bab dihapus");
      showToast("Bab berhasil dihapus.", "success");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Gagal menghapus bab.";
      setMessage(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsDeleting(false);
    }
  }

  function clearSource() {
    if (!sourceText.trim() || window.confirm("Kosongkan seluruh teks sumber pada bab ini?")) {
      setSourceText("");
    }
  }

  async function importChapterFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["txt", "md"].includes(extension)) {
      showToast("Gunakan file .txt atau .md agar format naskah tetap aman.", "error");
      return;
    }
    if (file.size > 1024 * 1024) {
      showToast("Ukuran file maksimal 1 MB.", "error");
      return;
    }
    const text = (await file.text()).replace(/^\uFEFF/, "").trim();
    if (!text) {
      showToast("File tidak berisi teks yang dapat dibaca.", "error");
      return;
    }
    if (sourceText.trim() && !window.confirm("Ganti teks sumber saat ini dengan isi file?")) return;
    setSourceText(text);
    setMessage(`${file.name} berhasil dimuat dan akan disimpan otomatis`);
    showToast("File bab berhasil dimuat.", "success");
  }

  async function updateProjectSetting(update: Partial<Project>) {
    if (!activeProject) return;
    const nextProject = { ...activeProject, ...update };
    setActiveProject(nextProject);
    setProjects((current) => current.map((project) => project.id === nextProject.id ? nextProject : project));
    const { error } = await supabase.from("projects").update(update).eq("id", activeProject.id);
    if (error) setMessage(error.message);
  }

  async function translate() {
    if (!sourceText.trim() || !activeProject || !activeChapter) {
      setMessage("Masukkan teks dan pilih bab terlebih dahulu.");
      return;
    }
    setIsTranslating(true);
    setMessage("AI sedang memahami konteks bab...");
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: activeChapter.id,
          sourceText,
          sourceLanguage: activeProject.source_language === "zh" ? "Chinese" : activeProject.source_language,
          targetLanguage: activeProject.target_language === "id" ? "Indonesian" : activeProject.target_language,
          genre: activeProject.genre,
          style: activeProject.translation_style,
          glossary: projectGlossary.map((term) => ({
            sourceTerm: term.source_term,
            translatedTerm: term.translated_term,
            notes: term.notes || undefined,
          })),
        }),
      });
      const result = (await response.json()) as ApiResponse<TranslationApiResult>;
      if (!result.success) throw new Error(result.error.message);
      setTranslation(result.data.translation);
      setMessage(`Selesai melalui ${result.data.provider} · ${result.data.model}`);
      showToast("Terjemahan bab selesai diproses!", "success");
      setProfile((current) => current ? {
        ...current,
        characters_used: result.data.quota.used,
        monthly_character_limit: result.data.quota.limit,
        quota_period_start: result.data.quota.periodStart,
      } : current);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Terjemahan gagal diproses.";
      setMessage(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsTranslating(false);
    }
  }

  async function addGlossaryTerm(term: GlobalTerm) {
    if (!activeProject || projectGlossary.some((entry) => entry.source_term === term.source_term)) return;
    const { data, error } = await supabase
      .from("glossary_entries")
      .insert({
        project_id: activeProject.id,
        global_term_id: term.id,
        source_term: term.source_term,
        pinyin: term.pinyin,
        translated_term: term.default_translation,
        category: categoryMap[term.category] || "other",
        notes: term.definition,
      })
      .select("*")
      .single();
    if (error) { setMessage(error.message); return; }
    setProjectGlossary((current) => [...current, data as ProjectGlossary]);
    setMessage(`${term.source_term} ditambahkan ke glosarium project`);
  }

  function toggleGlobalTermSelection(term: GlobalTerm) {
    if (projectGlossary.some((entry) => entry.source_term === term.source_term)) return;
    setSelectedGlobalTermIds((current) => (
      current.includes(term.id)
        ? current.filter((id) => id !== term.id)
        : [...current, term.id]
    ));
  }

  function selectVisibleGlobalTerms() {
    const addableIds = globalTerms
      .filter((term) => !projectGlossary.some((entry) => entry.source_term === term.source_term))
      .map((term) => term.id);
    setSelectedGlobalTermIds(addableIds);
  }

  async function addSelectedGlobalTerms() {
    if (!activeProject || !selectedGlobalTermIds.length) return;
    const selectedTerms = globalTerms.filter((term) => (
      selectedGlobalTermIds.includes(term.id) &&
      !projectGlossary.some((entry) => entry.source_term === term.source_term)
    ));
    if (!selectedTerms.length) {
      setSelectedGlobalTermIds([]);
      showToast("Semua istilah terpilih sudah ada di glosarium project.", "info");
      return;
    }

    setGlossaryLoading(true);
    try {
      const insertData = selectedTerms.map((term) => ({
        project_id: activeProject.id,
        global_term_id: term.id,
        source_term: term.source_term,
        pinyin: term.pinyin,
        translated_term: term.default_translation,
        category: categoryMap[term.category] || "other",
        notes: term.definition,
      }));

      const { data, error } = await supabase
        .from("glossary_entries")
        .insert(insertData)
        .select("*");
      if (error) throw error;

      setProjectGlossary((current) => [...current, ...(data as ProjectGlossary[])]);
      setSelectedGlobalTermIds([]);
      setMessage(`${data.length} istilah ditambahkan ke glosarium project`);
      showToast(`${data.length} istilah berhasil ditambahkan ke glosarium.`, "success");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Gagal menambahkan istilah terpilih.";
      setMessage(errMsg);
      showToast(errMsg, "error");
    } finally {
      setGlossaryLoading(false);
    }
  }

  async function addCustomGlossaryTerm(term: {
    sourceTerm: string;
    pinyin: string;
    translatedTerm: string;
    category: string;
    notes?: string;
  }) {
    if (!activeProject || projectGlossary.some((entry) => entry.source_term === term.sourceTerm)) return;
    const mappedCategory = categoryMap[term.category] || term.category || "other";
    const { data, error } = await supabase
      .from("glossary_entries")
      .insert({
        project_id: activeProject.id,
        source_term: term.sourceTerm,
        pinyin: term.pinyin,
        translated_term: term.translatedTerm,
        category: mappedCategory,
        notes: term.notes || null,
      })
      .select("*")
      .single();
    if (error) { setMessage(error.message); return; }
    setProjectGlossary((current) => [...current, data as ProjectGlossary]);
    setMessage(`"${term.sourceTerm}" ditambahkan ke glosarium project`);
  }

  async function extractGlossary() {
    if (!sourceText.trim() || !activeProject) {
      setMessage("Masukkan teks bab terlebih dahulu.");
      return;
    }
    setIsExtracting(true);
    setMessage("AI sedang memindai dan mengekstrak entitas...");
    try {
      const response = await fetch("/api/glossary/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          genre: activeProject.genre,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error.message);
      setExtractedTerms(result.data.terms);
      setMessage(`Berhasil memindai ${result.data.count} istilah dari bab ini.`);
      showToast(`Pencarian kosakata selesai! Menemukan ${result.data.count} istilah.`, "success");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Ekstraksi glosarium gagal.";
      setMessage(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsExtracting(false);
    }
  }

  async function addAllCustomGlossaryTerms() {
    if (!activeProject || !extractedTerms.length) return;
    const newTerms = extractedTerms.filter(
      (term) => !projectGlossary.some((entry) => entry.source_term === term.sourceTerm)
    );
    if (!newTerms.length) {
      showToast("Semua istilah rekomendasi sudah terdaftar.", "info");
      return;
    }
    setIsExtracting(true);
    setMessage("Menyimpan semua istilah rekomendasi...");
    try {
      const insertData = newTerms.map((term) => ({
        project_id: activeProject.id,
        source_term: term.sourceTerm,
        pinyin: term.pinyin,
        translated_term: term.translatedTerm,
        category: categoryMap[term.category] || term.category || "other",
        notes: term.notes || null,
      }));
      const { data, error } = await supabase
        .from("glossary_entries")
        .insert(insertData)
        .select("*");
      if (error) throw error;
      setProjectGlossary((current) => [...current, ...(data as ProjectGlossary[])]);
      setMessage(`${data.length} istilah ditambahkan ke glosarium project`);
      showToast(`${data.length} istilah berhasil ditambahkan secara massal!`, "success");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Gagal menambahkan semua istilah.";
      setMessage(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsExtracting(false);
    }
  }

  async function removeGlossaryTerm(term: ProjectGlossary) {
    const { error } = await supabase.from("glossary_entries").delete().eq("id", term.id);
    if (error) { setMessage(error.message); return; }
    setProjectGlossary((current) => current.filter((entry) => entry.id !== term.id));
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  async function copyTranslation() {
    if (!translation) return;
    await navigator.clipboard.writeText(translation);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (booting) {
    return <main className="studio-loading"><LoaderCircle className="spinner" size={28} /><span>Memuat workspace AlurDao...</span></main>;
  }

  const saveLabels: Record<SaveState, string> = {
    saved: "Tersimpan",
    dirty: "Belum tersimpan",
    saving: "Menyimpan...",
    error: "Gagal menyimpan",
  };
  const isUnlimited = profile?.plan === "admin";
  const usagePercent = !isUnlimited && profile?.monthly_character_limit
    ? Math.min(100, Math.round((profile.characters_used / profile.monthly_character_limit) * 100))
    : 0;
  const addableGlobalTerms = globalTerms.filter((term) => !projectGlossary.some((entry) => entry.source_term === term.source_term));
  const selectedAddableCount = selectedGlobalTermIds.filter((id) => addableGlobalTerms.some((term) => term.id === id)).length;

  return (
    <main className={`studio-shell ${sidebarOpen ? "" : "studio-sidebar-collapsed"}`}>
      {sidebarOpen && <button className="studio-sidebar-backdrop" aria-label="Tutup panel project" onClick={() => setSidebarOpen(false)} />}
      {sidebarOpen && (
        <aside className="studio-sidebar">
          <Link href="/" className="brand studio-brand"><span className="brand-mark">译</span><span>Alur<span>Dao</span></span></Link>
          <button className="sidebar-mobile-close" aria-label="Tutup panel project" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          <button className="new-project-button" onClick={() => setProjectModalOpen(true)}><FilePlus2 size={17} /> Project baru</button>

          <div className="sidebar-label">Project</div>
          <nav className="project-list" aria-label="Daftar project">
            {projects.map((project) => (
              <div className={`project-row ${activeProject?.id === project.id ? "active" : ""}`} key={project.id}>
                <button className="project-item" onClick={() => void selectProject(project)}>
                  <span className="book-icon"><BookOpen size={16} /></span>
                  <span><strong>{project.title}</strong><small>{genreOptions.find((option) => option.id === project.genre)?.label}</small></span>
                </button>
                <button className="row-delete" aria-label={`Hapus ${project.title}`} title={`Hapus ${project.title}`} onClick={() => void deleteProject(project)}><Trash2 size={13} /></button>
              </div>
            ))}
            {!projects.length && <p className="sidebar-empty">Belum ada project.</p>}
          </nav>

          {activeProject && (
            <>
              <div className="sidebar-label sidebar-label-row"><span>Bab</span><button onClick={() => void addChapter()} aria-label="Tambah bab" title="Tambah bab" disabled={isAddingChapter}>{isAddingChapter ? <LoaderCircle className="spinner" size={12} /> : <Plus size={14} />}</button></div>
              <nav className="chapter-list" aria-label="Daftar bab">
                {chapters.map((chapter) => (
                  <button className={`chapter-item ${activeChapter?.id === chapter.id ? "active" : ""}`} key={chapter.id} onClick={() => selectChapter(chapter)}>
                    <span>{chapter.chapter_number}</span><strong>{chapter.title || `Bab ${chapter.chapter_number}`}</strong>
                  </button>
                ))}
              </nav>
            </>
          )}

          <div className="sidebar-bottom">
            {profile && (
              <div className="usage-box">
                <div><span>Kuota bulanan</span><strong>{isUnlimited ? "∞" : `${usagePercent}%`}</strong></div>
                <div className="usage-track"><i style={{ width: `${usagePercent}%` }} /></div>
                <small>{isUnlimited ? "Tanpa batas · admin" : `${profile.characters_used.toLocaleString("id-ID")} dari ${profile.monthly_character_limit.toLocaleString("id-ID")} karakter · ${profile.plan}`}</small>
              </div>
            )}
            {profile?.plan !== "admin" && <Link className="upgrade-link" href="/billing"><CreditCard size={15} /> {profile?.plan === "premium" ? "Kelola Premium" : "Upgrade Premium"}</Link>}
            {profile?.plan === "admin" && <Link className="upgrade-link" href="/admin/monitoring">Monitoring API</Link>}
            <button className="profile-button" onClick={() => void signOut()}>
              <span className="avatar">{userName.slice(0, 2).toUpperCase()}</span>
              <span><strong>{userName}</strong><small>Keluar dari akun</small></span>
              <LogOut size={16} />
            </button>
          </div>
        </aside>
      )}

      <section className="studio-main">
        <header className="studio-topbar">
          <div><Link href="/" className="back-link"><ArrowLeft size={15} /> Beranda</Link><span className="crumb-divider">/</span><strong>{activeProject?.title || "Workspace"}</strong>{activeChapter && <span className="chapter-pill">Bab {activeChapter.chapter_number}</span>}</div>
          <div className="topbar-actions"><span className={`saved-state ${saveState}`}><Check size={14} /> {saveLabels[saveState]}</span><DisplayPreferences />{activeChapter && <button aria-label="Hapus bab" title="Hapus bab" onClick={() => void deleteChapter()} disabled={isDeleting}>{isDeleting ? <LoaderCircle className="spinner" size={14} /> : <Trash2 size={16} />}</button>}<button aria-label={sidebarOpen ? "Tutup panel project" : "Buka panel project"} title={sidebarOpen ? "Tutup panel project" : "Buka panel project"} onClick={() => setSidebarOpen((open) => !open)}>{sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}</button></div>
        </header>

        {!activeProject ? (
          <section className="empty-workspace"><span><BookOpen size={30} /></span><h1>Mulai project pertamamu</h1><p>Buat project untuk menyimpan bab, hasil terjemahan, dan glosarium.</p><button className="button button-primary" onClick={() => setProjectModalOpen(true)}><Plus size={17} /> Buat project</button></section>
        ) : (
          <>
            <div className="editor-toolbar">
              <div className="select-control"><span>Dari</span><select value={activeProject.source_language} onChange={(event) => void updateProjectSetting({ source_language: event.target.value })}><option value="zh">中文 Mandarin</option></select></div>
              <Languages className="swap-icon" size={18} />
              <div className="select-control"><span>Ke</span><select value={activeProject.target_language} onChange={(event) => void updateProjectSetting({ target_language: event.target.value })}><option value="id">Indonesia</option><option value="en">English</option></select></div>
              <div className="toolbar-spacer" />
              <button className="glossary-button" onClick={() => setGlossaryOpen(true)}><LibraryBig size={15} /> Glosarium <span>{projectGlossary.length}</span></button>
              <input ref={fileInputRef} className="visually-hidden" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(event) => void importChapterFile(event)} />
              <button className="upload-button" type="button" onClick={() => fileInputRef.current?.click()} title="Unggah file teks maksimal 1 MB"><Upload size={15} /> Unggah bab</button>
              <button className="button button-primary button-small translate-button-top" onClick={() => void translate()} disabled={isTranslating || !sourceText.trim()}>{isTranslating ? <LoaderCircle className="spinner" size={14} /> : <Sparkles size={14} />}{isTranslating ? "Menerjemahkan..." : "Terjemahkan dengan AI"}</button>
              <label className="style-select"><span>Genre</span><select value={activeProject.genre} onChange={(event) => void updateProjectSetting({ genre: event.target.value as GenreId })}>{genreOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
              <label className="style-select"><span>Gaya</span><select value={activeProject.translation_style} onChange={(event) => void updateProjectSetting({ translation_style: event.target.value as Project["translation_style"] })}><option value="natural">Natural</option><option value="dramatic">Dramatis</option><option value="formal">Formal</option><option value="light">Ringan</option></select></label>
            </div>

            <div className="editor-grid">
              <section className="editor-pane source-pane"><div className="pane-heading"><div><span className="pane-dot source" /> Teks sumber</div><button onClick={clearSource} disabled={!sourceText}><RotateCcw size={14} /> Kosongkan</button></div><textarea aria-label="Teks Mandarin sumber" value={sourceText} onChange={(event) => setSourceText(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void translate(); } }} placeholder="Tempel teks novel Mandarin di sini. Tekan Ctrl+Enter untuk menerjemahkan." /><div className="pane-footer"><span>{Array.from(sourceText).length.toLocaleString("id-ID")} karakter</span><span>Autosave aktif</span></div></section>
              <section className="editor-pane result-pane"><div className="pane-heading"><div><span className="pane-dot result" /> Hasil terjemahan</div><button onClick={() => void copyTranslation()} disabled={!translation}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Tersalin" : "Salin"}</button></div>{translation ? <div className="translation-output">{translation}</div> : <div className="empty-result"><span><Sparkles size={26} /></span><strong>Mulai dalam 3 langkah</strong><ol><li>Tempel teks Mandarin di panel kiri.</li><li>Pilih genre, gaya, dan glosarium bila perlu.</li><li>Tekan “Terjemahkan dengan AI” atau Ctrl+Enter.</li></ol></div>}<div className="pane-footer"><span className="status-message"><Clock3 size={13} /> {message}</span><span>{Array.from(translation).length.toLocaleString("id-ID")} karakter</span></div></section>
            </div>
          </>
        )}
      </section>

      {projectModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setProjectModalOpen(false); }}>
          <form className="modal-card" onSubmit={createProject}><div className="modal-heading"><div><span>Project baru</span><h2>Mulai sebuah dunia</h2></div><button type="button" aria-label="Tutup" onClick={() => setProjectModalOpen(false)}><X size={18} /></button></div><label><span>Judul novel</span><input autoFocus value={newProjectTitle} onChange={(event) => setNewProjectTitle(event.target.value)} required maxLength={160} placeholder="Contoh: Legenda Pedang Abadi" /></label><label><span>Genre utama</span><select value={newProjectGenre} onChange={(event) => setNewProjectGenre(event.target.value as GenreId)}>{genreOptions.map((option) => <option value={option.id} key={option.id}>{option.hanzi} · {option.label}</option>)}</select></label><button className="button button-primary" disabled={creatingProject}>{creatingProject && <LoaderCircle className="spinner" size={17} />}{creatingProject ? "Membuat..." : "Buat project dan Bab 1"}</button></form>
        </div>
      )}

      {glossaryOpen && activeProject && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setGlossaryOpen(false); }}>
          <aside className="glossary-drawer">
            <div className="drawer-heading">
              <div>
                <span>Bank kosakata</span>
                <h2>Glosarium project</h2>
                <p className="drawer-project-name" title={activeProject.title}>{activeProject.title}</p>
              </div>
              <button aria-label="Tutup glosarium" onClick={() => setGlossaryOpen(false)}>
                <X size={19} />
              </button>
            </div>
            
            <div className="glossary-search">
              <Search size={16} />
              <input value={glossarySearch} onChange={(event) => setGlossarySearch(event.target.value)} placeholder="Cari Mandarin, pinyin, atau Indonesia..." />
            </div>

            <div className="glossary-summary">
              <article><strong>{projectGlossary.length}</strong><span>Istilah project</span></article>
              <article><strong>{addableGlobalTerms.length}</strong><span>Bisa ditambahkan</span></article>
              <article><strong>{selectedAddableCount}</strong><span>Terpilih</span></article>
            </div>

            <div className="glossary-actions">
              <button
                type="button"
                className="button-scan"
                onClick={() => void extractGlossary()}
                disabled={isExtracting || !sourceText.trim()}
              >
                {isExtracting ? <LoaderCircle className="spinner" size={14} /> : <Sparkles size={14} />}
                {isExtracting ? "Memindai Bab..." : "Pindai Bab (AI)"}
              </button>
              <div className="glossary-bulk-actions">
                <button type="button" onClick={selectVisibleGlobalTerms} disabled={!addableGlobalTerms.length || glossaryLoading}>Pilih semua terlihat</button>
                <button type="button" onClick={() => setSelectedGlobalTermIds([])} disabled={!selectedGlobalTermIds.length || glossaryLoading}>Batal pilih</button>
                <button type="button" className="primary" onClick={() => void addSelectedGlobalTerms()} disabled={!selectedAddableCount || glossaryLoading}>
                  {glossaryLoading && selectedAddableCount ? <LoaderCircle className="spinner" size={13} /> : <Plus size={13} />}
                  Tambah terpilih
                </button>
              </div>
            </div>

            {extractedTerms.length > 0 && (
              <div className="extracted-glossary">
                <div className="extracted-glossary-header">
                  <h3>Rekomendasi Bab (Pindai AI)</h3>
                  <button
                    type="button"
                    className="button-add-all"
                    onClick={() => void addAllCustomGlossaryTerms()}
                    disabled={!extractedTerms.some((term) => !projectGlossary.some((entry) => entry.source_term === term.sourceTerm))}
                  >
                    Tambahkan Semua
                  </button>
                </div>
                {extractedTerms.map((term, index) => {
                  const added = projectGlossary.some((entry) => entry.source_term === term.sourceTerm);
                  return (
                    <div className="glossary-row" key={`ext-${index}`}>
                      <div>
                        <strong>{term.sourceTerm}</strong>
                        <small>{term.pinyin} · {term.category}</small>
                      </div>
                      <span>{term.translatedTerm}</span>
                      <button
                        disabled={added}
                        aria-label={`Tambahkan ${term.sourceTerm}`}
                        onClick={() => void addCustomGlossaryTerm(term)}
                      >
                        {added ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="active-glossary">
              <h3>Istilah project ({projectGlossary.length})</h3>
              {projectGlossary.map((term) => (
                <div className="glossary-row active-term" key={term.id}>
                  <div>
                    <strong>{term.source_term}</strong>
                    <small>{term.pinyin}</small>
                  </div>
                  <span>{term.translated_term}</span>
                  <button aria-label={`Hapus ${term.source_term}`} onClick={() => void removeGlossaryTerm(term)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              {!projectGlossary.length && <p>Tambahkan istilah dari bank di bawah.</p>}
            </div>

            <div className="global-glossary">
              <h3>Bank {genreOptions.find((option) => option.id === activeProject.genre)?.label}</h3>
              {glossaryLoading ? (
                <div className="drawer-loading">
                  <LoaderCircle className="spinner" size={20} /> Memuat istilah...
                </div>
              ) : (
                globalTerms.map((term) => {
                  const added = projectGlossary.some((entry) => entry.source_term === term.source_term);
                  const selected = selectedGlobalTermIds.includes(term.id);
                  return (
                    <div className={`glossary-row bank-term ${selected ? "selected" : ""} ${added ? "added" : ""}`} key={term.id}>
                      <label className="term-check" title={added ? "Sudah ada di project" : "Pilih istilah"}>
                        <input
                          type="checkbox"
                          checked={added || selected}
                          disabled={added}
                          onChange={() => toggleGlobalTermSelection(term)}
                        />
                      </label>
                      <div>
                        <strong>{term.source_term}</strong>
                        <small>{term.pinyin} · {term.category}</small>
                      </div>
                      <span>{term.default_translation}</span>
                      <button disabled={added} aria-label={`Tambahkan ${term.source_term}`} onClick={() => void addGlossaryTerm(term)}>
                        {added ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-card ${toast.type}`}>
              <span className="toast-icon">
                {toast.type === "success" && <Check size={16} />}
                {toast.type === "error" && <X size={16} />}
                {toast.type === "info" && <Sparkles size={16} />}
              </span>
              <span className="toast-message">{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
