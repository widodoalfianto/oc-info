import CareGroupSignupContent from '@/components/CareGroupSignupContent'

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_CARE_GROUP_SCRIPT_URL ?? ''
const EMBED_FORM_URL = process.env.NEXT_PUBLIC_CARE_GROUP_FORM_URL ?? ''

export default function CareGroupPage() {
  const submissionEnabled = APPS_SCRIPT_URL.trim() !== '' && !APPS_SCRIPT_URL.includes('YOUR_')

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <CareGroupSignupContent submissionEnabled={submissionEnabled} embedFormUrl={EMBED_FORM_URL} />
      </section>
    </div>
  )
}
