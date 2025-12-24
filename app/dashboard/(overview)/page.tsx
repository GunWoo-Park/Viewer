// app/dashboard/(overview)/page.tsx

import CardWrapper from '@/app/ui/dashboard/cards';
import AlgoFeed from '@/app/ui/dashboard/algo-feed';
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import { LatestInvoicesSkeleton, CardsSkeleton } from '@/app/ui/skeletons';

// 1. 여기에 엑셀 프리뷰 컴포넌트를 임포트합니다.
import ExcelPreview from '@/app/ui/dashboard/excel-preview';

export default async function Page() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        FICC Trader Dashboard
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardsSkeleton />}>
          <CardWrapper />
        </Suspense>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <div className="w-full md:col-span-4 rounded-xl bg-gray-50 p-4 min-h-[400px]">
          <h2 className={`${lusitana.className} mb-4 text-xl`}>Market Trend</h2>
          {/* ... 차트 영역 ... */}
        </div>

        <Suspense fallback={<LatestInvoicesSkeleton />}>
          <AlgoFeed />
        </Suspense>
      </div>

      {/* 2. 대시보드 하단에 엑셀 프리뷰 섹션을 배치합니다. */}
      <div className="mt-6">
        <ExcelPreview />
      </div>
    </main>
  );
}