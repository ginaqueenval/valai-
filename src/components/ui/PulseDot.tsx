type Props = { className?: string };

export function PulseDot({ className = "bg-valaccent" }: Props) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className={`absolute inset-0 rounded-full ${className} animate-pulse-dot`}
        aria-hidden="true"
      />
      <span className={`relative inline-block h-2 w-2 rounded-full ${className}`} />
    </span>
  );
}
