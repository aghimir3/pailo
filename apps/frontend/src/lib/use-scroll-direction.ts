"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns true when the user is scrolling down (hide nav),
 * false when scrolling up or at top (show nav).
 */
export function useScrollDirection(threshold = 10): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 60) {
          // Always show at top of page
          setHidden(false);
        } else if (y - lastY.current > threshold) {
          setHidden(true);
        } else if (lastY.current - y > threshold) {
          setHidden(false);
        }
        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}
