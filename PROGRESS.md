# AlurDao Development Progress

Dokumen ini mencatat fitur yang telah selesai, pekerjaan aktif, keputusan teknis, dan langkah berikutnya.

## Status

- [x] Landing page dan workspace awal
- [x] Supabase PostgreSQL, migration, relasi, dan Row Level Security
- [x] Adapter demo, Mistral, Gemini, Groq, dan Ollama
- [x] Konfigurasi awal enam genre novel China
- [x] Kontrak response API JSON yang konsisten
- [x] Pengerasan adapter: timeout, retry, usage, dan error mapping
- [x] Konfigurasi enam genre dipusatkan dalam satu modul
- [x] Bank kosakata global dan override glosarium project
- [x] Endpoint pencarian kosakata berdasarkan teks dan genre
- [x] Dataset evaluasi awal dengan satu kasus untuk setiap genre
- [x] Evaluation runner JSON untuk konsistensi istilah dan deteksi source-copy
- [ ] Evaluasi kualitas semantik dengan provider Mistral
- [ ] Perbandingan hasil Mistral dengan Ollama lokal
- [x] Autentikasi email/password melalui Supabase Auth
- [x] CRUD project dan chapter dengan Row Level Security
- [x] Autosave teks sumber dan hasil terjemahan
- [x] Glosarium global terhubung ke glosarium project
- [x] Riwayat proses terjemahan tersimpan di PostgreSQL
- [x] Logout dan kontrol sidebar
- [ ] Persiapan layanan Python untuk AI lokal lanjutan

## Sedang Dikerjakan

Mengaktifkan Mistral dengan API key baru dan menjalankan evaluasi semantik enam genre.

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

## Pengujian Fitur Nyata

### End-to-end lokal — 1 Juli 2026

- Pendaftaran akun: lulus
- Pembuatan project + Bab 1: lulus
- Autosave teks sumber: lulus
- Pencarian bank kosakata: lulus
- Penambahan istilah ke glosarium project: lulus
- Terjemahan dan penyimpanan hasil: lulus
- Penambahan Bab 2: lulus

## Hasil Evaluasi

### Baseline Demo — 1 Juli 2026

- Kasus: 6 genre
- Lulus: 1
- Gagal: 5
- Pass rate: 16,7%
- Interpretasi: sesuai ekspektasi karena provider demo hanya menerjemahkan satu contoh xianxia dan menyalin sumber untuk input lain.
- Langkah berikutnya: jalankan dataset yang sama menggunakan Mistral, nilai kelancaran secara manual, lalu simpan hasil sebagai baseline provider nyata.
- Python/FastAPI ditambahkan hanya ketika pipeline AI lokal membutuhkan RAG, batch processing, embedding, atau fine-tuning.
