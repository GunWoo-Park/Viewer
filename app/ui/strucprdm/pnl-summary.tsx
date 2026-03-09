// 유형별 Daily PnL 요약 카드
import { PnlSummaryByType } from '@/app/lib/definitions';

function fmtAmt(v: number): string {
  const b = v / 100000000;
  if (Math.abs(b) >= 1) {
    return `${b >= 0 ? '+' : ''}${b.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  }
  const m = v / 10000;
  return `${m >= 0 ? '+' : ''}${m.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
}

function amtColor(v: number): string {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-gray-500 dark:text-gray-400';
}

// type1별 배경색
const TYPE_BG: Record<string, string> = {
  'Range Accrual': 'border-sky-500/30 bg-sky-50/50 dark:bg-sky-900/10',
  Spread: 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10',
  Floater: 'border-teal-500/30 bg-teal-50/50 dark:bg-teal-900/10',
  InvF: 'border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-900/10',
  Power: 'border-orange-500/30 bg-orange-50/50 dark:bg-orange-900/10',
  'Zero Callable': 'border-purple-500/30 bg-purple-50/50 dark:bg-purple-900/10',
};

export default function PnlSummaryCards({
  summary,
  latestDate,
}: {
  summary: PnlSummaryByType[];
  latestDate: string;
}) {
  if (summary.length === 0) return null;

  // 전체 합계
  const grandPnl = summary.reduce((s, r) => s + r.total_pnl, 0);
  const grandMtm = summary.reduce((s, r) => s + r.total_daily_pnl, 0);
  const grandCoupon = summary.reduce((s, r) => s + r.total_coupon, 0);
  const totalCount = summary.reduce((s, r) => s + r.count, 0);

  const dateStr = latestDate
    ? `${latestDate.slice(0, 4)}-${latestDate.slice(4, 6)}-${latestDate.slice(6, 8)}`
    : '';

  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Daily PnL</h2>
        {dateStr && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr} 기준</span>
        )}
      </div>

      {/* 전체 합계 */}
      <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">전체 ({totalCount}종목)</p>
            <p className={`text-2xl font-bold font-mono ${amtColor(grandPnl)}`}>
              {fmtAmt(grandPnl)}
            </p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">MTM 변동</p>
              <p className={`text-sm font-semibold font-mono ${amtColor(grandMtm)}`}>
                {fmtAmt(grandMtm)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">쿠폰</p>
              <p className={`text-sm font-semibold font-mono ${amtColor(grandCoupon)}`}>
                {grandCoupon !== 0 ? fmtAmt(grandCoupon) : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 유형별 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {summary.map((s) => {
          const bg = TYPE_BG[s.type1] || 'border-gray-300/30 bg-gray-50/50 dark:bg-gray-800/50';
          return (
            <div key={s.type1} className={`rounded-lg border p-3 ${bg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {s.type1}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{s.count}종목</span>
              </div>
              <p className={`text-base font-bold font-mono ${amtColor(s.total_pnl)}`}>
                {fmtAmt(s.total_pnl)}
              </p>
              <div className="mt-1 flex gap-3 text-[10px]">
                <span className={`font-mono ${amtColor(s.total_daily_pnl)}`}>
                  MTM {fmtAmt(s.total_daily_pnl)}
                </span>
                {s.total_coupon !== 0 && (
                  <span className={`font-mono ${amtColor(s.total_coupon)}`}>
                    쿠폰 {fmtAmt(s.total_coupon)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
