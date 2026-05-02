"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <div aria-label="Theme" className="theme-toggle" role="group">
      <Button aria-label="Use light mode" size="icon" title="Light" variant="ghost" onClick={() => setTheme("light")}>
        <Sun aria-hidden="true" size={17} />
      </Button>
      <Button aria-label="Use dark mode" size="icon" title="Dark" variant="ghost" onClick={() => setTheme("dark")}>
        <Moon aria-hidden="true" size={17} />
      </Button>
      <Button aria-label="Use system theme" size="icon" title="System" variant="ghost" onClick={() => setTheme("system")}>
        <Monitor aria-hidden="true" size={17} />
      </Button>
    </div>
  );
}
