import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize theme based on user preference
const initializeTheme = () => {
  // Check if user has a saved preference
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    // If no saved preference, use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    localStorage.setItem('theme', 'system');
  }
};

// Initialize theme
initializeTheme();

// Add Font Awesome
const script = document.createElement('script');
script.src = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js";
script.async = true;
document.head.appendChild(script);

// Add Google Fonts
const link = document.createElement('link');
link.rel = "stylesheet";
link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
document.head.appendChild(link);

createRoot(document.getElementById("root")!).render(<App />);
