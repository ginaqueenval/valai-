// src/components/hud.tsx

import type { CSSProperties, ReactNode, SVGProps } from "react";

/* ============================================================
   Color tokens
   ============================================================ */

export const HUD = {
  primary: "#3DDBC1",
  bright: "#5CFCE6",
  alert: "#FFB860",
  critical: "#FF6B6B",
  synergy: "#A4F26B",
  elite: "#B388FF",
  ink: "#E7F8F4",
  inkDim: "#94A3B8",
  inkMute: "#64748B",
  bg: "#04080F",
};

export type HudVariant =
  | "default"
  | "alert"
  | "critical"
  | "synergy"
  | "upgrade"
  | "elite";

type VariantConfig = {
  color: string;
  glow: string;
  surface: string;
  tagLabel: string;
};

const VARIANTS: Record<HudVariant, VariantConfig> = {
  default: {
    color: HUD.primary,
    glow: "rgba(61,219,193,0.16)",
    surface: "linear-gradient(180deg, rgba(8,18,26,0.6) 0%, rgba(4,8,15,0.85) 100%)",
    tagLabel: "MODULE",
  },
  alert: {
    color: HUD.alert,
    glow: "rgba(255,184,96,0.18)",
    surface: "linear-gradient(180deg, rgba(34,18,8,0.55) 0%, rgba(4,8,15,0.85) 100%)",
    tagLabel: "ALERT",
  },
  critical: {
    color: HUD.critical,
    glow: "rgba(255,107,107,0.2)",
    surface: "linear-gradient(180deg, rgba(40,12,12,0.55) 0%, rgba(4,8,15,0.85) 100%)",
    tagLabel: "CRITICAL",
  },
  synergy: {
    color: HUD.synergy,
    glow: "rgba(164,242,107,0.16)",
    surface: "linear-gradient(180deg, rgba(14,28,14,0.55) 0%, rgba(4,8,15,0.85) 100%)",
    tagLabel: "SYNERGY",
  },
  upgrade: {
    color: HUD.primary,
    glow: "rgba(92,252,230,0.18)",
    surface: "linear-gradient(180deg, rgba(8,22,26,0.65) 0%, rgba(4,8,15,0.85) 100%)",
    tagLabel: "UPGRADE",
  },
  elite: {
    color: HUD.elite,
    glow: "rgba(179,136,255,0.18)",
    surface: "linear-gradient(180deg, rgba(20,12,32,0.6) 0%, rgba(4,8,15,0.85) 100%)",
    tagLabel: "CORE",
  },
};

export function variantConfig(v: HudVariant) {
  return VARIANTS[v];
}

/* ============================================================
   Background — atmospheric grid + scanline + vignette
   ============================================================ */

export function HudBackground({ children }: { children: ReactNode }) {
  return (
    <div className="hud-vignette relative min-h-dvh w-full text-white">
      <div className="pointer-events-none absolute inset-0 hud-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0 hud-scanline" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(800px 300px at 50% 0%, rgba(61,219,193,0.12), transparent 70%)",
        }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/* ============================================================
   Corner brackets (segmented L corners)
   ============================================================ */

export function HudCorners({
  color = HUD.primary,
  size = 10,
  inset = 4,
  className,
}: {
  color?: string;
  size?: number;
  inset?: number;
  className?: string;
}) {
  const stroke = `1px solid ${color}`;
  const base: CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    pointerEvents: "none",
  };
  return (
    <div className={className} aria-hidden>
      <span
        style={{
          ...base,
          left: inset,
          top: inset,
          borderTop: stroke,
          borderLeft: stroke,
        }}
      />
      <span
        style={{
          ...base,
          right: inset,
          top: inset,
          borderTop: stroke,
          borderRight: stroke,
        }}
      />
      <span
        style={{
          ...base,
          left: inset,
          bottom: inset,
          borderBottom: stroke,
          borderLeft: stroke,
        }}
      />
      <span
        style={{
          ...base,
          right: inset,
          bottom: inset,
          borderBottom: stroke,
          borderRight: stroke,
        }}
      />
    </div>
  );
}

/* ============================================================
   HudPanel — angular panel with variant + header
   ============================================================ */

export function HudPanel({
  variant = "default",
  title,
  tag,
  icon,
  meta,
  scanline,
  children,
  className,
  contentClassName,
  compact,
  notch = true,
}: {
  variant?: HudVariant;
  title?: string;
  tag?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  scanline?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  compact?: boolean;
  notch?: boolean;
}) {
  const v = VARIANTS[variant];
  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{
        background: v.surface,
        border: `1px solid ${v.color}33`,
        boxShadow: `inset 0 0 24px ${v.glow}, 0 0 0 1px rgba(0,0,0,0.5)`,
        ...(notch ? { clipPath: undefined } : {}),
      }}
    >
      {notch ? (
        <div
          className="hud-clip-notch absolute inset-0"
          style={{
            background: v.surface,
            border: `1px solid ${v.color}33`,
          }}
          aria-hidden
        />
      ) : null}

      <div className={`relative ${notch ? "hud-clip-notch" : ""}`}>
        <HudCorners color={v.color} />

        {scanline ? (
          <div className="hud-scanline pointer-events-none absolute inset-0" />
        ) : null}

        {/* Header strip */}
        {title || tag || icon || meta ? (
          <div
            className={`flex items-center justify-between gap-2 border-b px-3 ${
              compact ? "py-1.5" : "py-2"
            }`}
            style={{
              borderColor: `${v.color}26`,
              background: `linear-gradient(180deg, ${v.color}10, transparent)`,
            }}
          >
            <div className="flex min-w-0 items-center gap-2">
              {icon ? (
                <span
                  className="flex h-5 w-5 items-center justify-center"
                  style={{ color: v.color }}
                >
                  {icon}
                </span>
              ) : null}
              {title ? (
                <p
                  className="truncate text-[10px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: v.color }}
                >
                  {title}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {meta}
              {tag ? (
                <span
                  className="rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    color: v.color,
                    borderColor: `${v.color}55`,
                    background: `${v.color}14`,
                  }}
                >
                  {tag}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={`${compact ? "p-3" : "p-4"} ${contentClassName ?? ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HudMeter — segmented HUD bar with telemetry style
   ============================================================ */

export function HudMeter({
  label,
  value,
  max = 10,
  variant = "default",
  segments = 14,
  decimals = 1,
  unit,
}: {
  label: string;
  value: number;
  max?: number;
  variant?: HudVariant;
  segments?: number;
  decimals?: number;
  unit?: string;
}) {
  const v = VARIANTS[variant];
  const ratio = Math.max(0, Math.min(1, value / max));
  const filled = Math.round(ratio * segments);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <p
          className="text-[9px] font-semibold uppercase tracking-[0.25em]"
          style={{ color: HUD.inkMute }}
        >
          {label}
        </p>
        <p
          className="font-mono text-sm font-bold tabular-nums"
          style={{ color: v.color, textShadow: `0 0 8px ${v.glow}` }}
        >
          {value.toFixed(decimals)}
          {unit ? (
            <span
              className="ml-0.5 text-[10px] font-normal"
              style={{ color: HUD.inkMute }}
            >
              {unit}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex h-2 gap-[2px]">
        {Array.from({ length: segments }).map((_, i) => {
          const active = i < filled;
          return (
            <span
              key={i}
              className="flex-1"
              style={{
                background: active ? v.color : "rgba(255,255,255,0.06)",
                boxShadow: active ? `0 0 6px ${v.color}` : undefined,
                clipPath:
                  "polygon(0% 30%, 50% 0%, 100% 30%, 100% 70%, 50% 100%, 0% 70%)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   HudChip — angular chip with variant
   ============================================================ */

export function HudChip({
  variant = "default",
  children,
  small,
}: {
  variant?: HudVariant;
  children: ReactNode;
  small?: boolean;
}) {
  const v = VARIANTS[variant];
  return (
    <span
      className={`inline-flex items-center gap-1 border ${
        small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      } font-semibold uppercase tracking-[0.2em]`}
      style={{
        color: v.color,
        borderColor: `${v.color}55`,
        background: `${v.color}14`,
        clipPath:
          "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
      }}
    >
      {children}
    </span>
  );
}

/* ============================================================
   Radar / spinning rings — decorative tactical accents
   ============================================================ */

export function RadarRing({
  size = 28,
  color = HUD.primary,
  spin = true,
  segments = 4,
}: {
  size?: number;
  color?: string;
  spin?: boolean;
  segments?: number;
}) {
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const arcLen = 360 / (segments * 2);

  const arcs = Array.from({ length: segments }, (_, i) => {
    const start = (i * (360 / segments)) % 360;
    const end = start + arcLen;
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    return { x1, y1, x2, y2 };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={spin ? "hud-sweep" : undefined}
    >
      {arcs.map((a, i) => (
        <path
          key={i}
          d={`M ${a.x1} ${a.y1} A ${r} ${r} 0 0 1 ${a.x2} ${a.y2}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.8 - i * 0.12}
        />
      ))}
      <circle cx={cx} cy={cy} r={2} fill={color} />
    </svg>
  );
}

/* ============================================================
   HUD icons — small geometric tactical marks
   ============================================================ */

export function HudIcon({
  type,
  ...props
}: { type: "core" | "alert" | "synergy" | "upgrade" | "scan" | "target" } & SVGProps<SVGSVGElement>) {
  switch (type) {
    case "core":
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
          <polygon points="8,1 14,5 14,11 8,15 2,11 2,5" />
          <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "alert":
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
          <path d="M8 2 L14 13 H2 Z" />
          <line x1="8" y1="6" x2="8" y2="9.5" strokeWidth={2} />
          <circle cx="8" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "synergy":
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
          <circle cx="5" cy="8" r="3" />
          <circle cx="11" cy="8" r="3" />
        </svg>
      );
    case "upgrade":
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
          <path d="M3 12 L8 4 L13 12" />
          <line x1="3" y1="14" x2="13" y2="14" />
        </svg>
      );
    case "scan":
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
          <circle cx="8" cy="8" r="6" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
          <circle cx="8" cy="8" r="6" />
          <circle cx="8" cy="8" r="3" />
          <line x1="8" y1="1" x2="8" y2="3.5" />
          <line x1="8" y1="12.5" x2="8" y2="15" />
          <line x1="1" y1="8" x2="3.5" y2="8" />
          <line x1="12.5" y1="8" x2="15" y2="8" />
        </svg>
      );
    default:
      return null;
  }
}

/* ============================================================
   HexBadge — small hex with letter
   ============================================================ */

export function HexBadge({
  label = "V",
  color = HUD.primary,
  size = 36,
}: {
  label?: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        clipPath:
          "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
        background: `linear-gradient(135deg, ${color}, ${color}55)`,
        boxShadow: `0 0 14px ${color}66`,
      }}
    >
      <span
        className="text-sm font-bold"
        style={{ color: HUD.bg, fontFamily: "ui-monospace, monospace" }}
      >
        {label}
      </span>
    </div>
  );
}

/* ============================================================
   TargetingFrame — segmented brackets + chemistry ring,
   drawn in SVG, positioned by bbox in image coords
   ============================================================ */

export function TargetingFrame({
  x,
  y,
  w,
  h,
  color = HUD.primary,
  chemistryRing,
  pulse = true,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  chemistryRing?: boolean;
  pulse?: boolean;
}) {
  const bracketLen = Math.max(8, Math.min(w, h) * 0.32);
  const inset = 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const ringR = Math.max(w, h) * 0.65;

  const corners = [
    // Top-left
    { mx: x - inset, my: y - inset + bracketLen, lx: x - inset, ly: y - inset, ex: x - inset + bracketLen, ey: y - inset },
    // Top-right
    { mx: x + w + inset - bracketLen, my: y - inset, lx: x + w + inset, ly: y - inset, ex: x + w + inset, ey: y - inset + bracketLen },
    // Bottom-right
    { mx: x + w + inset, my: y + h + inset - bracketLen, lx: x + w + inset, ly: y + h + inset, ex: x + w + inset - bracketLen, ey: y + h + inset },
    // Bottom-left
    { mx: x - inset + bracketLen, my: y + h + inset, lx: x - inset, ly: y + h + inset, ex: x - inset, ey: y + h + inset - bracketLen },
  ];

  return (
    <g className={pulse ? "hud-target-flicker" : undefined}>
      {chemistryRing ? (
        <circle
          cx={cx}
          cy={cy}
          r={ringR}
          fill="none"
          stroke={color}
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.45}
          className="hud-sweep"
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      ) : null}
      {corners.map((c, i) => (
        <polyline
          key={i}
          points={`${c.mx},${c.my} ${c.lx},${c.ly} ${c.ex},${c.ey}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="square"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      ))}
      {/* Center crosshair tick */}
      <circle cx={cx} cy={cy} r={2} fill={color} />
      {/* Tick marks on sides */}
      <line x1={cx} y1={y - inset - 4} x2={cx} y2={y - inset} stroke={color} strokeWidth={1} opacity={0.7} />
      <line x1={cx} y1={y + h + inset} x2={cx} y2={y + h + inset + 4} stroke={color} strokeWidth={1} opacity={0.7} />
    </g>
  );
}

/* ============================================================
   ConnectorLine — animated SVG path with pulse
   ============================================================ */

export function ConnectorLine({
  fromX,
  fromY,
  toX,
  toY,
  color = HUD.primary,
  bent = true,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color?: string;
  bent?: boolean;
}) {
  const midX = bent ? (fromX + toX) / 2 : toX;
  const path = bent
    ? `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`
    : `M ${fromX} ${fromY} L ${toX} ${toY}`;

  return (
    <g>
      {/* Soft glow underlay */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={3}
        opacity={0.18}
      />
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        opacity={0.9}
      />
      {/* Animated pulse over line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeDasharray="8 24"
        className="hud-dash"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      {/* Anchor dots */}
      <circle cx={fromX} cy={fromY} r={2.5} fill={color} />
      <circle cx={toX} cy={toY} r={3.5} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={toX} cy={toY} r={1.5} fill={color} />
    </g>
  );
}

/* ============================================================
   HudButton — angular tactical button
   ============================================================ */

export function HudButton({
  children,
  onClick,
  variant = "default",
  disabled,
  type = "button",
  className,
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: HudVariant | "primary";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const isPrimary = variant === "primary";
  const v = isPrimary ? VARIANTS.default : VARIANTS[variant as HudVariant];
  const padding =
    size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-5 py-3 text-sm" : "px-4 py-2 text-xs";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.25em] transition disabled:cursor-not-allowed disabled:opacity-50 ${padding} ${className ?? ""}`}
      style={{
        color: isPrimary ? HUD.bg : v.color,
        background: isPrimary
          ? `linear-gradient(135deg, ${HUD.primary}, ${HUD.bright})`
          : `${v.color}10`,
        border: `1px solid ${v.color}${isPrimary ? "" : "55"}`,
        clipPath:
          "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
        boxShadow: isPrimary
          ? `0 0 18px ${HUD.primary}55`
          : `inset 0 0 12px ${v.color}11`,
      }}
    >
      {children}
    </button>
  );
}

/* ============================================================
   SideButton — left column tactical list button
   ============================================================ */

export function HudListButton({
  label,
  icon,
}: {
  label: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      className="group flex w-full items-center justify-between border px-3 py-2 text-left text-xs transition hover:bg-white/[0.04]"
      style={{
        borderColor: `${HUD.primary}33`,
        background: `${HUD.primary}08`,
        clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
      }}
    >
      <span className="flex items-center gap-2">
        {icon ? (
          <span style={{ color: HUD.primary }}>{icon}</span>
        ) : (
          <span
            className="block h-1 w-1"
            style={{ background: HUD.primary, boxShadow: `0 0 6px ${HUD.primary}` }}
          />
        )}
        <span className="text-white">{label}</span>
      </span>
      <span style={{ color: HUD.primary }}>›</span>
    </button>
  );
}

/* ============================================================
   ScoreSheet — telemetry block under squad image
   ============================================================ */

export type ScoreItem = {
  label: string;
  value: number;
  max?: number;
  variant?: HudVariant;
  unit?: string;
};

export function HudTelemetryGrid({
  items,
}: {
  items: ScoreItem[];
}) {
  return (
    <div className="grid gap-x-4 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
      {items.map((it) => (
        <HudMeter
          key={it.label}
          label={it.label}
          value={it.value}
          max={it.max ?? 10}
          variant={it.variant ?? "default"}
          unit={it.unit}
        />
      ))}
    </div>
  );
}

/* ============================================================
   HudHeading — section heading with bracket marks
   ============================================================ */

export function HudHeading({
  children,
  color = HUD.primary,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] ${className ?? ""}`}
      style={{ color }}
    >
      <span
        className="inline-block h-1.5 w-1.5"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      {children}
      <span
        className="ml-1 inline-block h-px flex-1"
        style={{ background: `linear-gradient(90deg, ${color}55, transparent)` }}
      />
    </p>
  );
}

/* ============================================================
   PulseDot — small breathing dot for "live" status
   ============================================================ */

export function PulseDot({
  color = HUD.primary,
  size = 8,
  label,
}: {
  color?: string;
  size?: number;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative" style={{ width: size, height: size }}>
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: color,
            animation: "hud-pulse-ring 1.6s ease-out infinite",
          }}
        />
      </span>
      {label ? (
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
