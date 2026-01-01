import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initClientErrorReporter } from "@/lib/clientErrorReporter";

initClientErrorReporter();

// Initialize theme on load
const initTheme = () => {
  const stored = localStorage.getItem('app-theme');
  const validThemes = ['nike', 'nike-volt', 'arctic-pro', 'light-minimal', 'frost-minimal'];
  const theme = stored && validThemes.includes(stored) ? stored : 'arctic-pro';
  
  document.documentElement.classList.add(`theme-${theme}`);
  // Light themes
  if (theme === 'light-minimal' || theme === 'frost-minimal') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.add('dark');
  }
};
initTheme();

createRoot(document.getElementById("root")!).render(<App />);
