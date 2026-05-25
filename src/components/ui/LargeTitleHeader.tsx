import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  status?: ReactNode;
};

export function LargeTitleHeader({ eyebrow, title, subtitle, status }: Props) {
  return (
    <header className="mb-10">
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-wider text-valmuted">
          {eyebrow}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">{title}</h1>
        {status ? <div>{status}</div> : null}
      </div>
      {subtitle ? (
        <p className="mt-3 max-w-xl text-base text-valmuted leading-relaxed">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
