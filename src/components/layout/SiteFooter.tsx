export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 md:px-8 py-10 text-xs text-valmuted md:flex-row md:justify-between">
        <div>© {year} valai · Valbri</div>
        <div className="flex gap-4">
          <span>AI squad analysis — preview build</span>
        </div>
      </div>
    </footer>
  );
}
