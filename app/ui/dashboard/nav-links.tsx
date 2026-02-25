'use client';

import {
  ClipboardDocumentListIcon,
  CubeTransparentIcon,
  CurrencyDollarIcon,
  ShieldExclamationIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

// 상단 네비게이션에 표시할 링크 목록
const links = [
  { name: '요약', href: '/dashboard', icon: ClipboardDocumentListIcon },
  {
    name: '구조화 상품',
    href: '/dashboard/strucprdm',
    icon: CubeTransparentIcon,
  },
  { name: '시장', href: '/dashboard/market', icon: ChartBarIcon },
  { name: '손익', href: '/dashboard/pnl', icon: CurrencyDollarIcon },
  { name: 'RISK', href: '/dashboard/risk', icon: ShieldExclamationIcon },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        const isActive =
          link.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
              'hover:bg-sky-100 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400 dark:text-gray-300',
              {
                'bg-sky-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300': isActive,
                'text-gray-600 dark:text-gray-400': !isActive,
              },
            )}
          >
            <LinkIcon className="w-5" />
            <span>{link.name}</span>
          </Link>
        );
      })}
    </>
  );
}
