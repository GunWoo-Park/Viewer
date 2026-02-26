// app/dashboard/pnl/page.tsx
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import {
  PnlTrendChart,
  FundPnlTable,
  RiskAttributionTable,
} from '@/app/ui/pnl/pnl-chart';
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// Mock 요약 데이터
const summaryData = {
  dailyPnl: 1.20,
  mtdPnl: 12.50,
  ytdPnl: 27.11,
  carryPnl: 3.21,
  baseDate: '2026-02-26',
};

// 요약 카드 컴포넌트
function PnlSummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  const isPositive = value >= 0;
  const valueColor = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
  const arrow = isPositive ? '▲' : '▼';

  return (
    <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </p>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className={`${lusitana.className} mt-2 text-2xl font-bold ${valueColor}`}>
        {arrow} {isPositive ? '+' : ''}{value.toFixed(2)}억
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function PnLPage() {
  return (
    <main>
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className={`${lusitana.className} text-xl md:text-2xl dark:text-gray-100`}>
          손익 (PnL)
        </h1>
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5">
          <CalendarDaysIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
            {summaryData.baseDate}
          </span>
        </div>
      </div>

      {/* PnL 요약 카드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PnlSummaryCard
          title="Daily PnL"
          value={summaryData.dailyPnl}
          subtitle="전일 대비"
          icon={ArrowTrendingUpIcon}
          color="bg-blue-500"
        />
        <PnlSummaryCard
          title="MTD PnL"
          value={summaryData.mtdPnl}
          subtitle="2월 누적"
          icon={ChartBarIcon}
          color="bg-emerald-500"
        />
        <PnlSummaryCard
          title="YTD PnL"
          value={summaryData.ytdPnl}
          subtitle="연초 이후 누적"
          icon={ArrowTrendingUpIcon}
          color="bg-violet-500"
        />
        <PnlSummaryCard
          title="Carry PnL"
          value={summaryData.carryPnl}
          subtitle="일 캐리 수익"
          icon={ChartBarIcon}
          color="bg-amber-500"
        />
      </div>

      {/* PnL 추이 차트 */}
      <div className="mb-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          YTD PnL 추이
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            (일별 PnL + 누적, 억 단위)
          </span>
        </h2>
        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />}>
          <PnlTrendChart />
        </Suspense>
        <div className="mt-2 flex items-center justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-blue-400" />
            <span>Daily PnL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-amber-500" />
            <span>누적 PnL</span>
          </div>
        </div>
      </div>

      {/* 테이블 2개 가로 배치 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 리스크 요인별 Attribution */}
        <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
            Risk Factor Attribution
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
              (억 단위)
            </span>
          </h2>
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />}>
            <RiskAttributionTable />
          </Suspense>
        </div>

        {/* 펀드별 PnL */}
        <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
            펀드별 PnL Breakdown
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
              (일별, 억 단위)
            </span>
          </h2>
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />}>
            <FundPnlTable />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
