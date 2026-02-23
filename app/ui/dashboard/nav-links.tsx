'use client';

import {
  ClipboardDocumentListIcon,
  CubeTransparentIcon,
  CurrencyDollarIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

// Map of links to display in the side navigation.
const links = [
  { name: '요약', href: '/dashboard', icon: ClipboardDocumentListIcon },
  {
    name: '구조화 상품',
    href: '/dashboard/strucprdm',
    icon: CubeTransparentIcon,
  },
  { name: '손익', href: '/dashboard/pnl', icon: CurrencyDollarIcon },
  { name: 'RISK', href: '/dashboard/risk', icon: ShieldExclamationIcon },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400 dark:text-gray-300 md:flex-none md:justify-start md:p-2 md:px-3',
              {
                'bg-sky-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300':
                  link.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(link.href),
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
