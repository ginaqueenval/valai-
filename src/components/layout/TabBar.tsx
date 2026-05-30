// src/components/layout/TabBar.tsx
//
// Decorative iOS-style tab bar. 5 icons in a Liquid Glass container.
// Pure visual decoration — no navigation.

export function TabBar() {
  return (
    <div className="pointer-events-none flex items-center justify-between gap-8 rounded-full bg-white/[0.05] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.10] px-8 py-3">
      {/* Home */}
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-valmuted stroke-current"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>

      {/* Play */}
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-valmuted stroke-current"
        fill="currentColor"
      >
        <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2" stroke="currentColor" />
        <polygon points="10 8 16 12 10 16" fill="currentColor" />
      </svg>

      {/* Send (highlighted as active) */}
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-valaccent stroke-current"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 2 11 13m11-11l-7 20-4-9-9-4 20-7z" />
      </svg>

      {/* Search */}
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-valmuted stroke-current"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      {/* Profile with notification dot */}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-valmuted stroke-current"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
      </div>
    </div>
  );
}
