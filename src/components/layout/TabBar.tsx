type IconKey = "home" | "play" | "send" | "search" | "profile";

type Props = { active?: IconKey };

export function TabBar({ active = "send" }: Props) {
  return (
    <div
      className="liquid-glass mx-auto flex max-w-2xl items-center justify-around gap-1 rounded-full px-4 py-2.5"
      aria-hidden="true"
    >
      <Icon name="home" active={active === "home"} />
      <Icon name="play" active={active === "play"} />
      <Icon name="send" active={active === "send"} />
      <Icon name="search" active={active === "search"} />
      <Icon name="profile" active={active === "profile"} />
    </div>
  );
}

function Icon({ name, active }: { name: IconKey; active: boolean }) {
  const cls = `relative z-10 grid h-9 w-9 place-items-center transition ${
    active ? "text-valaccent" : "text-valmuted"
  }`;
  return (
    <span className={cls}>
      {name === "home" && (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
        </svg>
      )}
      {name === "play" && (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
      {name === "send" && (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      )}
      {name === "search" && (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      )}
      {name === "profile" && (
        <span className="relative">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#FF5C7A] ring-2 ring-[#070A0F]" />
        </span>
      )}
    </span>
  );
}
