import Link from 'next/link'

const links = [
  { href: '/care-group', label: 'Care Group' },
  { href: '/ministry', label: 'Ministry' },
  { href: '/calendar', label: 'Calendar' },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">IFGF OC Info</p>
          <p className="mt-2 text-sm text-zinc-500">Care groups, ministry sign-up, and church calendar.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
          {links.map(link => (
            <Link key={link.href} href={link.href} className="hover:text-zinc-200">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
