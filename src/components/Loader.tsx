type LoaderProps = {
  size?: number;
  className?: string;
};

export default function Loader({ size = 24, className = "" }: LoaderProps) {
  const dimension = `${size}px`;
  const classes = [
    "inline-block animate-spin rounded-full border-2 border-primary/20 border-t-primary dark:border-accent/20 dark:border-t-accent",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      style={{ width: dimension, height: dimension }}
      aria-label="Loading"
      role="status"
    />
  );
}
