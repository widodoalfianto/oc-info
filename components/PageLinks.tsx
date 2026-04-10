import Link from 'next/link'

const links = [
  { href: '/care-group', label: 'Care Group' },
  { href: '/ministry', label: 'Ministry' },
  { href: '/calendar', label: 'Calendar' },
]

interface PageLinksProps {
  activePath?: string
}

export default function PageLinks({ activePath }: PageLinksProps) {
  return (
    <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.28em]">
      {links.map(({ href, label }) => {
        const isActive = activePath === href

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
