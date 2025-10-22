import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-background-light dark:bg-surface-dark p-6 shadow-sm border border-border-light dark:border-border-dark transition-all duration-300 hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}
