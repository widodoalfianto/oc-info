import MinistrySignupContent from '@/components/MinistrySignupContent'
import PageLinks from '@/components/PageLinks'

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_MINISTRY_SCRIPT_URL ?? ''
const EMBED_FORM_URL = process.env.NEXT_PUBLIC_MINISTRY_FORM_URL ?? ''

export default function MinistryPage() {
  const submissionEnabled = APPS_SCRIPT_URL.trim() !== '' && !APPS_SCRIPT_URL.includes('YOUR_')

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <div className="border-b border-white/10 pb-6">
          <PageLinks activePath="/ministry" />
        </div>

        <MinistrySignupContent submissionEnabled={submissionEnabled} embedFormUrl={EMBED_FORM_URL} />
      </section>
    </div>
  )
}
