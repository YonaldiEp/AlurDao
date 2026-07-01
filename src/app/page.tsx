import Link from "next/link";
import { DisplayPreferences } from "@/components/display-preferences";
import { LandingDemo } from "@/components/landing-demo";
import {
  ArrowRight,
  BookOpenText,
  Check,
  Languages,
  LibraryBig,
  Sparkles,
  WandSparkles,
} from "lucide-react";

const features = [
  {
    icon: LibraryBig,
    title: "Glosarium yang konsisten",
    description:
      "Nama tokoh, faksi, jurus, sihir, teknologi, dan sistem kekuatan tetap konsisten di setiap bab.",
  },
  {
    icon: WandSparkles,
    title: "Bahasa yang terasa natural",
    description:
      "Pilih gaya ringan, formal, atau dramatis tanpa menghilangkan nuansa cerita aslinya.",
  },
  {
    icon: BookOpenText,
    title: "Memahami konteks bab",
    description:
      "Terjemahan mempertimbangkan adegan dan hubungan antarkalimat, bukan kata demi kata.",
  },
];

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="AlurDao beranda">
      <span className="brand-mark">译</span>
      <span>Alur<span>Dao</span></span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="site-shell">
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Navigasi utama">
          <Brand />
          <div className="nav-links">
            <a href="#demo">Demo</a>
            <a href="#fitur">Fitur</a>
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#paket">Paket</a>
            <DisplayPreferences />
            <span className="nav-divider" />
            <Link className="button button-ghost" href="/auth">
              Masuk
            </Link>
            <Link className="button button-primary button-small" href="/auth">
              Coba gratis
            </Link>
          </div>
        </nav>
      </header>

      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={15} /> Dirancang untuk novel Tiongkok
          </div>
          <h1>
            Terjemahan novel China yang <em>paham dunianya.</em>
          </h1>
          <p className="hero-lead">
            Ubah bab Mandarin menjadi bahasa Indonesia yang mengalir, konsisten,
            dan tetap membawa jiwa cerita—dari dunia kultivasi hingga fiksi ilmiah.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/auth">
              Mulai menerjemahkan <ArrowRight size={18} />
            </Link>
            <a className="text-link" href="#demo">
              Coba demo langsung
            </a>
          </div>
          <div className="trust-row">
            <span><Check size={16} /> Tanpa kartu kredit</span>
            <span><Check size={16} /> 2 demo tanpa daftar</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Contoh hasil terjemahan">
          <div className="moon-glow" />
          <div className="seal seal-one">道</div>
          <div className="seal seal-two">气</div>
          <article className="translation-card source-card">
            <div className="card-head">
              <span className="language-dot red" />
              <span>中文 · Sumber</span>
              <span className="card-meta">Bab 127</span>
            </div>
            <p className="chinese-copy">
              林玄缓缓睁开双眼，丹田内的灵气如江河般奔涌。
            </p>
            <div className="term-chip">丹田 <span>→ dantian</span></div>
            <div className="term-chip">灵气 <span>→ energi spiritual</span></div>
          </article>
          <article className="translation-card result-card">
            <div className="card-head">
              <span className="language-dot jade" />
              <span>Indonesia · Natural</span>
              <Sparkles className="card-meta sparkle" size={16} />
            </div>
            <p>
              Lin Xuan perlahan membuka matanya. Energi spiritual di dalam
              dantiannya bergemuruh deras bagai sungai yang meluap.
            </p>
            <div className="quality-line">
              <span>Konsistensi istilah</span><strong>98%</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="genre-strip">
        <div className="container genre-inner">
          <span>Dibuat khusus untuk</span>
          <strong>仙侠 Xianxia</strong>
          <i />
          <strong>玄幻 Xuanhuan</strong>
          <i />
          <strong>武侠 Wuxia</strong>
          <i />
          <strong>奇幻 Qihuan</strong>
          <i />
          <strong>魔幻 Mohuan</strong>
          <i />
          <strong>科幻 Kehuan</strong>
        </div>
      </section>

      <LandingDemo />

      <section className="section container" id="fitur">
        <div className="section-heading">
          <span className="kicker">Bukan sekadar terjemahan mesin</span>
          <h2>Setiap istilah punya tempat di dunianya.</h2>
          <p>
            AlurDao menjaga hal-hal kecil yang membuat pembaca benar-benar
            tenggelam dalam cerita.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, description }, index) => (
            <article className="feature-card" key={title}>
              <div className="feature-number">0{index + 1}</div>
              <span className="icon-box"><Icon size={23} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="cara-kerja">
        <div className="container workflow-grid">
          <div>
            <span className="kicker">Alur yang sederhana</span>
            <h2>Dari naskah mentah menjadi bab yang siap dibaca.</h2>
          </div>
          <ol className="steps">
            <li><span>1</span><div><strong>Tempel naskah</strong><p>Tempel teks Mandarin ke editor bab.</p></div></li>
            <li><span>2</span><div><strong>Pilih gaya</strong><p>Atur nada dan glosarium sesuai novelmu.</p></div></li>
            <li><span>3</span><div><strong>Terjemahkan & sunting</strong><p>AI membuat draf, kamu tetap memegang kendali.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="section plans-section" id="paket">
        <div className="container">
          <div className="section-heading"><span className="kicker">Mulai sesuai kebutuhan</span><h2>Dari mencoba gratis hingga menerjemahkan lebih serius.</h2></div>
          <div className="plan-grid">
            <article className="plan-card"><span>Demo</span><h3>Tanpa akun</h3><ul><li>2 percobaan per 24 jam</li><li>500 karakter per percobaan</li><li>Natural dan Ringan</li></ul><a href="#demo">Coba sekarang</a></article>
            <article className="plan-card featured"><span>Free</span><h3>Untuk mulai project</h3><ul><li>15.000 karakter per bulan</li><li>2 project dan 10 bab/project</li><li>Glosarium serta autosave</li></ul><Link href="/auth">Buat akun Free</Link></article>
            <article className="plan-card"><span>Premium · segera hadir</span><h3>Untuk penerjemah aktif</h3><ul><li>Kuota dan project lebih besar</li><li>Prioritas pemrosesan</li><li>Fitur workflow lanjutan</li></ul><div className="plan-status">Belum tersedia</div></article>
          </div>
        </div>
      </section>

      <section className="cta-section container">
        <div className="cta-card">
          <div className="cta-symbol"><Languages size={36} /></div>
          <div>
            <span className="kicker light">Mulai perjalananmu</span>
            <h2>Satu bab lebih dekat dengan pembacamu.</h2>
          </div>
          <Link className="button button-light" href="/auth">
            Coba workspace <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="footer container">
        <Brand />
        <p>Terjemahkan dengan cepat. Ceritakan dengan utuh.</p>
        <span>© 2026 AlurDao</span>
      </footer>
    </main>
  );
}
