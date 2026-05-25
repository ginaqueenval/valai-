import Link from "next/link";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 liquid-glass">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 md:px-8 py-3">
        <Link href="/" className="relative z-10 text-base font-semibold tracking-tight text-valtext">
          valai
          <span className="font-normal text-valmuted"> · Squad Advisor</span>
        </Link>
        <nav className="relative z-10 hidden md:flex items-center gap-7 text-sm text-valmuted">
          <Link href="/" className="transition hover:text-valtext">Home</Link>
          <Link href="/ai-squad-advisor" className="transition hover:text-valtext">Advisor</Link>
        </nav>
        <Link
          href="/ai-squad-advisor"
          className="relative z-10 rounded-full bg-valaccent px-4 py-2 text-sm font-semibold text-valbg transition-colors hover:bg-valhover"
        >
          Open Advisor
        </Link>
      </div>
    </header>
  );
}
