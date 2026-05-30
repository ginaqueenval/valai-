// src/components/layout/BottomBar.tsx
//
// Fixed bottom container: wraps composer + tab bar.

import { ReactNode } from "react";
import { TabBar } from "./TabBar";

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 pt-2 pb-4 px-4 bg-gradient-to-t from-valbg via-valbg to-transparent">
      <div className="mx-auto max-w-2xl space-y-3">
        {children}
        <TabBar />
      </div>
    </div>
  );
}
