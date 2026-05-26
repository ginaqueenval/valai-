import type { ReactNode } from "react";

type Props = { children: ReactNode };

export function BottomBar({ children }: Props) {
  if (!children) return null;
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30">
      <div
        aria-hidden="true"
        className="pointer-events-none h-16 w-full bg-gradient-to-t from-valbg via-valbg/85 to-transparent"
      />
      <div className="pointer-events-auto px-4 pb-5 bg-valbg">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
