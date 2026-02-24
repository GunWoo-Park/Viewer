// app/dashboard/market/page.tsx
import {
  getMarketDailyData,
  fetchAvailableDates,
} from '@/app/lib/market-data';
import MarketDashboard from '@/app/ui/dashboard/market-dashboard';
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import { CardsSkeleton } from '@/app/ui/skeletons';

export default async function MarketPage(props: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const searchParams = await props.searchParams;
  const targetDate = searchParams?.date || undefined;

  const [marketData, availableDates] = await Promise.all([
    getMarketDailyData(targetDate),
    fetchAvailableDates(),
  ]);

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        시장 동향
      </h1>

      {marketData ? (
        <Suspense fallback={<CardsSkeleton />}>
          <MarketDashboard
            data={marketData}
            availableDates={availableDates}
          />
        </Suspense>
      ) : (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20 p-4 text-sm text-yellow-700 dark:text-yellow-300">
          {targetDate
            ? `⚠️ ${targetDate} 날짜의 시장 데이터가 없습니다.`
            : '⚠️ 데이터베이스에 시장 데이터가 없습니다.'}
          <br />
          <span className="text-xs">
            엑셀 데이터를 DB에 먼저 적재해 주세요.
          </span>
        </div>
      )}
    </main>
  );
}
