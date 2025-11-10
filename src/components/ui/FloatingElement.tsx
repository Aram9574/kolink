"use client";

import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FloatingElementProps extends HTMLAttributes<HTMLDivElement> {
  delay?: number;
  children: ReactNode;
}

export default function FloatingElement({
  delay = 0,
  children,
  className,
  ...props
}: FloatingElementProps) {
  return (
    <div
      className={cn("floating", className)}
      style={{ animationDelay: `${delay}s` }}
      {...props}
    >
      {children}
    </div>
  );
}
