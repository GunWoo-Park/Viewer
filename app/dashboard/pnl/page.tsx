// app/dashboard/pnl/page.tsx
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import {
  PnlTrendChart,
  CarryYtdPnlChart,
  WtdPnlChart,
  CarryWtdPnlChart,
  TypePnlTable,
  RiskAttributionTable,
} from '@/app/ui/pnl/pnl-chart';
import {
  computePnlSummaryCards,
  fetchPnlTrend,
  fetchPnlSummaryByTypeAllFunds,
  fetchAvailableDates,
} from '@/app/lib/data';
import DatePicker from '@/app/ui/strucprdm/date-picker';
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

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

// 통합 서버 래퍼: 모든 데이터를 한 번에 가져와서 렌더링
async function PnlDashboardContent({ pnlDate }: { pnlDate?: string }) {
  const [
    { trend, carryTrend, latestDate, allTypes, allStructTypes, allCarryStructTypes },
    typeSummary,
    availableDates,
  ] = await Promise.all([
    fetchPnlTrend(),
    fetchPnlSummaryByTypeAllFunds(pnlDate),
    fetchAvailableDates(),
  ]);

  // 선택된 날짜의 MM/DD 변환 (trend.date 포맷과 맞춤)
  const effectiveDate = pnlDate || latestDate;
  const targetMMDD = effectiveDate
    ? `${effectiveDate.slice(4, 6)}/${effectiveDate.slice(6, 8)}`
    : '';

  // 선택 날짜까지 trend 슬라이스
  let slicedTrend = trend;
  let slicedCarryTrend = carryTrend;
  if (targetMMDD) {
    const idx = trend.findIndex((t) => t.date === targetMMDD);
    if (idx >= 0) {
      slicedTrend = trend.slice(0, idx + 1);
      slicedCarryTrend = carryTrend.slice(0, idx + 1);
    }
  }

  // 요약 카드 계산 (fetchPnlTrend 중복 호출 제거)
  const summaryCards = computePnlSummaryCards(slicedTrend, slicedCarryTrend);

  const baseDate = effectiveDate
    ? `${effectiveDate.slice(0, 4)}-${effectiveDate.slice(4, 6)}-${effectiveDate.slice(6, 8)}`
    : '';

  // 전일 날짜 구하기 (slicedTrend 끝에서 2번째 → prevDate)
  const prevDateLabel = slicedTrend.length >= 2
    ? slicedTrend[slicedTrend.length - 2].date
    : '';

  return (
    <>
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className={`${lusitana.className} text-xl md:text-2xl dark:text-gray-100`}>
          손익 (PnL)
        </h1>
        <DatePicker availableDates={availableDates} />
      </div>

      {/* 기준일 / 전일 표시 */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">기준일</span>
          <span className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">
            {baseDate}
          </span>
        </div>
        {prevDateLabel && (
          <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">전일</span>
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
              {prevDateLabel}
            </span>
          </div>
        )}
      </div>

      {/* PnL 요약 카드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PnlSummaryCard
          title="Daily PnL"
          value={summaryCards.dailyPnl}
          subtitle="전일 대비"
          icon={ArrowTrendingUpIcon}
          color="bg-blue-500"
        />
        <PnlSummaryCard
          title="MTD PnL"
          value={summaryCards.mtdPnl}
          subtitle={`${baseDate.slice(5, 7)}월 누적`}
          icon={ChartBarIcon}
          color="bg-emerald-500"
        />
        <PnlSummaryCard
          title="YTD PnL"
          value={summaryCards.ytdPnl}
          subtitle="연초 이후 누적"
          icon={ArrowTrendingUpIcon}
          color="bg-violet-500"
        />
        <PnlSummaryCard
          title="Carry PnL"
          value={summaryCards.carryPnl}
          subtitle="Carry swap 일별 손익"
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
        <PnlTrendChart data={slicedTrend} allTypes={allTypes} />
      </div>

      {/* YTD Carry PnL 추이 차트 */}
      <div className="mb-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          YTD Carry PnL 추이
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            (캐리 스왑 일별 PnL + 누적, 억 단위)
          </span>
        </h2>
        <CarryYtdPnlChart data={slicedCarryTrend} allCarryStructTypes={allCarryStructTypes} />
      </div>

      {/* WTD PnL 추이 차트 */}
      <div className="mb-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          WTD PnL 추이
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            (최근 5영업일, 구조유형 세분화, 억 단위)
          </span>
        </h2>
        <WtdPnlChart data={slicedTrend} allStructTypes={allStructTypes} />
      </div>

      {/* Carry WTD PnL 추이 차트 */}
      <div className="mb-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          Carry swap WTD PnL 추이
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            (캐리 TP 기준, 최근 5영업일, 구조유형별, 억 단위)
          </span>
        </h2>
        <CarryWtdPnlChart data={slicedCarryTrend} allCarryStructTypes={allCarryStructTypes} />
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
          <RiskAttributionTable />
        </div>

        {/* 유형별 PnL Breakdown */}
        <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
            유형별 PnL Breakdown
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
              (일별, 구조 유형 기준)
            </span>
          </h2>
          <TypePnlTable summary={typeSummary} />
        </div>
      </div>
    </>
  );
}

export default function PnLPage({
  searchParams,
}: {
  searchParams?: { pnlDate?: string };
}) {
  const pnlDate = searchParams?.pnlDate || '';

  return (
    <main>
      <Suspense
        key={pnlDate}
        fallback={
          <div className="space-y-6">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        }
      >
        <PnlDashboardContent pnlDate={pnlDate || undefined} />
      </Suspense>
    </main>
  );
}
