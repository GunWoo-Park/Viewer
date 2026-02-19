'use client';

import { StrucprdpSummary } from '@/app/lib/definitions';

// 통화별 압축 포맷: KRW → ₩3,500억, USD → $50M
function fmtNotional(amount: number, curr: string): string {
  if (amount === 0) return '-';
  if (curr === 'USD') {
    const millions = amount / 1000000;
    if (millions >= 1) return `$${millions.toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
    return `$${(amount / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
  }
  // KRW (기본)
  const billions = amount / 100000000;
  return `₩${billions.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억`;
}

// 통화 구분 색상
function currColor(curr: string): string {
  return curr === 'USD' ? 'bg-violet-500' : 'bg-emerald-500';
}

function currTextColor(curr: string): string {
  return curr === 'USD' ? 'text-violet-700' : 'text-gray-700';
}

// 단일 바 행
function DistributionRow({
  label,
  curr,
  notional,
  maxValue,
}: {
  label: string;
  curr: string;
  notional: number;
  maxValue: number;
}) {
  const pct = maxValue > 0 ? (notional / maxValue) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 truncate text-sm text-gray-600" title={label}>
        {label}
      </span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        {pct > 0 && (
          <div
            className={`h-full ${currColor(curr)} rounded-full transition-all duration-500`}
            style={{ width: `${Math.max(pct, 1)}%` }}
          />
        )}
      </div>
      <span className={`w-20 shrink-0 text-right text-xs font-medium ${currTextColor(curr)}`}>
        {fmtNotional(notional, curr)}
      </span>
    </div>
  );
}

export default function DistributionCharts({
  summary,
}: {
  summary: StrucprdpSummary;
}) {
  // 최대값 계산 (바 비율용)
  const typeMax = Math.max(
    ...summary.typeDistribution.map((d) => d.notional),
    1,
  );
  const cntrMax = Math.max(
    ...summary.cntrDistribution.map((d) => d.notional),
    1,
  );

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* 구조 유형별 분포 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-gray-800">
          구조 유형별 분포 (자산 · Alive)
        </h3>
        <p className="mb-4 text-xs text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />KRW
          <span className="inline-block w-2 h-2 rounded-full bg-violet-500 ml-3 mr-1" />USD
        </p>
        <div className="space-y-1.5">
          {summary.typeDistribution.map((item, idx) => (
            <DistributionRow
              key={`${item.struct_type}-${item.curr}-${idx}`}
              label={item.struct_type}
              curr={item.curr}
              notional={item.notional}
              maxValue={typeMax}
            />
          ))}
          {summary.typeDistribution.length === 0 && (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
        </div>
      </div>

      {/* 거래상대방별 분포 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-gray-800">
          거래상대방별 분포 (자산 · Alive)
        </h3>
        <p className="mb-4 text-xs text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />KRW
          <span className="inline-block w-2 h-2 rounded-full bg-violet-500 ml-3 mr-1" />USD
        </p>
        <div className="space-y-1.5">
          {summary.cntrDistribution.map((item, idx) => (
            <DistributionRow
              key={`${item.cntr_nm}-${item.curr}-${idx}`}
              label={item.cntr_nm}
              curr={item.curr}
              notional={item.notional}
              maxValue={cntrMax}
            />
          ))}
          {summary.cntrDistribution.length === 0 && (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}
