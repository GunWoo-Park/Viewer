'use client';

import { PnlSummaryByType } from '@/app/lib/definitions';

// --- 유형별 색상 (구조화 상품 탭과 동일) ---
const TYPE_COLOR: Record<string, string> = {
  'Range Accrual': 'text-sky-700 dark:text-sky-300',
  Spread: 'text-amber-700 dark:text-amber-300',
  Floater: 'text-teal-700 dark:text-teal-300',
  InvF: 'text-indigo-700 dark:text-indigo-300',
  Power: 'text-orange-700 dark:text-orange-300',
  'Zero Callable': 'text-purple-700 dark:text-purple-300',
};

// KRW 포맷 (억/만)
function fmtKrw(v: number): string {
  const b = v / 100000000;
  if (Math.abs(b) >= 0.1) {
    return `${b >= 0 ? '+' : ''}${b.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  }
  const m = v / 10000;
  return `${m >= 0 ? '+' : ''}${m.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
}

// USD 포맷 ($M / $K)
function fmtUsd(v: number): string {
  const m = v / 1000000;
  if (Math.abs(m) >= 0.1) {
    return `${v >= 0 ? '+' : '-'}$${Math.abs(m).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  }
  const k = v / 1000;
  return `${v >= 0 ? '+' : '-'}$${Math.abs(k).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
}

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

// ========== PnL 추이 차트 (실제 데이터) ==========

export function PnlTrendChart({
  data,
}: {
  data: { date: string; daily: number; cumulative: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-gray-400 dark:text-gray-500">
        PnL 추이 데이터가 없습니다
      </div>
    );
  }

  const n = data.length;
  const W = 900, H = 300;
  const padL = 55, padR = 15, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allVals = data.flatMap((d) => [d.daily, d.cumulative]);
  const yMin = Math.floor(Math.min(...allVals) - 1);
  const yMax = Math.ceil(Math.max(...allVals) + 1);
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => padL + (i / Math.max(n - 1, 1)) * chartW;
  const toY = (v: number) => padT + ((yMax - v) / yRange) * chartH;
  const zeroY = toY(0);

  const barW = Math.max((chartW / n) * 0.6, 8);

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.cumulative).toFixed(1)}`)
    .join(' ');

  const yTicks: number[] = [];
  const step = Math.max(Math.ceil(yRange / 8), 1);
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    yTicks.push(v);
  }
  if (!yTicks.includes(0)) yTicks.push(0);
  yTicks.sort((a, b) => a - b);

  const labelInterval = Math.ceil(n / 10);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" style={{ maxHeight: 320 }}>
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)}
              stroke={v === 0 ? '#6B7280' : '#374151'}
              strokeWidth={v === 0 ? 1 : 0.5}
              strokeDasharray={v === 0 ? '' : '4 4'}
              opacity={0.5}
            />
            <text x={padL - 8} y={toY(v) + 4} textAnchor="end" className="fill-gray-400" style={{ fontSize: 11 }}>
              {v}억
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = toX(i) - barW / 2;
          const barTop = d.daily >= 0 ? toY(d.daily) : zeroY;
          const barH = Math.abs(toY(d.daily) - zeroY);
          const fill = d.daily >= 0 ? '#60A5FA' : '#F87171';
          return (
            <rect
              key={d.date + i}
              x={x} y={barTop} width={barW} height={Math.max(barH, 1)}
              fill={fill} rx={2} opacity={0.75}
            />
          );
        })}

        <path d={linePath} fill="none" stroke="#F59E0B" strokeWidth={2.5} />
        {data.map((d, i) => (
          <circle key={d.date + i} cx={toX(i)} cy={toY(d.cumulative)} r={2.5} fill="#F59E0B" />
        ))}

        {data.map((d, i) =>
          i % labelInterval === 0 ? (
            <text
              key={d.date + i}
              x={toX(i)} y={H - 8}
              textAnchor="middle"
              className="fill-gray-400"
              style={{ fontSize: 10 }}
            >
              {d.date}
            </text>
          ) : null,
        )}

        <text
          x={toX(n - 1) + 5}
          y={toY(data[n - 1].cumulative) - 8}
          textAnchor="start"
          className="fill-amber-500 font-bold"
          style={{ fontSize: 12 }}
        >
          {data[n - 1].cumulative.toFixed(1)}억
        </text>
      </svg>
    </div>
  );
}

// ========== 유형별 PnL Breakdown 테이블 ==========

export function TypePnlTable({
  summary,
}: {
  summary: PnlSummaryByType[];
}) {
  if (summary.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400 dark:text-gray-500">
        PnL 데이터가 없습니다
      </div>
    );
  }

  // 통화별 그룹
  const currencies = ['KRW', 'USD'];
  const byCurr: Record<string, PnlSummaryByType[]> = {};
  for (const c of currencies) {
    const items = summary.filter((s) => s.curr === c);
    if (items.length > 0) byCurr[c] = items;
  }
  const others = summary.filter((s) => !currencies.includes(s.curr));
  if (others.length > 0) byCurr['기타'] = others;

  const totalPnlKrw = summary.reduce((s, r) => s + r.total_pnl_krw, 0);
  const totalCount = summary.reduce((s, r) => s + r.count, 0);

  return (
    <div>
      {/* 전체 합계 헤더 */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-lg font-bold font-mono ${amtColor(totalPnlKrw)}`}>
          {fmtKrw(totalPnlKrw)}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">({totalCount}종목)</span>
      </div>

      <div className="space-y-2">
        {Object.entries(byCurr).map(([curr, items]) => {
          const currTotalKrw = items.reduce((s, r) => s + r.total_pnl_krw, 0);
          const currMtmKrw = items.reduce((s, r) => s + r.total_daily_pnl_krw, 0);
          const currCouponKrw = items.reduce((s, r) => s + r.total_coupon_krw, 0);
          const currCount = items.reduce((s, r) => s + r.count, 0);
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
                      <td className="text-right pr-3 w-24">
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
                  {/* 소계 */}
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

// ========== Risk Factor Attribution (mock 유지) ==========

const riskPnlData = [
  { factor: 'Carry', daily: 3.21, mtd: 12.45, ytd: 27.82 },
  { factor: 'Delta (금리)', daily: -1.34, mtd: -2.18, ytd: 5.43 },
  { factor: 'Gamma/Convexity', daily: 0.12, mtd: 0.87, ytd: 1.95 },
  { factor: 'Vega (변동성)', daily: -0.28, mtd: -0.63, ytd: -1.12 },
  { factor: 'FX', daily: 0.45, mtd: 1.92, ytd: -3.21 },
  { factor: 'Credit Spread', daily: -0.08, mtd: -0.34, ytd: -0.87 },
  { factor: 'Theta (시간가치)', daily: 0.06, mtd: 0.32, ytd: 0.68 },
  { factor: '기타/잔차', daily: -0.94, mtd: 0.09, ytd: -3.57 },
];

export function RiskAttributionTable() {
  const total = {
    daily: riskPnlData.reduce((s, r) => s + r.daily, 0),
    mtd: riskPnlData.reduce((s, r) => s + r.mtd, 0),
    ytd: riskPnlData.reduce((s, r) => s + r.ytd, 0),
  };

  const fmt = (v: number) => {
    const color = v > 0.005
      ? 'text-emerald-600 dark:text-emerald-400'
      : v < -0.005
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-gray-500 dark:text-gray-400';
    return <span className={`font-mono ${color}`}>{v > 0 ? '+' : ''}{v.toFixed(2)}</span>;
  };

  const maxAbs = Math.max(...riskPnlData.map((r) => Math.abs(r.daily)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
            <th className="py-2 pr-4 font-medium">리스크 요인</th>
            <th className="py-2 px-3 font-medium text-right">Daily (억)</th>
            <th className="py-2 px-2 font-medium w-24"></th>
            <th className="py-2 px-3 font-medium text-right">MTD (억)</th>
            <th className="py-2 px-3 font-medium text-right">YTD (억)</th>
          </tr>
        </thead>
        <tbody>
          {riskPnlData.map((row) => {
            const barPct = (Math.abs(row.daily) / maxAbs) * 100;
            const barColor = row.daily >= 0 ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-rose-400 dark:bg-rose-500';
            return (
              <tr key={row.factor} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{row.factor}</td>
                <td className="py-2.5 px-3 text-right">{fmt(row.daily)}</td>
                <td className="py-2.5 px-2">
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barPct}%` }} />
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">{fmt(row.mtd)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(row.ytd)}</td>
              </tr>
            );
          })}
          <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
            <td className="py-2.5 pr-4 text-gray-800 dark:text-gray-200">합계</td>
            <td className="py-2.5 px-3 text-right">{fmt(total.daily)}</td>
            <td className="py-2.5 px-2"></td>
            <td className="py-2.5 px-3 text-right">{fmt(total.mtd)}</td>
            <td className="py-2.5 px-3 text-right">{fmt(total.ytd)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
