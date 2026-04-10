import Calendar from '@/components/Calendar'
import PageLinks from '@/components/PageLinks'
import eventsData from '@/data/events.json'

export default function CalendarPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <div className="border-b border-white/10 pb-6">
          <PageLinks activePath="/calendar" />
        </div>

        <div className="mt-8">
          <Calendar events={eventsData} />
        </div>

        <p className="mt-8 text-sm text-zinc-500">
          To update events, edit <code className="border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-300">data/events.json</code>.
        </p>
      </section>
    </div>
  )
}
