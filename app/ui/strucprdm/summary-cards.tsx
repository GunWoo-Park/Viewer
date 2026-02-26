import {
  BanknotesIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { StrucprdpSummary } from '@/app/lib/definitions';

// 숫자 포맷 유틸리티
function formatKRW(amount: number): string {
  const billions = amount / 100000000;
  return `${billions.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억`;
}

function formatUSD(amount: number): string {
  const millions = amount / 1000000;
  return `$${millions.toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
}

// 캐리 포맷: 소수 → bp 또는 % 표시
function formatCarryPct(rate: number | null): string {
  if (rate == null) return '-';
  return `${(rate * 100).toFixed(2)}%`;
}

function formatCarryBp(rate: number | null): string {
  if (rate == null) return '-';
  return `${(rate * 10000).toFixed(1)}bp`;
}

type CarryData = {
  krwAvgCarry: number | null;
  usdAvgCarry: number | null;
  totalAvgCarry: number | null;
  krwTotalNotional: number;
  usdTotalNotional: number;
};

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

// 평균 캐리 카드 (원화/외화/전체를 하나의 카드에 표시)
function CarryCard({ carryData }: { carryData: CarryData }) {
  const items = [
    { label: '전체', carry: carryData.totalAvgCarry },
    { label: 'KRW', carry: carryData.krwAvgCarry },
    { label: 'USD', carry: carryData.usdAvgCarry },
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
        {items.map(({ label, carry }) => {
          const color = carry != null && carry > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : carry != null && carry < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-gray-500 dark:text-gray-400';
          return (
            <div key={label} className="text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>
                {formatCarryPct(carry)}
              </p>
              <p className={`text-xs font-mono ${color}`}>
                {formatCarryBp(carry)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SummaryCards({
  summary,
  carryData,
}: {
  summary: StrucprdpSummary;
  carryData?: CarryData;
}) {
  // USD 자산을 원화로 환산
  const usdInKrw = summary.usdAssetNotional * summary.usdKrwRate;
  const rateDisplay = summary.usdKrwRate.toLocaleString('ko-KR', {
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
        subValue={`${summary.usdAssetCount}건 · 적용환율 ${rateDisplay}`}
        icon={CurrencyDollarIcon}
        color="bg-violet-500"
      />
      {carryData && <CarryCard carryData={carryData} />}
    </div>
  );
}
