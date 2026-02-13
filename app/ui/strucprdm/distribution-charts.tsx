'use client';

import { StrucprdmSummary } from '@/app/lib/definitions';

// 간단한 바 차트 (라이브러리 없이 Tailwind로 구현)
function HorizontalBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 truncate text-sm text-gray-600" title={label}>
        {label}
      </span>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-medium text-gray-700">
        {value}
      </span>
    </div>
  );
}

export default function DistributionCharts({
  summary,
}: {
  summary: StrucprdmSummary;
}) {
  const typeMax = Math.max(...summary.typeDistribution.map((d) => d.count), 1);
  const cntrMax = Math.max(...summary.cntrDistribution.map((d) => d.count), 1);

  const typeColors = [
    'bg-blue-500', 'bg-blue-400', 'bg-blue-300',
    'bg-sky-500', 'bg-sky-400', 'bg-sky-300',
    'bg-indigo-400', 'bg-indigo-300', 'bg-violet-400', 'bg-violet-300',
  ];

  const cntrColors = [
    'bg-emerald-500', 'bg-emerald-400', 'bg-emerald-300',
    'bg-teal-500', 'bg-teal-400', 'bg-teal-300',
    'bg-green-400', 'bg-green-300', 'bg-lime-400', 'bg-lime-300',
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* 구조 유형별 분포 (type1~type4 통합) */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          구조 유형별 분포
        </h3>
        <div className="space-y-3">
          {summary.typeDistribution.map((item, idx) => (
            <HorizontalBar
              key={item.struct_type}
              label={item.struct_type}
              value={item.count}
              maxValue={typeMax}
              color={typeColors[idx % typeColors.length]}
            />
          ))}
          {summary.typeDistribution.length === 0 && (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
        </div>
      </div>

      {/* 거래상대방별 분포 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          거래상대방별 분포 (Top 10)
        </h3>
        <div className="space-y-3">
          {summary.cntrDistribution.map((item, idx) => (
            <HorizontalBar
              key={item.cntr_nm}
              label={item.cntr_nm}
              value={item.count}
              maxValue={cntrMax}
              color={cntrColors[idx % cntrColors.length]}
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
