// app/dashboard/market/page.tsx
import { getMarketDailyData } from '@/app/lib/market-data';
import MarketDashboard from '@/app/ui/dashboard/market-dashboard';
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import { CardsSkeleton } from '@/app/ui/skeletons';

export default async function MarketPage() {
  const marketData = await getMarketDailyData();

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        시장 동향
      </h1>

      {marketData ? (
        <Suspense fallback={<CardsSkeleton />}>
          <MarketDashboard data={marketData} />
        </Suspense>
      ) : (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20 p-4 text-sm text-yellow-700 dark:text-yellow-300">
          ⚠️ Market 폴더에 _DAILY.xlsx 파일이 없습니다.
          <br />
          <code className="text-xs">Market/YYMMDD_DAILY.xlsx</code> 형식으로 파일을 추가해 주세요.
        </div>
      )}
    </main>
  );
}
