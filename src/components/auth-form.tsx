"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

export function AuthForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/studio");
    });
  }, [router, supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Akun dibuat. Periksa email untuk mengonfirmasi pendaftaran.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      router.replace("/studio");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Autentikasi gagal diproses.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link href="/" className="brand auth-brand">
          <span className="brand-mark">译</span>
          <span>Alur<span>Dao</span></span>
        </Link>
        <div className="auth-story-copy">
          <span className="eyebrow"><BookOpenText size={15} /> Workspace penerjemah</span>
          <h1>Simpan setiap dunia yang sedang kamu terjemahkan.</h1>
          <p>Kelola bab, glosarium, gaya bahasa, dan hasil terjemahan dalam satu tempat yang konsisten.</p>
        </div>
        <span className="auth-hanzi">文</span>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <Link href="/" className="auth-back"><ArrowLeft size={15} /> Kembali ke beranda</Link>
          <div className="auth-heading">
            <span>{mode === "login" ? "Selamat datang kembali" : "Mulai perjalanan baru"}</span>
            <h2>{mode === "login" ? "Masuk ke AlurDao" : "Buat akun AlurDao"}</h2>
            <p>{mode === "login" ? "Lanjutkan project terjemahanmu." : "Simpan project dan glosariummu secara aman."}</p>
          </div>

          <div className="auth-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }}>Masuk</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setMessage(""); }}>Daftar</button>
          </div>

          <form onSubmit={submit} className="auth-form-fields">
            {mode === "register" && (
              <label>
                <span>Nama</span>
                <div><UserRound size={17} /><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required placeholder="Nama lengkap" /></div>
              </label>
            )}
            <label>
              <span>Email</span>
              <div><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="nama@email.com" autoComplete="email" /></div>
            </label>
            <label>
              <span>Password</span>
              <div><LockKeyhole size={17} /><input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Minimal 8 karakter" autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
            </label>

            {message && <div className="auth-message" role="status">{message}</div>}

            <button className="button button-primary auth-submit" disabled={loading}>
              {loading && <LoaderCircle className="spinner" size={17} />}
              {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Buat akun"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
