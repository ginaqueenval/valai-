import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: "default" | "elevated";
};

export function Card({
  children,
  variant = "default",
  className = "",
  ...rest
}: CardProps) {
  const shadow = variant === "elevated" ? "shadow-apple-lg" : "shadow-apple";
  return (
    <div
      className={`rounded-[28px] bg-valcard border border-white/[0.06] ${shadow} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

type GroupedListProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function GroupedList({ children, className = "", ...rest }: GroupedListProps) {
  return (
    <div
      className={`overflow-hidden rounded-3xl bg-valelev border border-white/[0.06] divide-y divide-white/[0.06] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
