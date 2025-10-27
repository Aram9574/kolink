"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const LINKS = [
  { href: "#top", label: "Home" },
  { href: "#benefits", label: "Benefits" },
  { href: "#comparison", label: "Success" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#reviews", label: "Reviews" },
  { href: "#about", label: "About" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const router = useRouter();
  const inLanding = router.pathname === "/";
  const [activeAnchor, setActiveAnchor] = useState<string>(LINKS[0].href);

  useEffect(() => {
    if (!inLanding) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveAnchor(`#${entry.target.id}`);
          }
        });
      },
      {
        rootMargin: "-45% 0px -40% 0px",
        threshold: 0.1,
      }
    );

    const elements = LINKS.map((link) => document.querySelector<HTMLElement>(link.href)).filter(
      (section): section is HTMLElement => Boolean(section)
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [inLanding]);

  const handleAnchorClick = (event: MouseEvent<HTMLAnchorElement>, anchor: string) => {
    if (!inLanding) return;
    event.preventDefault();
    const target = document.querySelector(anchor);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Main">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          KOLINK
        </Link>
        <nav className="hidden items-center gap-2 text-sm md:flex">
          {LINKS.map((link) => {
            const isActive = inLanding && activeAnchor === link.href;
            return (
              <Link
                key={link.href}
                href={inLanding ? link.href : `/${link.href}`}
                onClick={(event) => handleAnchorClick(event, link.href)}
                className={`rounded-full px-4 py-2 transition ${
                  isActive
                    ? "bg-primary text-white shadow-md"
                    : "text-slate-500 hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/signin"
          className="hidden rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark md:inline-flex"
        >
          Login
        </Link>
      </nav>
      {!inLanding && (
        <div className="bg-primary/10 px-6 py-2 text-center text-xs text-primary">
          Estás saliendo de la landing. <Link href="/">Volver</Link>
        </div>
      )}
    </header>
  );
}
