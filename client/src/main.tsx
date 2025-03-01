import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Always use light mode as requested
document.documentElement.classList.add('light');
document.documentElement.classList.remove('dark');
localStorage.setItem('theme', 'light');

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
