"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Settings2, Sun, Type, X } from "lucide-react";

type ThemePreference = "system" | "light" | "dark";
type FontPreference = "auto" | "normal" | "comfortable" | "large";

const themeOptions: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "system", label: "Sistem", icon: Monitor },
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
];

const fontOptions: Array<{ value: FontPreference; label: string; detail: string }> = [
  { value: "auto", label: "Auto", detail: "Sesuai layar" },
  { value: "normal", label: "100%", detail: "Normal" },
  { value: "comfortable", label: "112%", detail: "Nyaman" },
  { value: "large", label: "125%", detail: "Besar" },
];

function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = preference;
}

function applyFont(preference: FontPreference) {
  document.documentElement.dataset.fontScale = preference;
}

export function DisplayPreferences() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [font, setFont] = useState<FontPreference>("auto");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("alurdao-theme") as ThemePreference | null) ?? "system";
    const savedFont = (localStorage.getItem("alurdao-font-scale") as FontPreference | null) ?? "auto";
    applyTheme(savedTheme);
    applyFont(savedFont);
    const frame = window.requestAnimationFrame(() => {
      setTheme(savedTheme);
      setFont(savedFont);
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if ((localStorage.getItem("alurdao-theme") ?? "system") === "system") applyTheme("system");
    };
    media.addEventListener("change", syncSystemTheme);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", syncSystemTheme);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const chooseTheme = (value: ThemePreference) => {
    setTheme(value);
    localStorage.setItem("alurdao-theme", value);
    applyTheme(value);
  };

  const chooseFont = (value: FontPreference) => {
    setFont(value);
    localStorage.setItem("alurdao-font-scale", value);
    applyFont(value);
  };

  return (
    <div className="display-preferences" ref={panelRef}>
      {open && (
        <section className="display-panel" role="dialog" aria-label="Pengaturan tampilan">
          <div className="display-panel-heading">
            <div><span>Tampilan</span><strong>Nyaman untuk matamu</strong></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup pengaturan"><X size={17} /></button>
          </div>

          <div className="display-setting-group">
            <label><Sun size={15} /> Tema</label>
            <div className="display-option-grid theme-options">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return <button type="button" className={theme === option.value ? "active" : ""} onClick={() => chooseTheme(option.value)} key={option.value}><Icon size={15} /><span>{option.label}</span></button>;
              })}
            </div>
          </div>

          <div className="display-setting-group">
            <label><Type size={15} /> Ukuran tampilan</label>
            <div className="display-option-grid font-options">
              {fontOptions.map((option) => <button type="button" className={font === option.value ? "active" : ""} onClick={() => chooseFont(option.value)} key={option.value}><strong>{option.label}</strong><small>{option.detail}</small></button>)}
            </div>
          </div>
        </section>
      )}
      <button className="display-trigger" type="button" aria-label="Buka pengaturan tema dan ukuran tampilan" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Settings2 size={18} /><span>Tampilan</span>
      </button>
    </div>
  );
}
