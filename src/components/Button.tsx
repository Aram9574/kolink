import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-secondary hover:bg-primary-dark focus-visible:ring-primary/30 shadow-sm hover:shadow-md font-semibold",
  secondary:
    "bg-secondary text-white hover:bg-secondary-light focus-visible:ring-secondary/30 shadow-sm",
  outline:
    "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-secondary dark:border-primary dark:text-primary dark:hover:bg-primary dark:hover:text-secondary",
  ghost:
    "bg-transparent text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark",
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
