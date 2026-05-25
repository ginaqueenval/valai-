import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  status?: ReactNode;
};

export function DashboardTitle({ eyebrow, title, status }: Props) {
  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-valmuted">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
        {status ? <div className="pt-1 shrink-0">{status}</div> : null}
      </div>
    </header>
  );
}
