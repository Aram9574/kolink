import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-secondary focus-visible:ring-primary/30",
  secondary:
    "bg-white text-primary border border-primary/20 hover:border-primary/40 hover:text-secondary focus-visible:ring-primary/20 dark:bg-darkBg dark:text-gray-100",
  ghost:
    "bg-transparent text-primary hover:bg-primary/10 dark:text-accent dark:hover:bg-accent/10",
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles = [
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 dark:focus-visible:ring-accent/30 disabled:opacity-60 disabled:pointer-events-none",
    variantStyles[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button className={styles} {...props} />;
}
