'use client';

import { StrucprdpSummary } from '@/app/lib/definitions';

// 통화별 압축 포맷: KRW → ₩3,500억, USD → $50M
function fmtKRW(amount: number): string {
  if (amount === 0) return '-';
  const billions = amount / 100000000;
  return `₩${billions.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억`;
}

function fmtUSD(amount: number): string {
  if (amount === 0) return '-';
  const millions = amount / 1000000;
  if (millions >= 1)
    return `$${millions.toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  return `$${(amount / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
}

// 통화 구분 색상
function currColor(curr: string): string {
  return curr === 'USD' ? 'bg-violet-500' : 'bg-emerald-500';
}

// 단일 바 행
function DistributionRow({
  label,
  curr,
  notional,
  maxValue,
  usdKrwRate,
}: {
  label: string;
  curr: string;
  notional: number;
  maxValue: number;
  usdKrwRate: number;
}) {
  const pct = maxValue > 0 ? (notional / maxValue) * 100 : 0;

  // USD인 경우 원화환산 메인 + (달러) 서브
  const isUSD = curr === 'USD';
  const krwConverted = isUSD ? notional * usdKrwRate : notional;
  const mainText = fmtKRW(krwConverted);
  const subText = isUSD ? fmtUSD(notional) : null;

  return (
    <div className="flex items-center gap-3">
      <span
        className="w-44 shrink-0 truncate text-sm text-gray-600 dark:text-gray-400"
        title={label}
      >
        {label}
      </span>
      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        {pct > 0 && (
          <div
            className={`h-full ${currColor(curr)} rounded-full transition-all duration-500`}
            style={{ width: `${Math.max(pct, 1)}%` }}
          />
        )}
      </div>
      <span className="w-32 shrink-0 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
        {mainText}
        {subText && (
          <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
            ({subText})
          </span>
        )}
      </span>
    </div>
  );
}

// 통화별 분리 + 각 통화 내에서 상대 비교하는 섹션
function CurrencySplitSection({
  title,
  items,
  labelKey,
  usdKrwRate,
}: {
  title: string;
  items: { label: string; curr: string; notional: number }[];
  labelKey: string;
  usdKrwRate: number;
}) {
  // KRW/USD 분리
  const krwItems = items
    .filter((d) => d.curr === 'KRW')
    .sort((a, b) => b.notional - a.notional);
  const usdItems = items
    .filter((d) => d.curr === 'USD')
    .sort((a, b) => b.notional - a.notional);

  // 각 통화 내 최대값 기준 (USD는 원화환산 기준)
  const krwMax = Math.max(...krwItems.map((d) => d.notional), 1);
  const usdMax = Math.max(...usdItems.map((d) => d.notional), 1);

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-gray-200">
        {title}
      </h3>

      {/* KRW 섹션 */}
      {krwItems.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            KRW (자산 · Alive)
          </p>
          <div className="space-y-1.5">
            {krwItems.map((item, idx) => (
              <DistributionRow
                key={`krw-${labelKey}-${item.label}-${idx}`}
                label={item.label}
                curr="KRW"
                notional={item.notional}
                maxValue={krwMax}
                usdKrwRate={usdKrwRate}
              />
            ))}
          </div>
        </div>
      )}

      {/* USD 섹션 */}
      {usdItems.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-violet-500" />
            USD (자산 · Alive) — 원화환산
          </p>
          <div className="space-y-1.5">
            {usdItems.map((item, idx) => (
              <DistributionRow
                key={`usd-${labelKey}-${item.label}-${idx}`}
                label={item.label}
                curr="USD"
                notional={item.notional}
                maxValue={usdMax}
                usdKrwRate={usdKrwRate}
              />
            ))}
          </div>
        </div>
      )}

      {krwItems.length === 0 && usdItems.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">데이터 없음</p>
      )}
    </div>
  );
}

export default function DistributionCharts({
  summary,
}: {
  summary: StrucprdpSummary;
}) {
  const { usdKrwRate } = summary;

  // 차트 데이터 변환
  const typeItems = summary.typeDistribution.map((d) => ({
    label: d.struct_type,
    curr: d.curr,
    notional: d.notional,
  }));
  const cntrItems = summary.cntrDistribution.map((d) => ({
    label: d.cntr_nm,
    curr: d.curr,
    notional: d.notional,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <CurrencySplitSection
        title="구조 유형별 분포"
        items={typeItems}
        labelKey="type"
        usdKrwRate={usdKrwRate}
      />
      <CurrencySplitSection
        title="거래상대방별 분포"
        items={cntrItems}
        labelKey="cntr"
        usdKrwRate={usdKrwRate}
      />
    </div>
  );
}
