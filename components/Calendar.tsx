'use client'

import { useState } from 'react'

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  location?: string
  description?: string
  category?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  worship: 'border-white/14 text-zinc-300',
  'care-group': 'border-white/14 text-zinc-300',
  ministry: 'border-white/14 text-zinc-300',
  youth: 'border-white/14 text-zinc-300',
  outreach: 'border-white/14 text-zinc-300',
  prayer: 'border-white/14 text-zinc-300',
  default: 'border-white/10 text-zinc-300',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarProps {
  events: CalendarEvent[]
}

export default function Calendar({ events }: CalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<CalendarEvent | null>(null)

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(year => year - 1)
      setViewMonth(11)
      return
    }

    setViewMonth(month => month - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(year => year + 1)
      setViewMonth(0)
      return
    }

    setViewMonth(month => month + 1)
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : index - firstDay + 1
  )

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const eventsOnDay = (day: number) => {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(event => event.date === key)
  }

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()

  const upcoming = events
    .filter(event => event.date >= `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`)
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 5)

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 hover:text-zinc-200"
          aria-label="Previous month"
        >
          Prev
        </button>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <button
          onClick={nextMonth}
          className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 hover:text-zinc-200"
          aria-label="Next month"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-white/10 pb-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-600">
        {DAY_NAMES.map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-t border-white/10">
        {cells.map((day, index) => {
          const dayEvents = day ? eventsOnDay(day) : []

          return (
            <div
              key={index}
              className={`min-h-[104px] border-b border-r border-white/10 p-2 sm:min-h-[124px] sm:p-3 ${
                index % 7 === 0 ? 'border-l border-white/10' : ''
              } ${day ? 'bg-transparent' : 'bg-white/[0.02]'}`}
            >
              {day && (
                <>
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center text-xs font-semibold ${
                      isToday(day) ? 'border border-white/30 text-white' : 'text-zinc-400'
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-3 space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <button
                        key={event.id}
                        onClick={() => setSelected(event)}
                        className={`block w-full truncate border px-2 py-1 text-left text-[10px] font-medium uppercase tracking-[0.16em] ${
                          CATEGORY_COLORS[event.category ?? 'default'] ?? CATEGORY_COLORS.default
                        }`}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">+{dayEvents.length - 2} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg border border-white/10 bg-[#05070c] p-6"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Event</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 hover:text-zinc-200">
                Close
              </button>
            </div>

            <div className="mt-6 space-y-2 text-sm leading-relaxed text-zinc-400">
              {selected.time && <p>Time: {selected.time}</p>}
              {selected.location && <p>Location: {selected.location}</p>}
              {selected.description && <p>{selected.description}</p>}
            </div>

            {selected.category && (
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                {selected.category.replace('-', ' ')}
              </p>
            )}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="border-t border-white/10 pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Upcoming</p>
          <div className="mt-5 border-y border-white/10">
            {upcoming.map(event => {
              const date = new Date(`${event.date}T00:00:00`)

              return (
                <button
                  key={event.id}
                  onClick={() => setSelected(event)}
                  className="flex w-full items-start justify-between gap-6 border-b border-white/10 py-4 text-left last:border-b-0"
                >
                  <div>
                    <p className="text-lg font-semibold text-white">{event.title}</p>
                    {event.time && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {event.time}
                        {event.location ? ` - ${event.location}` : ''}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                    {MONTH_NAMES[date.getMonth()].slice(0, 3)} {date.getDate()}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
