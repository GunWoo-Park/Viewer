import TopNav from '@/app/ui/dashboard/sidenav';

// export const experimental_ppr = true

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-gray-950">
      <div className="w-full flex-none">
        <TopNav />
      </div>
      <div className="flex-grow overflow-y-auto p-4 md:p-6 dark:text-gray-100">{children}</div>
    </div>
  );
}
