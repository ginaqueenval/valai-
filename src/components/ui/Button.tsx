import type { ButtonHTMLAttributes, ReactNode } from "react";

type Common = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
};

export function PrimaryButton({
  children,
  fullWidth,
  className = "",
  disabled,
  ...rest
}: Common) {
  return (
    <button
      disabled={disabled}
      className={`${fullWidth ? "w-full" : ""} inline-flex items-center justify-center gap-2 rounded-full bg-valaccent px-7 py-3.5 text-base font-semibold text-valbg transition-all hover:bg-valhover hover:shadow-cta-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...rest }: Common) {
  return (
    <button
      className={`inline-flex items-center gap-1 rounded-full px-4 py-3.5 text-base font-medium text-valaccent transition hover:text-valhover ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...rest }: Common) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-base font-medium text-valtext transition hover:border-valaccent/30 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
