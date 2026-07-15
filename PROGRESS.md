# AlurDao Development Progress

Dokumen ini mencatat fitur yang telah selesai, pekerjaan aktif, keputusan teknis, dan langkah berikutnya.

Pembaruan dokumentasi 2 Juli 2026: README utama telah disusun ulang mengikuti pola dokumentasi project multi-bagian—overview, status, arsitektur, quick start, konfigurasi, fitur, API, database, pengujian, troubleshooting, dan struktur direktori—dengan gaya visual minimal tanpa badge atau dekorasi berlebihan.

## Status

- [x] Landing page dan workspace awal
- [x] Demo terjemahan landing page: 2 percobaan/24 jam, 500 karakter, cookie HMAC HttpOnly
- [x] Perbandingan paket Demo, Free, dan Premium pada landing page
- [x] Supabase PostgreSQL, migration, relasi, dan Row Level Security
- [x] Project Supabase Cloud AlurDao terhubung dan migration 001-010 tersinkron
- [x] Adapter demo, Mistral, Gemini, Groq, dan Ollama
- [x] Konfigurasi awal enam genre novel China
- [x] Kontrak response API JSON yang konsisten
- [x] Pengerasan adapter: timeout, retry, usage, dan error mapping
- [x] Konfigurasi enam genre dipusatkan dalam satu modul
- [x] Bank kosakata global dan override glosarium project
- [x] Endpoint pencarian kosakata berdasarkan teks dan genre
- [x] Demo landing page mendukung empat gaya terjemahan: Natural, Dramatis, Formal, dan Ringan
- [x] UX glosarium diperbarui dengan summary, checkbox, pilih semua terlihat, batal pilih, dan tambah istilah terpilih
- [x] Prompt terjemahan diperketat agar AI tidak menambah adegan, nama, atau informasi di luar teks sumber
- [x] Dataset evaluasi awal dengan satu kasus untuk setiap genre
- [x] Evaluation runner JSON untuk konsistensi istilah dan deteksi source-copy
- [x] Evaluasi otomatis enam genre dengan Mistral: 6/6 lulus
- [ ] Perbandingan hasil Mistral dengan Ollama lokal
- [x] Autentikasi email/password melalui Supabase Auth
- [x] CRUD project dan chapter dengan Row Level Security
- [x] Autosave teks sumber dan hasil terjemahan
- [x] Glosarium global terhubung ke glosarium project
- [x] Riwayat proses terjemahan tersimpan di PostgreSQL
- [x] Logout dan kontrol sidebar
- [x] Google OAuth button dan callback PKCE
- [x] Google OAuth credentials aktif pada Supabase Cloud; endpoint terverifikasi redirect ke Google
- [ ] Google OAuth diuji interaktif sampai kembali ke Studio
- [x] Reset password melalui email dan halaman pembuatan password baru
- [x] Upload bab `.txt`/`.md` maksimal 1 MB dengan konfirmasi sebelum mengganti teks
- [x] Paket free: 2 project, 10 bab/project, 15.000 karakter/bulan, 5.000 karakter/request
- [x] Role admin tanpa kuota bulanan, maksimal 20.000 karakter/request, dengan plan/limit terkunci dari browser
- [x] Auth wajib pada endpoint terjemahan
- [x] Reservasi dan refund kuota secara atomik
- [x] Pencatatan riwayat terjemahan dipindahkan ke server
- [x] Security headers dasar Next.js
- [x] Tema terang/gelap/sistem dan skala tampilan responsif tersimpan per perangkat
- [x] Optimasi posisi kontrol tampilan, autofill input dark mode, dan judul drawer untuk project panjang
- [x] Perbaikan overflow card dan ellipsis judul project pada sidebar
- [x] Prompt penyuntingan akhir untuk SPOK, PUEBI, typo, repetisi, dan konsistensi bahasa target
- [x] Catatan revisi manual PPT untuk nilai jual slide 3 dan indexing Google slide 5
- [x] Billing Premium dijadikan placeholder untuk demo; transaksi Midtrans nyata dinonaktifkan secara default
- [x] Skema pembayaran Midtrans Sandbox dan webhook tetap tersedia untuk tahap berikutnya melalui `MIDTRANS_ENABLE_REAL_CHECKOUT=true`
- [x] Monitoring request/error API dan dashboard admin
- [x] Dokumentasi API Swagger/OpenAPI di `/docs/api` dan `/api/openapi`
- [x] Asset vendor Swagger dikecualikan dari ESLint agar pemeriksaan hanya menilai source code aplikasi
- [x] `.gitignore` diperbarui untuk cache Next.js, Supabase lokal, test report, asset Swagger hasil generate, dan hasil evaluasi lokal
- [x] Audit UI/UX landing, auth, dan docs API dengan Edge headless; overflow genre strip mobile dan copy limit project diperbaiki
- [x] Audit responsif lanjutan pada mobile 360/390, tablet 768, laptop 1366, dan FHD 1920; genre strip tablet dan dekorasi hero mobile dirapikan agar tidak overflow
- [x] Area Studio diperkuat untuk mencegah teks panjang tertutup sidebar/topbar: judul memakai ellipsis, toolbar bisa wrap, dan select bahasa tidak melebar keluar panel
- [ ] Kredensial Midtrans, Service Role server, Redirect URL Cloud, dan SMTP production dikonfigurasi saat checkout nyata akan diaktifkan
- [ ] Persiapan layanan Python untuk AI lokal lanjutan

## Sedang Dikerjakan

Menyelesaikan satu pengujian Google OAuth interaktif sampai Studio. Billing Midtrans dipertahankan sebagai placeholder sampai tahap integrasi pembayaran nyata.

## Keputusan Teknis

- Next.js dan TypeScript menjadi aplikasi utama.
- Supabase/PostgreSQL digunakan untuk data relasional dan autentikasi.
- Provider LLM dipilih melalui environment variable.
- Endpoint API memakai envelope JSON seragam dengan request ID dan metadata durasi.
- Error sementara dari provider dicoba ulang maksimal tiga kali.
- Bank kosakata global dinormalisasi menjadi istilah, relasi genre, dan alias.
- Glosarium project dapat mengacu ke istilah global lalu mengganti padanannya secara lokal.
- Project dan Bab 1 dibuat atomik melalui fungsi PostgreSQL.
- Autosave berjalan 900 milidetik setelah perubahan terakhir.
- Workspace menggunakan Supabase secara langsung dengan perlindungan RLS.
- Kuota freemium ditegakkan oleh PostgreSQL dan endpoint server, bukan UI.
- Request AI tanpa sesi login ditolak sebelum provider dipanggil.
- Swagger UI disajikan sebagai asset statis di `public/swagger-ui` dan tidak dilint sebagai source aplikasi.

## Pengujian Fitur Nyata

### End-to-end lokal — 1 Juli 2026

- Pendaftaran akun: lulus
- Pembuatan project + Bab 1: lulus
- Autosave teks sumber: lulus
- Pencarian bank kosakata: lulus
- Penambahan istilah ke glosarium project: lulus
- Terjemahan dan penyimpanan hasil: lulus
- Penambahan Bab 2: lulus

### Audit kode lokal — 15 Juli 2026

- Temuan: `npm run lint` sempat gagal karena ESLint membaca file vendor `public/swagger-ui/swagger-ui-bundle.js`.
- Perbaikan: `public/swagger-ui/**` ditambahkan ke global ignore ESLint.
- Temuan UI: genre strip pada landing mobile memakai horizontal scroll; diubah menjadi chip yang wrap agar lebih nyaman di layar kecil.
- Temuan copy: pesan batas project masih menyebut 3 project, diselaraskan menjadi batas project paket Free.
- Hasil validasi: `npm run lint`, build production, landing, auth, docs API, OpenAPI JSON, dan asset Swagger lulus pada audit terakhir.

## Hasil Evaluasi

### Smoke Test Mistral - 1 Juli 2026

- Login/token pengguna pada endpoint terjemahan: lulus
- Provider `mistral-small-latest`: lulus
- Hasil Mandarin ke Indonesia: lulus
- Pencatatan kuota server: lulus
- Evaluasi awal satu kalimat: lulus

### Evaluasi Mistral Enam Genre — 2 Juli 2026

- Provider/model: Mistral `mistral-small-latest`
- Kasus: Xianxia, Xuanhuan, Wuxia, Qihuan, Mohuan, dan Kehuan
- Pemeriksaan otomatis lulus: 6/6 (100%)
- Glosarium wajib: seluruh istilah ditemukan
- Source-copy, repetisi, dan istilah asing terlarang: tidak ditemukan
- Catatan manual: hasil Qihuan masih dapat diperhalus dari “Seorang penyihir muda itu” menjadi “Penyihir muda itu”.

### Baseline Demo — 1 Juli 2026

- Kasus: 6 genre
- Lulus: 1
- Gagal: 5
- Pass rate: 16,7%
- Interpretasi: sesuai ekspektasi karena provider demo hanya menerjemahkan satu contoh xianxia dan menyalin sumber untuk input lain.
- Langkah berikutnya: jalankan dataset yang sama menggunakan Mistral, nilai kelancaran secara manual, lalu simpan hasil sebagai baseline provider nyata.
- Python/FastAPI ditambahkan hanya ketika pipeline AI lokal membutuhkan RAG, batch processing, embedding, atau fine-tuning.
