import {
  BanknotesIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { StrucprdmSummary } from '@/app/lib/definitions';

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
  summary: StrucprdmSummary;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <SummaryCard
        title="전체 상품 수"
        value={`${summary.totalCount}건`}
        subValue={`자산 ${summary.assetCount} / 부채 ${summary.liabilityCount}`}
        icon={ChartBarIcon}
        color="bg-blue-500"
      />
      <SummaryCard
        title="KRW 상품"
        value={`${summary.krwCount}건`}
        subValue={`총 명목금액 ${formatKRW(summary.krwNotionalTotal)}`}
        icon={BanknotesIcon}
        color="bg-emerald-500"
      />
      <SummaryCard
        title="USD 상품"
        value={`${summary.usdCount}건`}
        subValue={`총 명목금액 ${formatUSD(summary.usdNotionalTotal)}`}
        icon={CurrencyDollarIcon}
        color="bg-violet-500"
      />
      <SummaryCard
        title="자산/부채 비율"
        value={`${summary.totalCount > 0 ? Math.round((summary.assetCount / summary.totalCount) * 100) : 0}%`}
        subValue={`자산 ${summary.assetCount}건 기준`}
        icon={ScaleIcon}
        color="bg-amber-500"
      />
    </div>
  );
}
