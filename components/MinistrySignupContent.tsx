'use client'

import InterestForm from '@/components/InterestForm'
import { useSiteContent } from '@/lib/use-site-content'

interface MinistrySignupContentProps {
  submissionEnabled: boolean
  embedFormUrl: string
}

function MinistryListSkeleton() {
  return (
    <div className="mt-5 border-y border-white/10">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border-b border-white/10 py-4 last:border-b-0">
          <div className="h-4 w-32 animate-pulse bg-white/6" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-36 animate-pulse bg-white/6" />
            <div className="h-3 w-28 animate-pulse bg-white/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MinistrySignupContent({
  submissionEnabled,
  embedFormUrl,
}: MinistrySignupContentProps) {
  const hasEmbeddedForm = embedFormUrl.trim() !== '' && !embedFormUrl.includes('YOUR_')
  const { content, isLoading, isError } = useSiteContent()
  const ministryTeams = content.ministryTeams
  const ministryOptions = ministryTeams.map(team => team.name)

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-14">
      <aside className="order-2 lg:order-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Ministry Teams</p>

        {isLoading ? (
          <MinistryListSkeleton />
        ) : (
          <div className="mt-5 border-y border-white/10">
            {ministryTeams.map(ministry => (
              <article key={ministry.name} className="border-b border-white/10 py-4 last:border-b-0">
                <h2 className="text-base font-semibold text-white">{ministry.name}</h2>
                <dl className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-400">
                  <div>
                    <dt className="inline text-zinc-600">Leader: </dt>
                    <dd className="inline">{ministry.leader}</dd>
                  </div>
                  {ministry.schedule && (
                    <div>
                      <dt className="inline text-zinc-600">When: </dt>
                      <dd className="inline">{ministry.schedule}</dd>
                    </div>
                  )}
                  {ministry.location && (
                    <div>
                      <dt className="inline text-zinc-600">Where: </dt>
                      <dd className="inline">{ministry.location}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}

        {isError && (
          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            We couldn&apos;t refresh the ministry list just now.
          </p>
        )}
      </aside>

      <section id="ministry-form" className="order-1 min-w-0 lg:order-2">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">Join a ministry!</h1>

        <div className="mt-8">
          {hasEmbeddedForm ? (
            <iframe
              src={embedFormUrl}
              title="Ministry form"
              className="min-h-[78vh] w-full border border-white/10 bg-black md:min-h-[84vh]"
              loading="lazy"
            />
          ) : (
            <InterestForm
              formType="ministry"
              isConfigured={submissionEnabled}
              options={ministryOptions}
              optionsLoading={isLoading}
            />
          )}
        </div>
      </section>
    </div>
  )
}
