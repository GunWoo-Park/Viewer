import {
  BanknotesIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { StrucprdpSummary } from '@/app/lib/definitions';

// 숫자 포맷 유틸리티
function formatKRW(amount: number): string {
  // 억 단위로 표시
  const billions = amount / 100000000;
  return `${billions.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억`;
}

function formatUSD(amount: number): string {
  // 백만 달러 단위로 표시
  const millions = amount / 1000000;
  return `$${millions.toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
}

function SummaryCard({
  title,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {subValue && (
        <p className="mt-1 text-xs text-gray-400">{subValue}</p>
      )}
    </div>
  );
}

export default function SummaryCards({
  summary,
}: {
  summary: StrucprdpSummary;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        value={formatUSD(summary.usdAssetNotional)}
        subValue={`${summary.usdAssetCount}건`}
        icon={CurrencyDollarIcon}
        color="bg-violet-500"
      />
    </div>
  );
}
