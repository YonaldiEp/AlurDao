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
      "Jaga konsistensi istilah kultivasi, Dao, sekte, ranah, teknik, pil, dan artefak.",
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
      "Pertahankan nuansa jianghu, gelar kehormatan, perguruan, ilmu bela diri, dan hubungan antartokoh.",
  },
  qihuan: {
    id: "qihuan",
    label: "Qihuan",
    hanzi: "奇幻",
    description: "Fantasi dengan sihir, ras, makhluk, dan dunia rekaan.",
    translationInstruction:
      "Jaga istilah sihir, ras, makhluk, tempat, dan worldbuilding fantasi secara konsisten.",
  },
  mohuan: {
    id: "mohuan",
    label: "Mohuan",
    hanzi: "魔幻",
    description: "Fantasi magis, supernatural, dan mitologi.",
    translationInstruction:
      "Pertahankan atmosfer fantasi magis, nama entitas, mantra, kekuatan supernatural, dan mitologinya.",
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
