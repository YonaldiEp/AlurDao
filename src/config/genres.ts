export const genreIds = [
  "xianxia",
  "xuanhuan",
  "wuxia",
  "qihuan",
  "mohuan",
  "kehuan",
] as const;

export type GenreId = (typeof genreIds)[number];

export type GenreProfile = {
  id: GenreId;
  label: string;
  hanzi: string;
  description: string;
  translationInstruction: string;
};

export const genreProfiles: Record<GenreId, GenreProfile> = {
  xianxia: {
    id: "xianxia",
    label: "Xianxia",
    hanzi: "仙侠",
    description: "Kultivasi, Dao, keabadian, sekte, dan dunia spiritual.",
    translationInstruction:
      "Jaga konsistensi istilah kultivasi, Dao, sekte, ranah, teknik, pil, dan artefak. Gabungkan enklitik Indonesia secara wajar: tulis 'dantiannya', bukan 'dantian-nya'.",
  },
  xuanhuan: {
    id: "xuanhuan",
    label: "Xuanhuan",
    hanzi: "玄幻",
    description: "Fantasi Timur dengan sistem kekuatan dan dunia rekaan.",
    translationInstruction:
      "Jaga konsistensi sistem kekuatan, ras, alam, faksi, kemampuan, dan artefak fantasi Timur.",
  },
  wuxia: {
    id: "wuxia",
    label: "Wuxia",
    hanzi: "武侠",
    description: "Dunia persilatan, jianghu, perguruan, dan kehormatan.",
    translationInstruction:
      "Pertahankan nuansa jianghu, gelar kehormatan, perguruan, ilmu bela diri, dan hubungan antartokoh. Untuk gerakan bela diri gunakan verba alami seperti mengerahkan, melancarkan, atau menggunakan; hindari frasa birokratis seperti 'menerapkan ilmu'.",
  },
  qihuan: {
    id: "qihuan",
    label: "Qihuan",
    hanzi: "奇幻",
    description: "Fantasi dengan sihir, ras, makhluk, dan dunia rekaan.",
    translationInstruction:
      "Jaga istilah sihir, ras, makhluk, tempat, dan worldbuilding fantasi secara konsisten. Dalam konteks fantasi, 法师 wajib diterjemahkan sebagai penyihir, bukan mage atau pendeta; 法杖 berarti tongkat sihir. Hindari konstruksi tidak efektif seperti 'seorang ... itu'; pilih 'penyihir muda itu'.",
  },
  mohuan: {
    id: "mohuan",
    label: "Mohuan",
    hanzi: "魔幻",
    description: "Fantasi magis, supernatural, dan mitologi.",
    translationInstruction:
      "Pertahankan atmosfer fantasi magis, nama entitas, mantra, kekuatan supernatural, dan mitologinya. Terjemahkan 深渊 sebagai jurang maut/abyss sesuai konteks, bukan frasa harfiah 'jurang dalam'.",
  },
  kehuan: {
    id: "kehuan",
    label: "Kehuan",
    hanzi: "科幻",
    description: "Fiksi ilmiah, teknologi, antariksa, dan masa depan.",
    translationInstruction:
      "Terjemahkan istilah ilmiah dan teknologi dengan jelas tanpa menghilangkan ketepatan maknanya.",
  },
};

export const genreOptions = genreIds.map((id) => genreProfiles[id]);
