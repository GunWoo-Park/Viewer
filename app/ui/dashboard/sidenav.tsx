import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import AcmeLogo from '@/app/ui/acme-logo';
import { PowerIcon } from '@heroicons/react/24/outline';
import { signOut } from '@/auth';
import ThemeToggle from '@/app/ui/theme-toggle';

export default function SideNav() {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 px-4 py-2">
      {/* 로고 */}
      <Link
        className="flex h-10 items-center rounded-md bg-blue-600 px-3 mr-2"
        href="/"
      >
        <div className="w-24 text-white">
          <AcmeLogo />
        </div>
      </Link>

      {/* 네비게이션 링크 */}
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        <NavLinks />
      </div>

      {/* 우측: 테마 토글 + 로그아웃 */}
      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <form
          action={async () => {
            'use server';
            await signOut();
          }}
        >
          <button className="flex h-9 items-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 px-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400 dark:text-gray-300">
            <PowerIcon className="w-5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
