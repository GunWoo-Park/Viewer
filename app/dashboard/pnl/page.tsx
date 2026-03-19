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
  fetchPriceDiff,
} from '@/app/lib/data';
import type { PriceDiffRow } from '@/app/lib/data';
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
    { trend, carryTrend, latestDate, allTypes, allStructTypes, allCarryStructTypes, missingMarDates },
    typeSummary,
    availableDates,
    priceDiff,
  ] = await Promise.all([
    fetchPnlTrend(),
    fetchPnlSummaryByTypeAllFunds(pnlDate),
    fetchAvailableDates(),
    fetchPriceDiff(pnlDate),
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

      {/* MAR 환율 누락 알림 */}
      {missingMarDates.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <div className="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                MAR 환율 누락
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                USD 종목의 PnL 계산에 필요한 MAR 환율(eq_unasp)이 누락되어 해당 일자의 USD PnL이 부정확할 수 있습니다.
              </p>
              <p className="text-xs font-mono text-amber-500 dark:text-amber-500 mt-1">
                누락 일자: {missingMarDates.map((d) => `${d.slice(4,6)}/${d.slice(6,8)}`).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Wink vs 보고손익 가격 차이 */}
      <div className="mt-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">
            Wink vs 보고손익 가격 차이
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
              (swap_prc vs breakdownprc · {priceDiff.stdDt ? `${priceDiff.stdDt.slice(0,4)}-${priceDiff.stdDt.slice(4,6)}-${priceDiff.stdDt.slice(6,8)}` : '-'} 기준)
            </span>
          </h2>
          {priceDiff.rows.length > 0 && (
            <span className="rounded-full bg-rose-100 dark:bg-rose-900/40 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
              {priceDiff.rows.length}건 차이
            </span>
          )}
        </div>
        <PriceDiffTable rows={priceDiff.rows} totalDiff={priceDiff.totalDiff} />
      </div>
    </>
  );
}

// Wink vs 보고손익 가격 차이 테이블
const TP_LABEL: Record<string, string> = {
  자산: '자산(원천)', MTM: 'MTM헤지', 캐리: '캐리연속', 자체발행: '자체발행',
};

function PriceDiffTable({ rows, totalDiff }: { rows: PriceDiffRow[]; totalDiff: number }) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400 dark:text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
        Wink와 보고손익 가격이 일치합니다
      </div>
    );
  }

  const fmtPrc = (v: number) => {
    const eok = v / 1e8;
    if (Math.abs(eok) >= 1) return `${eok >= 0 ? '+' : ''}${eok.toFixed(1)}억`;
    const man = v / 1e4;
    if (Math.abs(man) >= 1) return `${man >= 0 ? '+' : ''}${man.toFixed(0)}만`;
    return `${v >= 0 ? '+' : ''}${v.toFixed(0)}`;
  };

  return (
    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
          <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
            <th className="py-2 px-3 text-left font-medium">종목코드</th>
            <th className="py-2 px-3 text-left font-medium">거래상대방</th>
            <th className="py-2 px-3 text-center font-medium">스왑 유형</th>
            <th className="py-2 px-3 text-right font-medium">Wink</th>
            <th className="py-2 px-3 text-right font-medium">보고손익</th>
            <th className="py-2 px-3 text-right font-medium">차이</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.objCd} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-2 px-3 font-mono text-xs text-gray-700 dark:text-gray-300">{r.objCd}</td>
              <td className="py-2 px-3 text-xs text-gray-600 dark:text-gray-400 max-w-[160px] truncate">{r.cntrNm}</td>
              <td className="py-2 px-3 text-center">
                <span className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {TP_LABEL[r.tp] || r.tp}
                </span>
              </td>
              <td className="py-2 px-3 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                {fmtPrc(r.winkPrc)}
              </td>
              <td className="py-2 px-3 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                {fmtPrc(r.reportPrc)}
              </td>
              <td className={`py-2 px-3 text-right font-mono text-xs font-semibold ${
                r.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {fmtPrc(r.diff)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold text-xs">
            <td colSpan={5} className="py-2 px-3 text-right text-gray-500 dark:text-gray-400">
              합계 ({rows.length}건)
            </td>
            <td className={`py-2 px-3 text-right font-mono ${
              totalDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {fmtPrc(totalDiff)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
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
