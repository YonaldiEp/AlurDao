# AlurDao

AlurDao adalah website penerjemahan AI untuk berbagai genre novel China—xianxia, xuanhuan, wuxia, qihuan, mohuan, hingga kehuan—dibangun dengan Next.js, TypeScript, Supabase, dan provider AI yang dapat ditukar.

> Membawa kisah Tiongkok mengalir dalam bahasamu.

## Menjalankan aplikasi

```bash
npm install
copy .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`. Tanpa API key, workspace berjalan dalam mode demo.

## Fitur workspace

- Demo terjemahan langsung di landing page tanpa login, dibatasi 2 percobaan per browser/24 jam dan 500 karakter/request.
- Daftar dan masuk menggunakan Supabase Auth.
- Membuat serta menghapus project milik pengguna.
- Project baru dibuat bersama Bab 1 dalam satu transaksi PostgreSQL.
- Menambah, memilih, dan menghapus bab.
- Autosave teks sumber dan hasil terjemahan setelah 900 milidetik.
- Memilih genre, gaya terjemahan, serta bahasa target per project.
- Mencari bank kosakata berdasarkan genre dan menambahkannya ke glosarium project.
- Mengirim glosarium project bersama request AI agar istilah tetap konsisten.
- Menyimpan catatan provider, model, jumlah karakter, dan durasi setiap proses terjemahan.
- Menyalin hasil, menutup sidebar, dan keluar dari akun.
- Tema terang, gelap, atau mengikuti sistem yang tersimpan pada perangkat pengguna.
- Skala tampilan Auto, 100%, 112%, dan 125%; mode Auto membesarkan UI pada layar desktop Full HD.
- Kontrol tampilan ditempatkan kontekstual di navbar, form autentikasi, dan topbar Studio agar tidak menutupi aksi utama atau drawer.
- Card project tetap mengikuti lebar sidebar; judul panjang dipotong dengan ellipsis pada semua skala tampilan.

Semua data pengguna dilindungi Row Level Security. Pengguna hanya dapat membaca atau mengubah project, bab, glosarium, dan riwayat miliknya sendiri.

## Paket freemium

Paket `free` saat ini memiliki batas server-side:

- 2 project aktif.
- 10 bab per project.
- 15.000 karakter terjemahan per bulan.
- Maksimal 5.000 karakter dalam satu request.

Kuota dicadangkan secara atomik sebelum provider AI dipanggil. Jika provider gagal, reservasi dikembalikan. Pengguna tanpa sesi login menerima response `AUTH_REQUIRED`, sedangkan pengguna yang melewati batas menerima `QUOTA_EXCEEDED`. Riwayat penggunaan ditulis oleh server agar tidak dapat dilewati dari browser.

Plan `admin` melewati kuota bulanan dan dapat menerjemahkan maksimal 20.000 karakter per request. Paket Free tetap dibatasi 5.000 karakter/request. Kolom plan dan limit tidak dapat diubah oleh pengguna melalui browser.

Landing page juga menampilkan jalur paket Demo, Free, dan Premium. Premium masih berstatus segera hadir dan belum memiliki billing aktif.

## Demo landing page

Endpoint `GET/POST /api/demo/translate` menggunakan cookie `HttpOnly` bertanda tangan HMAC. Pemakaian dibatasi menjadi 2 terjemahan per browser dalam 24 jam, masing-masing maksimal 500 karakter. Atur secret server berikut di `.env.local` dan environment hosting:

```env
DEMO_COOKIE_SECRET=buat-random-secret-minimal-32-karakter
```

Jika secret khusus belum tersedia, development dapat memakai API key provider sebagai fallback server-side. Untuk deployment publik, gunakan `DEMO_COOKIE_SECRET` terpisah. Cookie merupakan pencegah penyalahgunaan ringan; rate limit IP atau penyimpanan server tetap disarankan jika trafik meningkat.

## Google OAuth

Kode tombol Google dan callback PKCE sudah tersedia di `/auth` dan `/auth/callback`. Untuk mengaktifkannya:

Status cloud 1 Juli 2026: provider Google aktif pada project AlurDao dan endpoint OAuth telah terverifikasi mengarahkan pengguna ke `accounts.google.com`. Pengujian consent/login penuh tetap dilakukan melalui browser menggunakan akun Google pengguna.

1. Buat OAuth Client bertipe **Web application** di Google Auth Platform.
2. Tambahkan origin aplikasi, misalnya `http://localhost:3000`.
3. Untuk Supabase lokal, tambahkan Authorized Redirect URI `http://127.0.0.1:54321/auth/v1/callback`.
4. Untuk Supabase hosted, gunakan `https://PROJECT_REF.supabase.co/auth/v1/callback`.
5. Hosted: buka **Supabase Dashboard → Authentication → Providers → Google**, lalu masukkan Client ID dan Client Secret.
6. Lokal: buka blok `[auth.external.google]` di `supabase/config.toml`, atur environment variables berikut, lalu restart Supabase:

```powershell
$env:SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="client-id-google"
$env:SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET="client-secret-google"
npx.cmd supabase stop
npx.cmd supabase start
```

Client Secret tidak boleh menggunakan prefix `NEXT_PUBLIC_` dan tidak boleh di-commit. Panduan resmi: https://supabase.com/docs/guides/auth/social-login/auth-google

## Memilih provider AI

Atur `AI_PROVIDER` di `.env.local` menjadi `demo`, `mistral`, `gemini`, `groq`, atau `ollama`, lalu isi konfigurasi provider tersebut.

Untuk Mistral:

```env
AI_PROVIDER=mistral
MISTRAL_API_KEY=key_baru_milikmu
MISTRAL_MODEL=mistral-small-latest
```

Untuk Ollama:

```bash
ollama pull qwen3:4b
ollama serve
```

Kemudian gunakan:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen3:4b
```

## Kontrak API

Endpoint `POST /api/translate` selalu mengembalikan JSON. Response sukses menggunakan bentuk:

```json
{
  "success": true,
  "data": {
    "translation": "Hasil terjemahan",
    "provider": "Mistral",
    "model": "mistral-small-latest",
    "durationMs": 1250
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-07-01T00:00:00.000Z",
    "durationMs": 1255
  }
}
```

Response gagal menggunakan `success: false` serta objek `error` berisi `code`, `message`, dan detail aman. Adapter melakukan maksimal tiga percobaan untuk error sementara serta mencatat penggunaan token jika provider menyediakannya.

Konfigurasi setiap genre dipusatkan di `src/config/genres.ts`. Request terjemahan dapat menyertakan maksimal 200 pasangan glosarium melalui properti `glossary`.

## Bank kosakata

Bank kosakata memakai tiga tabel ternormalisasi:

- `glossary_terms`: istilah utama, pinyin, terjemahan default, kategori, dan status review.
- `glossary_term_genres`: relasi many-to-many antara istilah dan genre.
- `glossary_aliases`: transliterasi atau padanan alternatif tanpa menduplikasi istilah utama.

Tabel `glossary_entries` tetap digunakan untuk glosarium khusus project dan dapat menunjuk ke istilah global melalui `global_term_id`. Terjemahan project dapat menggantikan padanan global tanpa mengubah bank utama.

Pencarian tersedia melalui endpoint JSON:

```text
GET /api/glossary?q=energi&genre=xianxia&limit=50
```

Migration `202607010003_global_glossary_bank.sql` menyertakan 20 istilah awal yang tersebar pada enam genre.

## Menghubungkan Supabase hosted

Project cloud AlurDao (`uexxrhehajkeaushsgvo`, Singapore) sudah di-link dan migration `202607010001` sampai `202607010006` telah diterapkan pada 1 Juli 2026. Pengembangan lokal hanya perlu mengarahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local` ke project tersebut.

1. Buat project baru di Supabase Dashboard.
2. Salin Project URL dan Publishable Key dari **Project Settings > API** ke `.env.local`.
3. Login CLI dengan `npx supabase login`.
4. Hubungkan project dengan `npx supabase link --project-ref PROJECT_REF`.
5. Terapkan skema dengan `npx supabase db push`.

Migration awal berada di `supabase/migrations/202607010001_initial_schema.sql` dan sudah mengaktifkan Row Level Security.

Migration tambahan:

- `202607010002_add_project_genre.sql`: genre utama project.
- `202607010003_global_glossary_bank.sql`: bank kosakata global dan fungsi pencarian.
- `202607010004_workspace_functions.sql`: transaksi pembuatan project + Bab 1 dan izin riwayat terjemahan.
- `202607010005_freemium_quota.sql`: limit project/bab, reservasi kuota atomik, refund saat provider gagal, dan RPC penambahan bab.
- `202607010006_reduce_free_plan_limits.sql`: menurunkan batas paket Free agar aman untuk kuota provider AI gratis.
- `202607010007_admin_unlimited_quota.sql`: role admin tanpa kuota bulanan dan penguncian kolom plan/limit.
- `202607010008_admin_15k_characters.sql`: tahap peningkatan batas request admin menjadi 15.000 karakter.
- `202607010009_admin_20k_characters.sql`: batas request admin terbaru sebesar 20.000 karakter.

## Pemeriksaan

```bash
npm run lint
npm run build
```

## Evaluasi terjemahan

Dataset awal berada di `evaluation/cases.json` dan memuat satu kasus untuk setiap genre. Jalankan aplikasi, pilih provider melalui `.env.local`, kemudian jalankan:

```bash
npm run evaluate
```

Karena endpoint terjemahan membutuhkan login, runner menerima token pengujian melalui environment variable `EVALUATION_ACCESS_TOKEN`. Jangan menyimpan token tersebut dalam repository.

Laporan JSON memeriksa bahwa output tidak kosong, teks sumber tidak sekadar disalin, dan istilah wajib dari glosarium digunakan. Script mengembalikan exit code `1` jika ada kasus gagal agar dapat dipakai sebagai regression test.

Baseline mode demo pada 1 Juli 2026 adalah **1/6 kasus lulus (16,7%)**. Nilai ini memang rendah karena demo hanya memiliki satu contoh statis.

Smoke test terautentikasi dengan `mistral-small-latest` juga berhasil menerjemahkan satu kalimat Mandarin ke bahasa Indonesia dan mencatat pemakaian kuota. Evaluasi penuh enam genre dengan Mistral masih menjadi pekerjaan berikutnya sebelum dibandingkan dengan Ollama.
