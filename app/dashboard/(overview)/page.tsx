// app/dashboard/(overview)/page.tsx
import { fetchBTBDashboardData } from '@/app/lib/data';
import BTBDashboard from '@/app/ui/dashboard/btb-dashboard';
import CardWrapper from '@/app/ui/dashboard/cards';
import AlgoFeed from '@/app/ui/dashboard/algo-feed';
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import { LatestInvoicesSkeleton, CardsSkeleton } from '@/app/ui/skeletons';

export default async function Page() {
  // 1. DB에서 BTB 대시보드 데이터를 조회합니다.
  const dashboardData = await fetchBTBDashboardData();

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        FICC Portfolio Dashboard
      </h1>

      {/* 2. BTB 모니터링 섹션 (DB 데이터가 있을 때만 렌더링) */}
      {dashboardData ? (
        <div className="mb-8">
          <Suspense fallback={<CardsSkeleton />}>
            <BTBDashboard data={dashboardData} />
          </Suspense>
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          ⚠️ FICC 데이터가 아직 로드되지 않았습니다.
          <br />
          <code className="text-xs">pnpm seed:ficc</code> 명령으로 DataBase/
          폴더의 데이터를 PostgreSQL에 적재해 주세요.
        </div>
      )}

      {/* 3. 시장 지표 카드 섹션 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardsSkeleton />}>
          <CardWrapper />
        </Suspense>
      </div>

      {/* 4. 알고리즘 신호 섹션 */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <div className="min-h-[400px] w-full rounded-xl bg-gray-50 p-4 md:col-span-4">
          <h2 className={`${lusitana.className} mb-4 text-xl`}>
            Market Trend
          </h2>
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white">
            <p className="text-sm italic text-gray-400">
              Trend Chart 준비 중...
            </p>
          </div>
        </div>

        <Suspense fallback={<LatestInvoicesSkeleton />}>
          <AlgoFeed />
        </Suspense>
      </div>
    </main>
  );
}
