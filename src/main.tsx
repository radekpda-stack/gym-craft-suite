import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initClientErrorReporter } from "@/lib/clientErrorReporter";

initClientErrorReporter();

// Initialize theme on load (keep in sync with src/hooks/useTheme)
const initTheme = () => {
  const stored = localStorage.getItem('app-theme');
  const validThemes = ['nike', 'nike-volt', 'arctic-pro', 'light-minimal', 'frost-minimal'] as const;
  const lightThemes = ['light-minimal', 'frost-minimal'];
  const defaultDark = 'arctic-pro';
  const defaultLight = 'frost-minimal';
  
  let theme: string;
  
  if (stored === 'system') {
    // Detect system preference
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
    theme = prefersDark ? defaultDark : defaultLight;
  } else if (stored && (validThemes as readonly string[]).includes(stored)) {
    theme = stored;
  } else {
    theme = defaultDark;
  }

  // Clear any previous theme classes (in case of hot reload / embedded contexts)
  const root = document.documentElement;
  const body = document.body;
  validThemes.forEach(t => {
    root.classList.remove(`theme-${t}`);
    body?.classList.remove(`theme-${t}`);
  });

  root.classList.add(`theme-${theme}`);
  body?.classList.add(`theme-${theme}`);

  const isLight = lightThemes.includes(theme);
  root.classList.toggle('dark', !isLight);
  root.classList.toggle('light', isLight);
  body?.classList.toggle('dark', !isLight);
  body?.classList.toggle('light', isLight);

  root.setAttribute('data-theme', theme);
  root.setAttribute('data-color-mode', isLight ? 'light' : 'dark');
  root.style.colorScheme = isLight ? 'light' : 'dark';
};
initTheme();

createRoot(document.getElementById("root")!).render(<App />);
