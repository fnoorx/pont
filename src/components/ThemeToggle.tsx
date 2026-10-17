import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("ps43-theme", next ? "dark" : "light"); } catch {}
  }
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button variant="ghost" size="icon" type="button" aria-label={label} title={label} onClick={toggle} className={className}>
      {dark ? <Sun className="text-muted-foreground" /> : <Moon className="text-muted-foreground" />}
    </Button>
  );
}

export const themeInitScript = `try{if(localStorage.getItem('ps43-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;
