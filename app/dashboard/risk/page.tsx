// app/dashboard/risk/page.tsx
import { lusitana } from '@/app/ui/fonts';
import { fetchGappingBtbDelta, fetchRiskDelta } from '@/app/lib/data';
import type { GappingDeltaSummary } from '@/app/lib/data';
import { KrwDeltaChart, UsdDeltaChart, TotalDeltaChart } from '@/app/ui/risk/delta-chart';

// 금액 포맷 헬퍼
function formatDelta(value: number, format: 'krw' | 'usd'): string {
  const abs = Math.abs(value);
  if (format === 'krw') {
    const eok = abs / 100000000;
    if (eok >= 1) return `${eok.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
    const man = abs / 10000;
    if (man >= 1) return `${man.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
    return abs.toLocaleString('ko-KR');
  }
  const millions = abs / 1000000;
  if (millions >= 1) return `${millions.toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  const thousands = abs / 1000;
  if (thousands >= 1) return `${thousands.toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  return abs.toLocaleString('en-US');
}

// USD 델타 셀: 달러 + 원화 환산 병기
function UsdDeltaCell({ usd, rate }: { usd: number; rate: number }) {
  if (usd <= 0) return <span className="text-gray-400">-</span>;
  const krwEquiv = usd * rate;
  return (
    <div>
      <span className="text-violet-600 dark:text-violet-400">
        ${(usd / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K
      </span>
      <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
        (₩{(krwEquiv / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만)
      </span>
    </div>
  );
}

// 델타값 인라인 행
function DeltaRow({ label, value }: { label: string; value: number }) {
  const isNeg = value < 0;
  const sign = isNeg ? '−' : '+';
  const color = isNeg
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="text-right">
        <span className={`font-mono text-sm font-semibold ${color}`}>
          {sign}₩{formatDelta(value, 'krw')}
        </span>
        <span className="ml-2 font-mono text-[10px] text-gray-400 dark:text-gray-500">
          {sign}{Math.abs(value).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// 통화 그룹 카드 (KRW/KTB 또는 USD/UST 개별 표시)
function CurrencyGroupCard({
  currency,
  items,
}: {
  currency: string;
  items: { label: string; value: number }[];
}) {
  const subtotal = items.reduce((s, i) => s + i.value, 0);
  const isNeg = subtotal < 0;
  const sign = isNeg ? '−' : '+';
  const color = isNeg
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-emerald-600 dark:text-emerald-400';
  const badgeColor = currency === 'KRW'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeColor}`}>
          {currency}
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hedge Net Delta</span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((item) => (
          <DeltaRow key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
      <div className="mt-3 pt-3 border-t-2 border-gray-300 dark:border-gray-600 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">소계</span>
        <div className="text-right">
          <span className={`${lusitana.className} text-xl font-bold ${color}`}>
            {sign}₩{formatDelta(subtotal, 'krw')}
          </span>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
            {sign}{Math.abs(subtotal).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// 전체 Net Delta 카드 (원 단위 합산)
function TotalDeltaCard({ value }: { value: number }) {
  const isNeg = value < 0;
  const sign = isNeg ? '−' : '+';
  const color = isNeg
    ? 'text-rose-500 dark:text-rose-400'
    : 'text-emerald-500 dark:text-emerald-400';

  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-gray-900 dark:bg-gray-100 p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        전체 Net Delta
      </p>
      <p className={`${lusitana.className} mt-3 text-3xl font-bold ${color}`}>
        {sign}₩{formatDelta(value, 'krw')}
      </p>
      <p className="mt-1 font-mono text-[10px] text-gray-500 dark:text-gray-400">
        {sign}{Math.abs(value).toLocaleString()}
      </p>
    </div>
  );
}

// Gapping BTB Delta 카드
function GappingDeltaCard({ data }: { data: GappingDeltaSummary }) {
  const rate = data.usdKrwRate;
  const totalUsdInKrw = data.totalUsd * rate;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-0.5 text-xs font-bold">
          BTB
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Gapping BTB Delta
        </span>
        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
          자산 스왑만 해당 · Notional × 1bp × 잔존만기 · USD/KRW {rate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* 테너별 테이블 */}
      <div className="overflow-y-auto max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white dark:bg-gray-900">
            <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="pb-1.5 text-left font-medium">Tenor</th>
              <th className="pb-1.5 text-right font-medium">KRW Delta</th>
              <th className="pb-1.5 text-right font-medium">USD Delta</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr
                key={item.tenor}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="py-1.5 font-mono font-medium text-gray-700 dark:text-gray-300">
                  {item.tenor}
                </td>
                <td className="py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {item.krwDelta > 0
                    ? `₩${(item.krwDelta / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`
                    : '-'}
                </td>
                <td className="py-1.5 text-right font-mono">
                  <UsdDeltaCell usd={item.usdDelta} rate={rate} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 dark:border-gray-600">
              <td className="pt-2 pb-1 font-semibold text-gray-800 dark:text-gray-200">
                Total
              </td>
              <td className="pt-2 pb-1 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ₩{formatDelta(data.totalKrw, 'krw')}
              </td>
              <td className="pt-2 pb-1 text-right font-mono font-bold">
                <span className="text-violet-600 dark:text-violet-400">
                  ${formatDelta(data.totalUsd, 'usd')}
                </span>
                <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
                  (₩{formatDelta(totalUsdInKrw, 'krw')})
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default async function RiskPage() {
  const [gappingDelta, riskDelta] = await Promise.all([
    fetchGappingBtbDelta(),
    fetchRiskDelta(),
  ]);

  // 최신일 델타 (pnlrtp 기반)
  const latestDelta = riskDelta.data.length > 0
    ? riskDelta.data[riskDelta.data.length - 1]
    : null;

  // 개별 커브 델타 (원 단위)
  const curves = riskDelta.latestCurves ?? { krw: 0, ktb: 0, usd: 0, ust: 0 };

  const baseDateLabel = latestDelta
    ? `${latestDelta.dateFull.slice(0, 4)}-${latestDelta.dateFull.slice(4, 6)}-${latestDelta.dateFull.slice(6, 8)}`
    : '';

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className={`${lusitana.className} text-xl md:text-2xl dark:text-gray-100`}>
          RISK
        </h1>
        {baseDateLabel && (
          <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">기준일</span>
            <span className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">
              {baseDateLabel}
            </span>
          </div>
        )}
      </div>

      {/* NET DELTA(좌) | Gapping BTB Delta(우) */}
      <div className="mb-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* 좌측: KRW·USD 개별 커브 + 전체 Net Delta */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CurrencyGroupCard
              currency="KRW"
              items={[
                { label: 'KRW Hedge', value: curves.krw },
                { label: 'KTB Hedge', value: curves.ktb },
              ]}
            />
            <CurrencyGroupCard
              currency="USD"
              items={[
                { label: 'USD Hedge', value: curves.usd },
                { label: 'UST Hedge', value: curves.ust },
              ]}
            />
          </div>
          <TotalDeltaCard value={curves.krw + curves.ktb + curves.usd + curves.ust} />
        </div>

        {/* 우측: Gapping BTB Delta */}
        <GappingDeltaCard data={gappingDelta} />
      </div>

      {/* KRW Delta vs KTB 10Y */}
      <div className="mb-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          KRW Hedge Net Delta vs KTB 10Y
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            (KRW+KTB Net 델타(억) · 국고채 10년 금리(%))
          </span>
        </h2>
        <KrwDeltaChart data={riskDelta.data} />
      </div>

      {/* USD Delta vs UST 10Y */}
      <div className="mb-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          USD Hedge Net Delta vs UST 10Y
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            (USD+UST Net 델타(억) · 미국채 10년 금리(%))
          </span>
        </h2>
        <UsdDeltaChart data={riskDelta.data} />
      </div>

      {/* Total Delta vs KTB 10Y */}
      <div className="mb-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          Total Hedge Net Delta vs KTB·UST 10Y
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            (KRW+USD 합계(억) · 국고채/미국채 10년 금리(%))
          </span>
        </h2>
        <TotalDeltaChart data={riskDelta.data} />
      </div>

      {/* 신용 리스크 섹션 */}
      <div className="mb-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          신용 리스크 (Credit Risk)
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            거래상대방 신용 노출
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>

      {/* 유동성 리스크 섹션 */}
      <div className="mb-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          유동성 리스크 (Liquidity Risk)
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            만기 구조 / Cash Flow 분석
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>
    </main>
  );
}
