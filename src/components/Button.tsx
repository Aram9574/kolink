import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-md hover:bg-primary-dark focus-visible:ring-primary/30 font-semibold",
  secondary:
    "bg-secondary text-white shadow-md hover:bg-secondary-light focus-visible:ring-secondary/40 font-semibold",
  outline:
    "border border-primary text-primary hover:bg-primary/10 focus-visible:ring-primary/20",
  ghost:
    "bg-transparent text-secondary hover:bg-surface-light focus-visible:ring-secondary/20",
};

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:-translate-y-[1px]",
        variantStyles[variant],
        className
      )}
      type={type}
      {...props}
    />
  );
}
