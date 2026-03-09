import {
  BanknotesIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { StrucprdpSummary } from '@/app/lib/definitions';
import { CarryAggregation, TpAggregation } from '@/app/lib/data';

// 숫자 포맷 유틸리티
function formatKRW(amount: number): string {
  const billions = amount / 100000000;
  return `${billions.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억`;
}

function formatUSD(amount: number): string {
  const millions = amount / 1000000;
  return `$${millions.toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
}

function formatCarryPct(rate: number | null): string {
  if (rate == null) return '-';
  return `${(rate * 100).toFixed(2)}%`;
}

function formatCarryBp(rate: number | null): string {
  if (rate == null) return '-';
  return `${(rate * 10000).toFixed(1)}bp`;
}

function carryColor(v: number | null): string {
  if (v != null && v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v != null && v < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-gray-500 dark:text-gray-400';
}

function mtmColorFn(v: number): string {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-gray-500 dark:text-gray-400';
}

function fmtMtm(v: number): string {
  const b = v / 100000000;
  return `${b >= 0 ? '+' : ''}${b.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
}

// USD 달러 포맷 ($M / $K)
function fmtUsdShort(v: number): string {
  const m = v / 1000000;
  if (Math.abs(m) >= 0.1) {
    return `${v >= 0 ? '+' : '-'}$${Math.abs(m).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  }
  const k = v / 1000;
  return `${v >= 0 ? '+' : '-'}$${Math.abs(k).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
}

// 원화 메인 + USD 괄호
function fmtMtmDual(krwVal: number, usdVal?: number): string {
  const main = fmtMtm(krwVal);
  if (usdVal !== undefined) {
    return `${main} (${fmtUsdShort(usdVal)})`;
  }
  return main;
}

function SummaryCard({
  title,
  value,
  subValue,
  secondaryValue,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subValue?: string;
  secondaryValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold dark:text-gray-100">{value}</p>
      {secondaryValue && (
        <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
          ({secondaryValue})
        </p>
      )}
      {subValue && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{subValue}</p>
      )}
    </div>
  );
}

// 평균 캐리 카드 (자산 기준 원화/외화/전체)
function CarryCard({ data }: { data: CarryAggregation }) {
  const krw = data.byCurrency.find((c) => c.curr === 'KRW');
  const usd = data.byCurrency.find((c) => c.curr === 'USD');

  const items = [
    { label: '전체', carry: data.totalAvgCarry },
    { label: 'KRW', carry: krw?.avgCarry ?? null },
    { label: 'USD', carry: usd?.avgCarry ?? null },
  ];

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-lg p-2 bg-amber-500">
          <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">평균 Carry Rate (노셔널 가중)</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {items.map(({ label, carry }) => (
          <div key={label} className="text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold font-mono ${carryColor(carry)}`}>
              {formatCarryPct(carry)}
            </p>
            <p className={`text-xs font-mono ${carryColor(carry)}`}>
              {formatCarryBp(carry)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 날짜 포맷: YYYYMMDD → MM/DD
function fmtDate(d: string): string {
  if (d.length !== 8) return d;
  return `${d.slice(4, 6)}/${d.slice(6, 8)}`;
}

// 캐리스왑 매칭 집계 카드
function TpAggregationCard({ data }: { data: TpAggregation }) {
  const krw = data.rows.find((r) => r.curr === 'KRW');
  const usd = data.rows.find((r) => r.curr === 'USD');

  // 전체 합산 (USD → 원화 환산)
  const totalAssetCount = (krw?.assetCount || 0) + (usd?.assetCount || 0);
  const totalNotnKrw =
    (krw?.assetNotional || 0) + (usd?.assetNotional || 0) * data.usdKrwRate;

  // MTM/변동은 KRW 환산값으로 합산
  const totalMtmAllKrw = (krw?.totalMtm || 0) + (usd?.totalMtmKrw || 0);
  const totalMtmChangeKrw = (krw?.mtmChange || 0) + (usd?.mtmChangeKrw || 0);
  const totalCarryMtmChangeKrw = (krw?.carryMtmChange || 0) + (usd?.carryMtmChangeKrw || 0);
  const totalCouponKrw = (krw?.couponAmt || 0) + (usd?.couponAmtKrw || 0);

  // 전체 가중평균 캐리
  const krwWc = krw && krw.avgCarry != null ? krw.assetNotional * krw.avgCarry : 0;
  const usdWcKrw =
    usd && usd.avgCarry != null ? usd.assetNotional * data.usdKrwRate * usd.avgCarry : 0;
  const totalAvgCarry = totalNotnKrw > 0 ? (krwWc + usdWcKrw) / totalNotnKrw : null;

  type RowData = {
    label: string;
    badge?: string;
    badgeColor?: string;
    count: number;
    notional: string;
    notionalSub?: string;
    mtmKrw: number;          // 원화 기준 MTM
    mtmChangeKrw: number;    // 원화 기준 일간 변동
    carryMtmChangeKrw: number;
    couponAmtKrw: number;
    // USD 달러값 (괄호 표시용)
    mtmChangeUsd?: number;
    carryMtmChangeUsd?: number;
    couponAmtUsd?: number;
    carry: number | null;
    isBold?: boolean;
  };

  const rows: RowData[] = [];

  if (krw) {
    rows.push({
      label: 'KRW',
      badge: 'KRW',
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      count: krw.assetCount,
      notional: formatKRW(krw.assetNotional),
      mtmKrw: krw.totalMtm,
      mtmChangeKrw: krw.mtmChange,
      carryMtmChangeKrw: krw.carryMtmChange,
      couponAmtKrw: krw.couponAmt,
      carry: krw.avgCarry,
    });
  }

  if (usd) {
    rows.push({
      label: 'USD',
      badge: 'USD',
      badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      count: usd.assetCount,
      notional: formatUSD(usd.assetNotional),
      notionalSub: formatKRW(usd.assetNotional * data.usdKrwRate),
      mtmKrw: usd.totalMtmKrw,
      mtmChangeKrw: usd.mtmChangeKrw,
      carryMtmChangeKrw: usd.carryMtmChangeKrw,
      couponAmtKrw: usd.couponAmtKrw,
      mtmChangeUsd: usd.mtmChange,
      carryMtmChangeUsd: usd.carryMtmChange,
      couponAmtUsd: usd.couponAmt,
      carry: usd.avgCarry,
    });
  }

  rows.push({
    label: '합계',
    count: totalAssetCount,
    notional: formatKRW(totalNotnKrw),
    mtmKrw: totalMtmAllKrw,
    mtmChangeKrw: totalMtmChangeKrw,
    carryMtmChangeKrw: totalCarryMtmChangeKrw,
    couponAmtKrw: totalCouponKrw,
    carry: totalAvgCarry,
    isBold: true,
  });

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm col-span-1 sm:col-span-2 lg:col-span-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-lg p-2 bg-cyan-600">
          <TableCellsIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            캐리스왑 매칭 집계
            <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
              (자산 노셔널 기준, MTM은 set 합산, 실현이자 포함)
            </span>
          </p>
          {data.latestDate && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              기준일 {fmtDate(data.latestDate)} / 전일 {fmtDate(data.prevDate)}
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
              <th className="py-1.5 text-left font-medium px-2">통화</th>
              <th className="py-1.5 text-right font-medium px-2">자산 건수</th>
              <th className="py-1.5 text-right font-medium px-2">자산 노셔널</th>
              <th className="py-1.5 text-right font-medium px-2">MTM (set 합)</th>
              <th className="py-1.5 text-right font-medium px-2">일간 변동</th>
              <th className="py-1.5 text-right font-medium px-2">캐리 변동</th>
              <th className="py-1.5 text-right font-medium px-2">실현이자</th>
              <th className="py-1.5 text-right font-medium px-2">평균 Carry</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowCls = row.isBold
                ? 'border-t-2 border-gray-300 dark:border-gray-600 font-semibold'
                : 'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50';

              return (
                <tr key={row.label} className={rowCls}>
                  <td className="py-2 px-2 text-left">
                    {row.badge ? (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${row.badgeColor}`}>
                        {row.badge}
                      </span>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-200 font-medium">{row.label}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-300 font-mono">
                    {row.count}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="text-gray-700 dark:text-gray-200 font-mono">
                      {row.notional}
                    </span>
                    {row.notionalSub && (
                      <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                        ({row.notionalSub})
                      </span>
                    )}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${mtmColorFn(row.mtmKrw)}`}>
                    {row.isBold ? '-' : fmtMtm(row.mtmKrw)}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${mtmColorFn(row.mtmChangeKrw)}`}>
                    <span>{fmtMtm(row.mtmChangeKrw)}</span>
                    {row.mtmChangeUsd !== undefined && (
                      <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
                        ({fmtUsdShort(row.mtmChangeUsd)})
                      </span>
                    )}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${mtmColorFn(row.carryMtmChangeKrw)}`}>
                    <span>{fmtMtm(row.carryMtmChangeKrw)}</span>
                    {row.carryMtmChangeUsd !== undefined && (
                      <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
                        ({fmtUsdShort(row.carryMtmChangeUsd)})
                      </span>
                    )}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${mtmColorFn(row.couponAmtKrw)}`}>
                    {row.couponAmtKrw !== 0 ? (
                      <>
                        <span>{fmtMtm(row.couponAmtKrw)}</span>
                        {row.couponAmtUsd !== undefined && (
                          <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
                            ({fmtUsdShort(row.couponAmtUsd)})
                          </span>
                        )}
                      </>
                    ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className={`font-mono font-bold ${carryColor(row.carry)}`}>
                      {formatCarryPct(row.carry)}
                    </span>
                    <span className={`ml-1 text-xs font-mono ${carryColor(row.carry)}`}>
                      {formatCarryBp(row.carry)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SummaryCards({
  summary,
  carryData,
  tpData,
}: {
  summary: StrucprdpSummary;
  carryData?: CarryAggregation;
  tpData?: TpAggregation;
}) {
  // MAR 환율 기준 원화환산 (종목별 eff_dt -1영업일 MAR 가중평균)
  const usdInKrw = summary.usdAssetNotionalMarKrw || summary.usdAssetNotional * summary.usdKrwRate;
  const marRate = summary.usdMarWeightedRate || summary.usdKrwRate;
  const rateDisplay = marRate.toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="전체 상품 수"
        value={`${summary.totalCount}건`}
        subValue={`KRW ${summary.krwCount} / USD ${summary.usdCount}`}
        icon={ChartBarIcon}
        color="bg-blue-500"
      />
      <SummaryCard
        title="KRW 상품 (자산)"
        value={formatKRW(summary.krwAssetNotional)}
        subValue={`${summary.krwAssetCount}건`}
        icon={BanknotesIcon}
        color="bg-emerald-500"
      />
      <SummaryCard
        title="USD 상품 (자산)"
        value={formatKRW(usdInKrw)}
        secondaryValue={formatUSD(summary.usdAssetNotional)}
        subValue={`${summary.usdAssetCount}건 · MAR 가중평균 ${rateDisplay}`}
        icon={CurrencyDollarIcon}
        color="bg-violet-500"
      />
      {/* 평균 캐리 카드 (자산 기준) */}
      {carryData && <CarryCard data={carryData} />}

      {/* 캐리스왑 매칭 집계 (4칸 차지) */}
      {tpData && tpData.rows.length > 0 && <TpAggregationCard data={tpData} />}
    </div>
  );
}
