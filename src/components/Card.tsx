"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "elevated" | "glass" | "gradient";
  depth?: "sm" | "md" | "lg" | "xl";
  hover?: boolean;
};

export default function Card({
  className = "",
  variant = "default",
  depth = "md",
  hover = true,
  ...props
}: CardProps) {
  const baseStyles = "rounded-3xl p-6 transition-all duration-300";

  const variantStyles = {
    default:
      "bg-white dark:bg-secondary-light border border-border-light dark:border-border-dark",
    elevated:
      "bg-white dark:bg-surface-elevated-dark border border-border-light/50 dark:border-border-dark/50 backdrop-blur-sm",
    glass: "glass",
    gradient:
      "bg-gradient-to-br from-white to-surface-light dark:from-secondary-light dark:to-secondary border border-border-light dark:border-border-dark",
  };

  const depthStyles = {
    sm: "shadow-depth-sm",
    md: "shadow-depth-md",
    lg: "shadow-depth-lg",
    xl: "shadow-depth-xl",
  };

  const hoverStyles = hover
    ? "hover-lift-sm hover:shadow-depth-xl dark:hover:shadow-depth-2xl"
    : "";

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        depthStyles[depth],
        hoverStyles,
        className
      )}
      {...props}
    />
  );
}
