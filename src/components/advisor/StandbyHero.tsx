export function StandbyHero() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-valaccent/10 border border-valaccent/20">
        <svg
          className="h-6 w-6 text-valaccent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12h4l3-9 4 18 3-9h4" />
        </svg>
      </div>
      <div className="text-base font-semibold text-valtext">
        Upload your squad to see callouts here
      </div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-valmuted leading-relaxed">
        Valai will return up to 11 tagged callouts plus a tactical chat in-context.
      </p>
    </div>
  );
}
