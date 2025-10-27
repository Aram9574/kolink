import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border-light bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
        className
      )}
      {...props}
    />
  );
}
