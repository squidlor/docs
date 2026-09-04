import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, isSystem, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={
        isSystem
          ? `Following system (${theme}). Switch to ${next}`
          : `Switch to ${next} theme`
      }
      aria-label={`Switch to ${next} theme`}
      className="relative grid h-8 w-8 place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
    >
      {/* Both icons are mounted; opacity + rotation cross-fades them. */}
      <Sun
        strokeWidth={2}
        className="absolute h-[1.05rem] w-[1.05rem] rotate-[-70deg] scale-50 opacity-0 transition-all duration-200 dark:rotate-0 dark:scale-100 dark:opacity-100"
      />
      <Moon
        strokeWidth={2}
        className="absolute h-[1.05rem] w-[1.05rem] rotate-0 scale-100 opacity-100 transition-all duration-200 dark:rotate-[70deg] dark:scale-50 dark:opacity-0"
      />
    </button>
  );
}
