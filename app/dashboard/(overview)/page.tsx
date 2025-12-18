// app/dashboard/(overview)/page.tsx
import CardWrapper from '@/app/ui/dashboard/cards';
import AlgoFeed from '@/app/ui/dashboard/algo-feed'; // 새로 만든 파일 import
// RevenueChart는 금융 차트로 대체하거나 제거 가능. 여기서는 예시로 유지하거나 제거.
// import RevenueChart from '@/app/ui/dashboard/revenue-chart';
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import {
  LatestInvoicesSkeleton, // AlgoFeed용 스켈레톤으로 재사용 가능
  CardsSkeleton,
} from '@/app/ui/skeletons';

export default async function Page() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        FICC Trader Dashboard
      </h1>

      {/* 1. 상단 주요 시장 지표 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardsSkeleton />}>
          <CardWrapper />
        </Suspense>
      </div>

      {/* 2. 하단 차트 및 트레이딩 피드 */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        {/* RevenueChart 대신 추후 Yield Curve 등을 넣을 수 있는 공간 (임시 placeholder) */}
        <div className="w-full md:col-span-4 rounded-xl bg-gray-50 p-4 min-h-[400px]">
            <h2 className={`${lusitana.className} mb-4 text-xl`}>Market Trend (Yield Curve)</h2>
            <div className="flex items-center justify-center h-full text-gray-400">
                Chart Component Area
            </div>
        </div>

        {/* 실시간 알고리즘 신호 */}
        <Suspense fallback={<LatestInvoicesSkeleton />}>
          <AlgoFeed />
        </Suspense>
      </div>
    </main>
  );
}

// import CardWrapper from '@/app/ui/dashboard/cards';
// import RevenueChart from '@/app/ui/dashboard/revenue-chart';
// import LatestInvoices from '@/app/ui/dashboard/latest-invoices';
// import { lusitana } from '@/app/ui/fonts';
// import { Suspense } from 'react';
// import {
//   RevenueChartSkeleton,
//   LatestInvoicesSkeleton,
//   CardsSkeleton,
// } from '@/app/ui/skeletons';
//
//
// export default async function Page() {
//   return (
//     <main>
//       <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
//         Dashboard
//       </h1>
//       <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
//         <Suspense fallback={<CardsSkeleton />}>
//           <CardWrapper></CardWrapper>
//         </Suspense>
//       </div>
//       <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
//         <Suspense fallback={<RevenueChartSkeleton />}>
//           <RevenueChart />
//         </Suspense>
//         <Suspense fallback={<LatestInvoicesSkeleton />}>
//           <LatestInvoices />
//         </Suspense>
//       </div>
//     </main>
//   );
// }
