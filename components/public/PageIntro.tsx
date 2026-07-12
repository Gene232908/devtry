"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageIntro({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false);

  return (
    <div
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setDone(true);
      }}
      className={cn("motion-reduce:animate-none", !done && "animate-page-intro")}
    >
      {children}
    </div>
  );
}
