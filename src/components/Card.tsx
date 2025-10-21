import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className = "", ...props }: CardProps) {
  const classes = [
    "rounded-2xl bg-white p-6 shadow-sm transition-colors duration-300 dark:bg-darkBg dark:shadow-none border border-secondary/10",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...props} />;
}
