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

// 통화별 포맷 분기
function fmtAmt(v: number, curr: string): string {
  return curr === 'USD' ? fmtUsd(v) : fmtKrw(v);
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

  // 통화별 합계
  const krwItems = byCurr['KRW'] || [];
  const usdItems = byCurr['USD'] || [];
  const krwTotal = krwItems.reduce((s, r) => s + r.total_pnl, 0);
  const usdTotal = usdItems.reduce((s, r) => s + r.total_pnl, 0);
  const totalCount = summary.reduce((s, r) => s + r.count, 0);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-baseline gap-3 mb-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Daily PnL</h2>
        {dateStr && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr} 기준</span>
        )}
        {/* KRW 합계 */}
        {krwItems.length > 0 && (
          <span className={`text-lg font-bold font-mono ${amtColor(krwTotal)}`}>
            {fmtKrw(krwTotal)}
          </span>
        )}
        {/* USD 합계 */}
        {usdItems.length > 0 && (
          <>
            {krwItems.length > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
            <span className={`text-lg font-bold font-mono ${amtColor(usdTotal)}`}>
              {fmtUsd(usdTotal)}
            </span>
          </>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ({totalCount}종목)
        </span>
      </div>

      {/* 통화별 테이블 가로 배치 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(byCurr).map(([curr, items]) => {
          if (items.length === 0) return null;
          const currTotal = items.reduce((s, r) => s + r.total_pnl, 0);
          const currMtm = items.reduce((s, r) => s + r.total_daily_pnl, 0);
          const currCoupon = items.reduce((s, r) => s + r.total_coupon, 0);
          const currCount = items.reduce((s, r) => s + r.count, 0);

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
                <span className={`text-sm font-bold font-mono ${amtColor(currTotal)}`}>
                  {fmtAmt(currTotal, curr)}
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
                      <td className={`text-right font-mono font-semibold pr-1 ${amtColor(s.total_daily_pnl)}`}>
                        {fmtAmt(s.total_daily_pnl, curr)}
                      </td>
                      <td className="text-right pr-3 w-20">
                        {s.total_coupon !== 0 ? (
                          <span className={`font-mono text-[10px] ${amtColor(s.total_coupon)}`}>
                            cpn {fmtAmt(s.total_coupon, curr)}
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
                    <td className={`text-right font-mono font-bold pr-1 ${amtColor(currMtm)}`}>
                      {fmtAmt(currMtm, curr)}
                    </td>
                    <td className="text-right pr-3">
                      {currCoupon !== 0 ? (
                        <span className={`font-mono text-[10px] font-semibold ${amtColor(currCoupon)}`}>
                          cpn {fmtAmt(currCoupon, curr)}
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
