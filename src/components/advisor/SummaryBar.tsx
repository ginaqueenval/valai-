import type {
  DivisionLevel,
  Goal,
  Platform,
  ValbriSquadAdvisorResult,
} from "@/lib/ai/valbriSquadAdvisorSchema";
import { StatusPill } from "@/components/ui/StatusPill";

type Props = {
  result: ValbriSquadAdvisorResult;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
};

export function SummaryBar({ result, platform, divisionLevel, goal }: Props) {
  const total = result.playerCallouts.length;
  const critical = result.playerCallouts.filter((c) => c.severity === "critical").length;
  const warning = result.playerCallouts.filter((c) => c.severity === "warning").length;
  const info = result.playerCallouts.filter((c) => c.severity === "info").length;

  return (
    <div className="flex flex-wrap gap-2">
      <StatusPill>
        {total} callout{total === 1 ? "" : "s"}
      </StatusPill>
      {critical > 0 ? (
        <StatusPill tone="critical" dot>
          {critical} critical
        </StatusPill>
      ) : null}
      {warning > 0 ? (
        <StatusPill tone="warning" dot>
          {warning} warning
        </StatusPill>
      ) : null}
      {info > 0 ? (
        <StatusPill dot>
          {info} info
        </StatusPill>
      ) : null}
      <StatusPill tone="muted">{platform}</StatusPill>
      <StatusPill tone="muted">{divisionLevel}</StatusPill>
      <StatusPill tone="muted">{goal}</StatusPill>
    </div>
  );
}
