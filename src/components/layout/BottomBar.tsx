import type { ReactNode } from "react";
import { TabBar } from "./TabBar";

type Props = { children: ReactNode };

export function BottomBar({ children }: Props) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30">
      {/* fade behind bottom controls so cards don't visually clip */}
      <div
        aria-hidden="true"
        className="pointer-events-none h-16 w-full bg-gradient-to-t from-valbg via-valbg/85 to-transparent"
      />
      <div className="pointer-events-auto px-4 pb-3 bg-valbg">
        <div className="mx-auto max-w-2xl">{children}</div>
        <div className="mt-2.5">
          <TabBar />
        </div>
      </div>
    </div>
  );
}
