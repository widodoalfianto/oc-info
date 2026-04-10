const GIVING_LINKS = {
  online: 'https://your-giving-platform.com',
}

export default function GivingPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:py-10">
      <section className="mx-auto max-w-5xl">
        <div className="border-b border-white/10 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-500">Giving</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
            A minimal giving page for direct traffic.
          </h1>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Use</p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Keep this page simple and direct for visitors who reach it outside the main church site.
            </p>
          </div>

          <div className="border-t border-white/10 pt-8">
            <p className="max-w-2xl text-base leading-relaxed text-zinc-400">
              Replace the placeholder URL below with your actual giving platform when you are ready.
            </p>
            <a
              href={GIVING_LINKS.online}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-8"
            >
              Open Giving Link
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
