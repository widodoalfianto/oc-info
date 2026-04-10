import Image from 'next/image'
import Link from 'next/link'
import logo from '@/assets/ifgf-logo-white.png'
import PageLinks from '@/components/PageLinks'

export default function Header() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6">
        <Link href="/care-group" className="shrink-0" aria-label="IFGF OC home">
          <Image
            src={logo}
            alt="IFGF OC"
            priority
            className="h-12 w-auto md:h-14"
          />
        </Link>

        <PageLinks className="min-w-0 flex-1" />
      </div>
    </header>
  )
}
