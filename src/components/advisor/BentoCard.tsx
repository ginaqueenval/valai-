import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
};

export function BentoCard({
  children,
  className = "",
  interactive,
  ...rest
}: Props) {
  return (
    <div
      className={`relative rounded-3xl bg-valcard border border-white/[0.06] overflow-hidden ${
        interactive ? "transition-colors hover:border-white/[0.12]" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
