'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/care-group', label: 'Care Group' },
  { href: '/ministry', label: 'Ministry' },
  { href: '/calendar', label: 'Calendar' },
]

interface PageLinksProps {
  className?: string
}

export default function PageLinks({ className }: PageLinksProps) {
  const pathname = usePathname()

  return (
    <nav className={`flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.28em] ${className ?? ''}`}>
      {links.map(({ href, label }) => {
        const isActive = pathname === href

        return (
          <Link
            key={href}
            href={href}
            className={isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
