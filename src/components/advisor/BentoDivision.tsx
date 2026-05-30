// src/components/advisor/BentoDivision.tsx
//
// Square card (C6) with division level selector.

import { EditableListRow } from "@/components/ui/EditableListRow";

export const DIVISION_OPTIONS = [
  "Division 10",
  "Division 9",
  "Division 8",
  "Division 7",
  "Division 6",
  "Division 5",
  "Division 4",
  "Division 3",
  "Division 2",
  "Division 1",
  "Elite Division",
];

export function BentoDivision({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (d: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-valelev overflow-hidden">
      <EditableListRow
        label="Division"
        value={value}
        options={DIVISION_OPTIONS}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
