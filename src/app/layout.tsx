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
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
