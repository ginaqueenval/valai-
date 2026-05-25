import type { ReactNode } from "react";

type Props = {
  label: string;
  optional?: boolean;
  children: ReactNode;
};

export function Field({ label, optional, children }: Props) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-valtext">
        {label}
        {optional ? <span className="ml-1 font-normal text-valmuted">(optional)</span> : null}
      </div>
      {children}
    </div>
  );
}
