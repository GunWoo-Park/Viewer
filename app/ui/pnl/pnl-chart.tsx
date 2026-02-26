'use client';

// 2026년 1~2월 영업일 일별 PnL mock 데이터 (억 단위)
const dailyPnlData = [
  { date: '01/02', daily: 1.8, cumulative: 1.8 },
  { date: '01/05', daily: -0.5, cumulative: 1.3 },
  { date: '01/06', daily: 2.1, cumulative: 3.4 },
  { date: '01/07', daily: 0.7, cumulative: 4.1 },
  { date: '01/08', daily: -1.2, cumulative: 2.9 },
  { date: '01/09', daily: 0.9, cumulative: 3.8 },
  { date: '01/12', daily: 1.5, cumulative: 5.3 },
  { date: '01/13', daily: 0.3, cumulative: 5.6 },
  { date: '01/14', daily: -0.8, cumulative: 4.8 },
  { date: '01/15', daily: 2.4, cumulative: 7.2 },
  { date: '01/16', daily: 1.1, cumulative: 8.3 },
  { date: '01/19', daily: -0.3, cumulative: 8.0 },
  { date: '01/20', daily: 0.6, cumulative: 8.6 },
  { date: '01/21', daily: 1.9, cumulative: 10.5 },
  { date: '01/22', daily: -2.1, cumulative: 8.4 },
  { date: '01/23', daily: 0.4, cumulative: 8.8 },
  { date: '01/26', daily: -0.7, cumulative: 8.1 },
  { date: '01/27', daily: 3.2, cumulative: 11.3 },
  { date: '01/28', daily: 1.4, cumulative: 12.7 },
  { date: '01/29', daily: -0.9, cumulative: 11.8 },
  { date: '01/30', daily: 2.8, cumulative: 14.6 },
  { date: '02/02', daily: 1.3, cumulative: 15.9 },
  { date: '02/03', daily: -0.4, cumulative: 15.5 },
  { date: '02/04', daily: 2.6, cumulative: 18.1 },
  { date: '02/05', daily: 0.8, cumulative: 18.9 },
  { date: '02/06', daily: -1.7, cumulative: 17.2 },
  { date: '02/09', daily: 1.1, cumulative: 18.3 },
  { date: '02/10', daily: 0.5, cumulative: 18.8 },
  { date: '02/11', daily: 3.1, cumulative: 21.9 },
  { date: '02/12', daily: -0.6, cumulative: 21.3 },
  { date: '02/13', daily: 1.9, cumulative: 23.2 },
  { date: '02/19', daily: -1.3, cumulative: 21.9 },
  { date: '02/20', daily: 2.2, cumulative: 24.1 },
  { date: '02/23', daily: 0.7, cumulative: 24.8 },
  { date: '02/24', daily: -0.4, cumulative: 24.4 },
  { date: '02/25', daily: 1.5, cumulative: 25.9 },
  { date: '02/26', daily: 1.2, cumulative: 27.1 },
];

// 펀드별 PnL Attribution (억 단위)
const fundPnlData = [
  { name: '구조화 (10206020)', prc_pnl: 0.82, int_pnl: 3.15, trd_pnl: -0.23, mny_pnl: 0.04, total: 3.78 },
  { name: '캐리매칭 (10206030)', prc_pnl: 0.15, int_pnl: 1.42, trd_pnl: 0.08, mny_pnl: 0.01, total: 1.66 },
  { name: 'Flow (10206010)', prc_pnl: -0.34, int_pnl: 0.67, trd_pnl: 0.45, mny_pnl: -0.02, total: 0.76 },
  { name: '외화 IRS (10206040)', prc_pnl: 1.23, int_pnl: 0.89, trd_pnl: -0.56, mny_pnl: 0.03, total: 1.59 },
  { name: 'ELN/DLS (10206050)', prc_pnl: -0.87, int_pnl: 0.34, trd_pnl: 0.12, mny_pnl: 0.00, total: -0.41 },
];

// 리스크 요인별 PnL Attribution (억 단위)
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

// --- 순수 SVG 차트 ---

export function PnlTrendChart() {
  const data = dailyPnlData;
  const n = data.length;

  // 차트 영역 설정
  const W = 900, H = 300;
  const padL = 55, padR = 15, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Y축 범위 (daily & cumulative 모두 포함)
  const allVals = data.flatMap((d) => [d.daily, d.cumulative]);
  const yMin = Math.floor(Math.min(...allVals) - 1);
  const yMax = Math.ceil(Math.max(...allVals) + 1);
  const yRange = yMax - yMin;

  const toX = (i: number) => padL + (i / (n - 1)) * chartW;
  const toY = (v: number) => padT + ((yMax - v) / yRange) * chartH;
  const zeroY = toY(0);

  // 바 너비
  const barW = Math.max(chartW / n * 0.6, 8);

  // 누적 PnL 라인 path
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.cumulative).toFixed(1)}`)
    .join(' ');

  // Y축 그리드 라인
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v += 5) {
    yTicks.push(v);
  }
  // 0도 포함
  if (!yTicks.includes(0)) yTicks.push(0);
  yTicks.sort((a, b) => a - b);

  // X축 라벨 (5개씩 skip)
  const labelInterval = Math.ceil(n / 10);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" style={{ maxHeight: 320 }}>
        {/* 그리드 */}
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

        {/* 바 차트 (Daily PnL) */}
        {data.map((d, i) => {
          const x = toX(i) - barW / 2;
          const barTop = d.daily >= 0 ? toY(d.daily) : zeroY;
          const barH = Math.abs(toY(d.daily) - zeroY);
          const fill = d.daily >= 0 ? '#60A5FA' : '#F87171';
          return (
            <rect
              key={d.date}
              x={x} y={barTop} width={barW} height={Math.max(barH, 1)}
              fill={fill} rx={2} opacity={0.75}
            />
          );
        })}

        {/* 누적 라인 */}
        <path d={linePath} fill="none" stroke="#F59E0B" strokeWidth={2.5} />
        {/* 누적 라인 도트 */}
        {data.map((d, i) => (
          <circle key={d.date} cx={toX(i)} cy={toY(d.cumulative)} r={2.5} fill="#F59E0B" />
        ))}

        {/* X축 라벨 */}
        {data.map((d, i) =>
          i % labelInterval === 0 ? (
            <text
              key={d.date}
              x={toX(i)} y={H - 8}
              textAnchor="middle"
              className="fill-gray-400"
              style={{ fontSize: 10 }}
            >
              {d.date}
            </text>
          ) : null,
        )}

        {/* 마지막 누적값 라벨 */}
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

// 펀드별 PnL 테이블
export function FundPnlTable() {
  const total = {
    prc_pnl: fundPnlData.reduce((s, r) => s + r.prc_pnl, 0),
    int_pnl: fundPnlData.reduce((s, r) => s + r.int_pnl, 0),
    trd_pnl: fundPnlData.reduce((s, r) => s + r.trd_pnl, 0),
    mny_pnl: fundPnlData.reduce((s, r) => s + r.mny_pnl, 0),
    total: fundPnlData.reduce((s, r) => s + r.total, 0),
  };

  const fmt = (v: number) => {
    const color = v > 0.005
      ? 'text-emerald-600 dark:text-emerald-400'
      : v < -0.005
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-gray-500 dark:text-gray-400';
    return <span className={`font-mono ${color}`}>{v > 0 ? '+' : ''}{v.toFixed(2)}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
            <th className="py-2 pr-4 font-medium">펀드</th>
            <th className="py-2 px-3 font-medium text-right">평가손익</th>
            <th className="py-2 px-3 font-medium text-right">이자손익</th>
            <th className="py-2 px-3 font-medium text-right">매매손익</th>
            <th className="py-2 px-3 font-medium text-right">자금손익</th>
            <th className="py-2 px-3 font-medium text-right">합계 (억)</th>
          </tr>
        </thead>
        <tbody>
          {fundPnlData.map((row) => (
            <tr key={row.name} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{row.name}</td>
              <td className="py-2.5 px-3 text-right">{fmt(row.prc_pnl)}</td>
              <td className="py-2.5 px-3 text-right">{fmt(row.int_pnl)}</td>
              <td className="py-2.5 px-3 text-right">{fmt(row.trd_pnl)}</td>
              <td className="py-2.5 px-3 text-right">{fmt(row.mny_pnl)}</td>
              <td className="py-2.5 px-3 text-right font-bold">{fmt(row.total)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
            <td className="py-2.5 pr-4 text-gray-800 dark:text-gray-200">합계</td>
            <td className="py-2.5 px-3 text-right">{fmt(total.prc_pnl)}</td>
            <td className="py-2.5 px-3 text-right">{fmt(total.int_pnl)}</td>
            <td className="py-2.5 px-3 text-right">{fmt(total.trd_pnl)}</td>
            <td className="py-2.5 px-3 text-right">{fmt(total.mny_pnl)}</td>
            <td className="py-2.5 px-3 text-right">{fmt(total.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 리스크 요인별 PnL Attribution 테이블
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

  // 비중 바 (daily 기준)
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
