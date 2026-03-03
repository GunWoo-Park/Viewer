// app/dashboard/risk/page.tsx
import { lusitana } from '@/app/ui/fonts';

// 금액 포맷 헬퍼
function formatDelta(value: number, format: 'krw' | 'usd'): string {
  const abs = Math.abs(value);
  if (format === 'krw') {
    // 억 단위
    const eok = abs / 100000000;
    if (eok >= 1) return `${eok.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
    // 만 단위
    const man = abs / 10000;
    if (man >= 1) return `${man.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
    return abs.toLocaleString('ko-KR');
  }
  // USD
  const millions = abs / 1000000;
  if (millions >= 1) return `${millions.toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  const thousands = abs / 1000;
  if (thousands >= 1) return `${thousands.toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  return abs.toLocaleString('en-US');
}

// Hedge Net Delta 카드 컴포넌트
function HedgeDeltaCard({
  label,
  value,
  unit,
  format,
  highlight = false,
  accent = false,
}: {
  label: string;
  value: number;
  unit: string;
  format: 'krw' | 'usd';
  highlight?: boolean;
  accent?: boolean;
}) {
  const isNeg = value < 0;
  const sign = isNeg ? '−' : '+';
  const color = isNeg
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-emerald-600 dark:text-emerald-400';
  const formatted = formatDelta(value, format);

  // 배경 스타일: accent > highlight > 기본
  const bg = accent
    ? 'bg-gray-900 dark:bg-gray-50 border-gray-900 dark:border-gray-50'
    : highlight
      ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700';
  const labelColor = accent
    ? 'text-gray-300 dark:text-gray-600'
    : 'text-gray-500 dark:text-gray-400';
  const subColor = accent
    ? 'text-gray-400 dark:text-gray-500'
    : 'text-gray-400 dark:text-gray-500';

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${bg}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${labelColor}`}>
        {label}
      </p>
      <p className={`${lusitana.className} mt-2 text-2xl font-bold ${color}`}>
        {sign}{unit}{formatted}
      </p>
      <p className={`mt-1 text-[10px] font-mono ${subColor}`}>
        {sign}{Math.abs(value).toLocaleString()}
      </p>
    </div>
  );
}

export default function RiskPage() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        RISK
      </h1>

      {/* Hedge Net Delta 개별 카드 */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HedgeDeltaCard
          label="KRW Hedge Net Delta"
          value={-318069592}
          unit="₩"
          format="krw"
        />
        <HedgeDeltaCard
          label="USD Hedge Net Delta"
          value={-770462}
          unit="₩"
          format="krw"
        />
        <HedgeDeltaCard
          label="KTB Hedge Net Delta"
          value={-1439581653}
          unit="₩"
          format="krw"
        />
        <HedgeDeltaCard
          label="UST Hedge Net Delta"
          value={-85500336}
          unit="₩"
          format="krw"
        />
      </div>

      {/* 통화별 소계 + 전체 Net Delta */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <HedgeDeltaCard
          label="KRW 소계 (KRW + KTB)"
          value={-318069592 + -1439581653}
          unit="₩"
          format="krw"
          highlight
        />
        <HedgeDeltaCard
          label="USD 소계 (USD + UST)"
          value={-770462 + -85500336}
          unit="₩"
          format="krw"
          highlight
        />
        <HedgeDeltaCard
          label="전체 Net Delta"
          value={-318069592 + -770462 + -1439581653 + -85500336}
          unit="₩"
          format="krw"
          highlight
          accent
        />
      </div>

      {/* 금리 리스크 섹션 */}
      <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          금리 리스크 (Interest Rate Risk)
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            🚧 DV01 / Key Rate Duration
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>

      {/* 신용 리스크 섹션 */}
      <div className="mt-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          신용 리스크 (Credit Risk)
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            🚧 거래상대방 신용 노출
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>

      {/* 유동성 리스크 섹션 */}
      <div className="mt-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          유동성 리스크 (Liquidity Risk)
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            🚧 만기 구조 / Cash Flow 분석
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>
    </main>
  );
}
