import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AlurDao — AI Penerjemah Novel China",
    template: "%s · AlurDao",
  },
  description:
    "Terjemahkan berbagai genre novel China ke bahasa Indonesia secara natural, kontekstual, dan konsisten.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preferenceScript = `(() => { try {
    const preference = localStorage.getItem("alurdao-theme") || "system";
    const dark = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.fontScale = localStorage.getItem("alurdao-font-scale") || "auto";
  } catch (_) {} })();`;

  return (
    <html lang="id" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: preferenceScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
