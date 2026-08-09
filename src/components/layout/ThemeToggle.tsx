"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Dark/light theme toggle. Persists the choice in localStorage and toggles the
 * `dark` class on <html>. The persisted value is applied before hydration by a
 * tiny inline script in root layout.tsx to avoid a flash of the wrong theme.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle dark mode"
      className="p-2 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}