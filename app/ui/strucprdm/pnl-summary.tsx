// 통화 × 유형별 Daily PnL 요약 — 컴팩트 테이블 형태
import { PnlSummaryByType } from '@/app/lib/definitions';

// KRW 금액 포맷 (억/만)
function fmtKrw(v: number): string {
  const b = v / 100000000;
  if (Math.abs(b) >= 0.1) {
    return `${b >= 0 ? '+' : ''}${b.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  }
  const m = v / 10000;
  return `${m >= 0 ? '+' : ''}${m.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
}

// USD 금액 포맷 ($M / $K)
function fmtUsd(v: number): string {
  const m = v / 1000000;
  if (Math.abs(m) >= 0.1) {
    return `${v >= 0 ? '+' : '-'}$${Math.abs(m).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  }
  const k = v / 1000;
  return `${v >= 0 ? '+' : '-'}$${Math.abs(k).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
}

// 원화 메인 + USD는 괄호
function fmtAmt(krwVal: number, curr: string, usdVal?: number): string {
  const main = fmtKrw(krwVal);
  if (curr === 'USD' && usdVal !== undefined) {
    return `${main} (${fmtUsd(usdVal)})`;
  }
  return main;
}

function amtColor(v: number): string {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-gray-500 dark:text-gray-400';
}

// 유형별 텍스트 색상
const TYPE_COLOR: Record<string, string> = {
  'Range Accrual': 'text-sky-700 dark:text-sky-300',
  Spread: 'text-amber-700 dark:text-amber-300',
  Floater: 'text-teal-700 dark:text-teal-300',
  InvF: 'text-indigo-700 dark:text-indigo-300',
  Power: 'text-orange-700 dark:text-orange-300',
  'Zero Callable': 'text-purple-700 dark:text-purple-300',
};

export default function PnlSummaryCards({
  summary,
  latestDate,
}: {
  summary: PnlSummaryByType[];
  latestDate: string;
}) {
  if (summary.length === 0) return null;

  const dateStr = latestDate
    ? `${latestDate.slice(0, 4)}-${latestDate.slice(4, 6)}-${latestDate.slice(6, 8)}`
    : '';

  // 통화별 그룹
  const currencies = ['KRW', 'USD'];
  const byCurr: Record<string, PnlSummaryByType[]> = {};
  for (const c of currencies) {
    byCurr[c] = summary.filter((s) => s.curr === c);
  }
  // 기타 통화
  const otherCurr = summary.filter((s) => !currencies.includes(s.curr));
  if (otherCurr.length > 0) {
    byCurr['기타'] = otherCurr;
  }

  // 전체 원화 환산 합계
  const totalPnlKrw = summary.reduce((s, r) => s + r.total_pnl_krw, 0);
  const totalCount = summary.reduce((s, r) => s + r.count, 0);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-baseline gap-3 mb-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Daily PnL</h2>
        {dateStr && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr} 기준</span>
        )}
        {/* 전체 원화 합계 */}
        <span className={`text-lg font-bold font-mono ${amtColor(totalPnlKrw)}`}>
          {fmtKrw(totalPnlKrw)}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ({totalCount}종목)
        </span>
      </div>

      {/* 통화별 테이블 가로 배치 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(byCurr).map(([curr, items]) => {
          if (items.length === 0) return null;
          const currTotalKrw = items.reduce((s, r) => s + r.total_pnl_krw, 0);
          const currMtmKrw = items.reduce((s, r) => s + r.total_daily_pnl_krw, 0);
          const currCouponKrw = items.reduce((s, r) => s + r.total_coupon_krw, 0);
          const currCount = items.reduce((s, r) => s + r.count, 0);
          // USD 달러 합계 (괄호 표시용)
          const isUsd = curr === 'USD';
          const currTotalUsd = isUsd ? items.reduce((s, r) => s + r.total_pnl, 0) : 0;
          const currMtmUsd = isUsd ? items.reduce((s, r) => s + r.total_daily_pnl, 0) : 0;
          const currCouponUsd = isUsd ? items.reduce((s, r) => s + r.total_coupon, 0) : 0;

          return (
            <div
              key={curr}
              className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* 통화 헤더 */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    curr === 'KRW'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                  }`}>
                    {curr}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{currCount}종목</span>
                </div>
                <span className={`text-sm font-bold font-mono ${amtColor(currTotalKrw)}`}>
                  {fmtAmt(currTotalKrw, curr, isUsd ? currTotalUsd : undefined)}
                </span>
              </div>

              {/* 유형별 행 */}
              <table className="w-full text-xs">
                <tbody>
                  {items.map((s) => (
                    <tr
                      key={s.type1}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <td className="pl-3 py-1">
                        <span className={`font-medium ${TYPE_COLOR[s.type1] || 'text-gray-600 dark:text-gray-400'}`}>
                          {s.type1}
                        </span>
                        <span className="ml-1 text-[10px] text-gray-400">{s.count}</span>
                      </td>
                      <td className={`text-right font-mono font-semibold pr-1 ${amtColor(s.total_daily_pnl_krw)}`}>
                        {fmtAmt(s.total_daily_pnl_krw, curr, isUsd ? s.total_daily_pnl : undefined)}
                      </td>
                      <td className="text-right pr-3 w-20">
                        {s.total_coupon !== 0 ? (
                          <span className={`font-mono text-[10px] ${amtColor(s.total_coupon_krw)}`}>
                            cpn {fmtAmt(s.total_coupon_krw, curr, isUsd ? s.total_coupon : undefined)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* 통화 소계 */}
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                    <td className="pl-3 py-1 text-gray-500 dark:text-gray-400 font-medium">소계</td>
                    <td className={`text-right font-mono font-bold pr-1 ${amtColor(currMtmKrw)}`}>
                      {fmtAmt(currMtmKrw, curr, isUsd ? currMtmUsd : undefined)}
                    </td>
                    <td className="text-right pr-3">
                      {currCouponKrw !== 0 ? (
                        <span className={`font-mono text-[10px] font-semibold ${amtColor(currCouponKrw)}`}>
                          cpn {fmtAmt(currCouponKrw, curr, isUsd ? currCouponUsd : undefined)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
