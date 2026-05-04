// src/app/page.tsx

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070A0F] px-6 py-16 text-white">
      <section className="mx-auto max-w-4xl">
        <p className="mb-3 text-sm font-semibold text-[#00FF9A]">
          Valbri AI Tools
        </p>

        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Valai
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-slate-400">
          Valbri AI Squad Advisor MVP is being built here.
        </p>

        <a
          href="/ai-squad-advisor"
          className="mt-8 inline-flex rounded-xl bg-[#00FF9A] px-5 py-3 font-semibold text-black"
        >
          Open AI Squad Advisor
        </a>
      </section>
    </main>
  );
}