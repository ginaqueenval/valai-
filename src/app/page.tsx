import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { ChevronRight } from "@/components/ui/Chevron";

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="mx-auto max-w-5xl px-6 md:px-8 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
        <StatusPill dot>AI Squad Advisor · Preview</StatusPill>
        <h1 className="mt-7 text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.05]">
          Smarter squads.
          <br />
          <span className="text-valaccent">Sharper instincts.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg md:text-xl text-valmuted leading-relaxed">
          Upload your squad. Valai flags the cards that hold you back and
          recommends replacement profiles tuned to your division and goal.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/ai-squad-advisor"
            className="rounded-full bg-valaccent px-7 py-3.5 text-base font-semibold text-valbg transition-all hover:bg-valhover hover:shadow-cta-hover"
          >
            Open Squad Advisor
          </Link>
          <Link
            href="/ai-squad-advisor"
            className="group inline-flex items-center gap-1 rounded-full px-4 py-3.5 text-base font-medium text-valaccent transition hover:text-valhover"
          >
            Learn more
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* PRODUCT MOCK CARD */}
      <section className="mx-auto max-w-3xl px-6 md:px-8 pb-20">
        <div className="rounded-[28px] bg-valcard border border-white/[0.06] shadow-apple-lg p-6 md:p-8 animate-fade-in">
          <div className="mb-5 flex items-center justify-between">
            <StatusPill>3 callouts</StatusPill>
            <span className="text-xs text-valmuted">Live preview · sample squad</span>
          </div>

          <div className="overflow-hidden rounded-3xl bg-valelev border border-white/[0.06] divide-y divide-white/[0.06]">
            <DemoRow
              dotClass="bg-[#FF5C7A]"
              label="ST · BENZ TOTW"
              note="Pace 78 holds you back vs press meta"
              severity="Critical"
              severityClass="text-[#FF5C7A]"
            />
            <DemoRow
              dotClass="bg-[#FFB860]"
              label="CM · MIDFIELDER"
              note="Stamina dropoff after minute 60"
              severity="Warning"
              severityClass="text-[#FFB860]"
            />
            <DemoRow
              dotClass="bg-valaccent"
              label="CB · DEFENDER"
              note="Solid — consider as upgrade target"
              severity="Info"
              severityClass="text-valaccent"
            />
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-valmuted">
          Live preview · actual analysis includes up to 11 callouts.
        </p>
      </section>

      {/* FEATURES GRID */}
      <section className="mx-auto max-w-5xl px-6 md:px-8 py-20 md:py-28">
        <h2 className="text-center text-3xl md:text-4xl font-semibold tracking-tight">
          Built for the next match
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-base text-valmuted leading-relaxed">
          Four ways Valai sharpens your decisions, before the kickoff whistle.
        </p>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <FeatureCard
            title="Card callouts"
            body="Spot every weak link in seconds — annotated directly on your squad."
            icon={
              <svg className="h-5 w-5 text-valaccent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
          />
          <FeatureCard
            title="Replacement profiles"
            body="Targeted upgrade ideas with stat reasons — tuned to your goal."
            icon={
              <svg className="h-5 w-5 text-valaccent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17l5-5 5 5" />
                <path d="M7 11l5-5 5 5" />
              </svg>
            }
          />
          <FeatureCard
            title="Tactical chat"
            body="Ask follow-ups. Get formation, instructions, and upgrade-order advice."
            icon={
              <svg className="h-5 w-5 text-valaccent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
          />
          <FeatureCard
            title="Community signal"
            body="Backed by Reddit and Twitter sentiment for every flagged card."
            icon={
              <svg className="h-5 w-5 text-valaccent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            }
          />
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="mx-auto max-w-3xl px-6 md:px-8 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Ready when you are.
        </h2>
        <p className="mt-4 text-lg text-valmuted">Free preview · no signup</p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/ai-squad-advisor"
            className="rounded-full bg-valaccent px-7 py-3.5 text-base font-semibold text-valbg transition-all hover:bg-valhover hover:shadow-cta-hover"
          >
            Open Squad Advisor
          </Link>
        </div>
      </section>
    </main>
  );
}

function DemoRow({
  dotClass,
  label,
  note,
  severity,
  severityClass,
}: {
  dotClass: string;
  label: string;
  note: string;
  severity: string;
  severityClass: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.03]">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-0.5 text-xs text-valmuted">{note}</div>
      </div>
      <span className={`text-xs font-medium ${severityClass}`}>{severity}</span>
      <ChevronRight className="h-4 w-4 text-valmuted shrink-0" />
    </div>
  );
}

function FeatureCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-valcard border border-white/[0.06] p-7 transition-colors hover:border-white/[0.12]">
      <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-valaccent/10 border border-valaccent/20">
        {icon}
      </div>
      <div className="text-lg font-semibold tracking-tight">{title}</div>
      <p className="mt-2 text-sm text-valmuted leading-relaxed">{body}</p>
    </div>
  );
}
