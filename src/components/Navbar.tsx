import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 z-50 w-full border-b border-secondary/10 bg-white/70 backdrop-blur-md shadow-sm dark:bg-darkBg/70">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-primary dark:text-accent">
          KOLINK v0.3
        </Link>

        {/* Enlaces */}
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-textMain dark:text-gray-200 sm:text-base">
          <Link
            href="/dashboard"
            className="border-b-2 border-primary font-semibold text-primary"
          >
            Dashboard
          </Link>
          <Link href="#" className="transition hover:text-primary dark:hover:text-accent">
            Nuevo Post
          </Link>
          <Link href="#" className="transition hover:text-primary dark:hover:text-accent">
            Perfil
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
