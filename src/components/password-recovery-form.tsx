"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm({ update = false }: { update?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (update) {
        if (password !== confirmation) throw new Error("Konfirmasi password belum sama.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password berhasil diperbarui. Silakan masuk kembali.");
      } else {
        const redirectTo = `${window.location.origin}/auth/callback?next=/auth/update-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        setMessage("Jika email terdaftar, tautan reset telah dikirim. Periksa kotak masuk dan folder spam.");
      }
      setSuccess(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Permintaan belum dapat diproses.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="recovery-shell">
      <form className="recovery-card" onSubmit={submit}>
        <Link href="/auth" className="auth-back"><ArrowLeft size={16} /> Kembali ke halaman masuk</Link>
        <span className="kicker">Keamanan akun</span>
        <h1>{update ? "Buat password baru" : "Lupa password?"}</h1>
        <p>{update ? "Gunakan minimal 8 karakter dan jangan memakai password lama." : "Masukkan email akunmu. Kami akan mengirim tautan reset yang aman."}</p>
        {!update ? (
          <label className="recovery-field"><span>Email</span><div><Mail size={18} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" /></div></label>
        ) : (
          <>
            <label className="recovery-field"><span>Password baru</span><div><LockKeyhole size={18} /><input type={visible ? "text" : "password"} required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={visible ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            <label className="recovery-field"><span>Ulangi password baru</span><div><LockKeyhole size={18} /><input type={visible ? "text" : "password"} required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div></label>
          </>
        )}
        {message && <div className={success ? "recovery-success" : "auth-message"} role="status" aria-live="polite">{message}</div>}
        {!success && <button className="button button-primary" disabled={loading}>{loading && <LoaderCircle className="spinner" size={17} />}{loading ? "Memproses..." : update ? "Simpan password baru" : "Kirim tautan reset"}</button>}
        {success && <Link className="button button-primary" href="/auth">Masuk ke AlurDao</Link>}
      </form>
    </main>
  );
}
