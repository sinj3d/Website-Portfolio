"use client";

import { useTheme } from "./ThemeProvider";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? theme === "dark" : true; // Default to dark state during SSR

  return (
    <button
      id="theme-toggle"
      onClick={mounted ? toggleTheme : undefined}
      aria-label="Toggle dark mode"
      className="fixed top-5 right-5 z-[300] flex items-center justify-center w-10 h-10 rounded-full
        border border-zinc-300 dark:border-zinc-600
        bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md
        text-zinc-700 dark:text-zinc-200
        shadow-lg hover:scale-110
        transition-all duration-300 cursor-pointer"
    >
      <div className={`relative w-5 h-5 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Sun icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
            mounted
              ? (isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0")
              : "opacity-100 rotate-0 scale-100"
          }`}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        {/* Moon icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
            mounted
              ? (isDark ? "opacity-0 -rotate-90 scale-0" : "opacity-100 rotate-0 scale-100")
              : "opacity-0 -rotate-90 scale-0"
          }`}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>
    </button>
  );
}
