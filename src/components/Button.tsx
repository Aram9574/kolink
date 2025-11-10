"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "action"
  | "success"
  | "warning"
  | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  depth?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-[0_20px_45px_rgba(3,115,254,0.25)] hover:from-primary-500 hover:to-primary-700 focus-visible:ring-primary/40 border border-primary/10",
  secondary:
    "bg-gradient-to-br from-secondary to-secondary-dark text-white shadow-depth-lg hover:shadow-depth-2xl focus-visible:ring-secondary/30 border border-secondary/10",
  action:
    "bg-gradient-to-br from-complementary-orange to-complementary-coral text-white shadow-[0_25px_45px_rgba(255,107,53,0.25)] hover:shadow-[0_30px_55px_rgba(255,107,53,0.3)] focus-visible:ring-complementary-orange/40 border border-complementary-orange/20",
  success:
    "bg-gradient-to-br from-action-success to-emerald-600 text-white shadow-[0_20px_45px_rgba(16,185,129,0.25)] hover:shadow-[0_28px_50px_rgba(16,185,129,0.3)] focus-visible:ring-action-success/40 border border-action-success/20",
  warning:
    "bg-gradient-to-br from-action-warning to-orange-600 text-white shadow-[0_20px_45px_rgba(249,115,22,0.25)] hover:shadow-[0_26px_52px_rgba(249,115,22,0.28)] focus-visible:ring-action-warning/40 border border-action-warning/30",
  danger:
    "bg-gradient-to-br from-action-danger to-red-600 text-white shadow-[0_20px_45px_rgba(239,68,68,0.28)] hover:shadow-[0_26px_50px_rgba(239,68,68,0.32)] focus-visible:ring-action-danger/40 border border-action-danger/20",
  outline:
    "border border-white/60 bg-white/70 text-slate-700 hover:border-primary/40 hover:bg-white focus-visible:ring-primary/30 backdrop-blur-lg",
  ghost:
    "bg-transparent text-secondary dark:text-text-dark hover:bg-white/70 hover:text-primary focus-visible:ring-secondary/20 backdrop-blur",
};

const sizeStyles = {
  sm: "px-4 py-2 text-sm rounded-xl",
  md: "px-6 py-3 text-base rounded-2xl",
  lg: "px-8 py-4 text-base rounded-3xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  glow = false,
  depth = true,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none relative overflow-hidden",
        depth && "button-3d",
        glow && variant === "primary" && "hover-glow-primary",
        glow && variant === "action" && "hover:shadow-glow-complementary",
        "hover:-translate-y-1 active:translate-y-0",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      type={type}
      {...props}
    />
  );
}
