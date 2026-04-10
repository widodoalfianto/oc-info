'use client'

import InterestForm from '@/components/InterestForm'
import { useSiteContent } from '@/lib/use-site-content'

interface CareGroupSignupContentProps {
  submissionEnabled: boolean
  embedFormUrl: string
}

function CareGroupListSkeleton() {
  return (
    <div className="mt-5 border-y border-white/10">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="border-b border-white/10 py-4 last:border-b-0">
          <div className="h-4 w-32 animate-pulse bg-white/6" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-40 animate-pulse bg-white/6" />
            <div className="h-3 w-32 animate-pulse bg-white/6" />
            <div className="h-3 w-36 animate-pulse bg-white/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CareGroupSignupContent({
  submissionEnabled,
  embedFormUrl,
}: CareGroupSignupContentProps) {
  const hasEmbeddedForm = embedFormUrl.trim() !== '' && !embedFormUrl.includes('YOUR_')
  const { content, isLoading, isError } = useSiteContent()
  const careGroups = content.careGroups
  const careGroupOptions = careGroups.map(group => group.name)

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-14">
      <aside>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Care Groups</p>

        {isLoading ? (
          <CareGroupListSkeleton />
        ) : (
          <div className="mt-5 border-y border-white/10">
            {careGroups.map(group => (
              <article key={group.name} className="border-b border-white/10 py-4 last:border-b-0">
                <h2 className="text-base font-semibold text-white">{group.name}</h2>
                <dl className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-400">
                  <div>
                    <dt className="inline text-zinc-600">When: </dt>
                    <dd className="inline">{group.meets}</dd>
                  </div>
                  {group.location && (
                    <div>
                      <dt className="inline text-zinc-600">Where: </dt>
                      <dd className="inline">{group.location}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="inline text-zinc-600">Leader: </dt>
                    <dd className="inline">{group.leader}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}

        {isError && (
          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            We couldn&apos;t refresh the care group list just now.
          </p>
        )}
      </aside>

      <section id="care-group-form" className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">Join a care group!</h1>

        <div className="mt-8">
          {hasEmbeddedForm ? (
            <iframe
              src={embedFormUrl}
              title="Care group form"
              className="min-h-[78vh] w-full border border-white/10 bg-black md:min-h-[84vh]"
              loading="lazy"
            />
          ) : (
            <InterestForm
              formType="care-group"
              isConfigured={submissionEnabled}
              options={careGroupOptions}
              optionsLoading={isLoading}
            />
          )}
        </div>
      </section>
    </div>
  )
}
