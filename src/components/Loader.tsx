import { cn } from "@/lib/utils";

type LoaderProps = {
  size?: number;
  className?: string;
};

export default function Loader({ size = 24, className = "" }: LoaderProps) {
  const dimension = `${size}px`;

  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-primary/20 border-t-primary",
        className
      )}
      style={{ width: dimension, height: dimension }}
      aria-label="Loading"
      role="status"
    />
  );
}
