"use client";

import type { ChangeEvent } from "react";
import type {
  DivisionLevel,
  Goal,
  Platform,
} from "@/lib/ai/valbriSquadAdvisorSchema";
import { Field } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GroupedList } from "@/components/ui/Card";
import { EditableListRow } from "@/components/ui/ListRow";
import { Textarea } from "@/components/ui/Textarea";
import { PrimaryButton } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { DropZone } from "./DropZone";

const PLATFORMS: readonly Platform[] = ["PlayStation", "Xbox", "PC"] as const;
const DIVISION_OPTIONS: readonly DivisionLevel[] = [
  "Division 10-8",
  "Division 7-5",
  "Division 4-2",
  "Division 1",
  "Elite",
];
const GOAL_OPTIONS: readonly Goal[] = [
  "Best Overall Improvement",
  "Better Attack",
  "Better Defense",
  "Better Tactics",
  "Weekend League",
];

type Props = {
  imagePreviewUrl: string;
  selectedImageName: string;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;

  platform: Platform;
  setPlatform: (p: Platform) => void;

  divisionLevel: DivisionLevel;
  setDivisionLevel: (d: DivisionLevel) => void;

  goal: Goal;
  setGoal: (g: Goal) => void;

  currentTactics: string;
  setCurrentTactics: (s: string) => void;

  isLoading: boolean;
  errorMessage: string;
  onSubmit: () => void;
};

export function IntakeForm({
  imagePreviewUrl,
  selectedImageName,
  onImageChange,
  platform,
  setPlatform,
  divisionLevel,
  setDivisionLevel,
  goal,
  setGoal,
  currentTactics,
  setCurrentTactics,
  isLoading,
  errorMessage,
  onSubmit,
}: Props) {
  return (
    <div className="space-y-8">
      <Field label="Squad screenshot">
        <DropZone
          previewUrl={imagePreviewUrl}
          fileName={selectedImageName}
          onChange={onImageChange}
        />
      </Field>

      <Field label="Platform">
        <SegmentedControl
          value={platform}
          options={PLATFORMS}
          onChange={setPlatform}
        />
      </Field>

      <GroupedList>
        <EditableListRow
          label="Division Level"
          hint="Where do you usually finish?"
          value={divisionLevel}
          options={DIVISION_OPTIONS}
          onChange={setDivisionLevel}
        />
        <EditableListRow
          label="Goal"
          hint="What do you want to improve?"
          value={goal}
          options={GOAL_OPTIONS}
          onChange={setGoal}
        />
      </GroupedList>

      <Field label="Current tactics" optional>
        <Textarea
          value={currentTactics}
          onChange={(e) => setCurrentTactics(e.target.value)}
          placeholder="Formation, mentality, instructions..."
        />
      </Field>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#FF5C7A]/30 bg-[#FF5C7A]/10 px-4 py-3 text-sm text-[#FF5C7A]">
          {errorMessage}
        </div>
      ) : null}

      <PrimaryButton fullWidth onClick={onSubmit} disabled={isLoading}>
        {isLoading ? (
          <>
            <Spinner /> Analyzing…
          </>
        ) : (
          "Run Analysis"
        )}
      </PrimaryButton>
    </div>
  );
}
