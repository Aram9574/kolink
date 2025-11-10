"use client";

import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DepthCardProps extends HTMLAttributes<HTMLDivElement> {
  depth?: "sm" | "md" | "lg" | "xl" | "2xl";
  hover?: boolean;
  glass?: boolean;
  children: ReactNode;
}

const depthStyles = {
  sm: "shadow-depth-sm",
  md: "shadow-depth-md",
  lg: "shadow-depth-lg",
  xl: "shadow-depth-xl",
  "2xl": "shadow-depth-2xl",
};

export default function DepthCard({
  depth = "md",
  hover = true,
  glass = false,
  children,
  className,
  ...props
}: DepthCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6 transition-all duration-300",
        depthStyles[depth],
        hover && "hover-lift-sm cursor-pointer",
        glass
          ? "glass"
          : "bg-white dark:bg-secondary-light border border-border-light dark:border-border-dark",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
