'use client';

import { useState, useEffect } from 'react';

type DeltaDataPoint = {
  date: string;
  dateFull: string;
  krwDelta: number;
  usdDelta: number;
  totalDelta: number;
  ktb10y: number | null;
  ust10y: number | null;
};

// 색상 상수
const KRW_COLOR = '#10b981';  // emerald-500
const USD_COLOR = '#8b5cf6';  // violet-500
const TOTAL_COLOR = '#3b82f6'; // blue-500
const KTB_RATE_COLOR = '#f59e0b'; // amber-500
const UST_RATE_COLOR = '#ef4444'; // red-500

/**
 * 듀얼 Y축 차트: 왼쪽 = 델타(바), 오른쪽 = 금리(라인)
 */
function DualAxisChart({
  data,
  deltaKey,
  deltaLabel,
  deltaColor,
  rateKey,
  rateLabel,
  rateColor,
  deltaUnit,
  rateKey2,
  rateLabel2,
  rateColor2,
}: {
  data: DeltaDataPoint[];
  deltaKey: 'krwDelta' | 'usdDelta' | 'totalDelta';
  deltaLabel: string;
  deltaColor: string;
  rateKey: 'ktb10y' | 'ust10y';
  rateLabel: string;
  rateColor: string;
  deltaUnit: string;
  rateKey2?: 'ktb10y' | 'ust10y';
  rateLabel2?: string;
  rateColor2?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[320px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;
  }

  if (data.length === 0) return <div className="h-40 flex items-center justify-center text-gray-400">데이터 없음</div>;

  const n = data.length;
  const W = 1200, H = 320;
  const padL = 70, padR = 70, padT = 20, padB = 45;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // 델타 Y축 (왼쪽)
  const deltas = data.map((d) => d[deltaKey]);
  const dMin = Math.min(...deltas);
  const dMax = Math.max(...deltas);
  const dPad = Math.max((dMax - dMin) * 0.1, 1);
  const dYMin = Math.floor(dMin - dPad);
  const dYMax = Math.ceil(dMax + dPad);
  const dYRange = dYMax - dYMin || 1;

  // 금리 Y축 (오른쪽) — 두 번째 금리도 범위에 포함
  const rates1 = data.map((d) => d[rateKey]).filter((v): v is number => v !== null);
  const rates2 = rateKey2 ? data.map((d) => d[rateKey2]).filter((v): v is number => v !== null) : [];
  const allRates = [...rates1, ...rates2];
  const rMin = allRates.length > 0 ? Math.min(...allRates) : 0;
  const rMax = allRates.length > 0 ? Math.max(...allRates) : 5;
  const rPad = Math.max((rMax - rMin) * 0.15, 0.1);
  const rYMin = Math.floor((rMin - rPad) * 20) / 20;
  const rYMax = Math.ceil((rMax + rPad) * 20) / 20;
  const rYRange = rYMax - rYMin || 1;

  const toX = (i: number) => padL + ((i + 0.5) / n) * chartW;
  const toDY = (v: number) => padT + ((dYMax - v) / dYRange) * chartH;
  const toRY = (v: number) => padT + ((rYMax - v) / rYRange) * chartH;
  const zeroY = toDY(0);

  const barW = Math.max((chartW / n) * 0.6, 4);

  // 금리 라인 패스 (1차)
  const ratePoints = data
    .map((d, i) => (d[rateKey] !== null ? { x: toX(i), y: toRY(d[rateKey] as number) } : null))
    .filter((p): p is { x: number; y: number } => p !== null);
  const ratePath = ratePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // 금리 라인 패스 (2차, optional)
  let ratePath2 = '';
  let ratePoints2: { x: number; y: number }[] = [];
  if (rateKey2) {
    ratePoints2 = data
      .map((d, i) => (d[rateKey2] !== null ? { x: toX(i), y: toRY(d[rateKey2] as number) } : null))
      .filter((p): p is { x: number; y: number } => p !== null);
    ratePath2 = ratePoints2.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  // Y축 ticks (델타)
  const dStep = Math.max(Math.ceil((dYMax - dYMin) / 6), 1);
  const dTicks: number[] = [];
  for (let v = Math.ceil(dYMin / dStep) * dStep; v <= dYMax; v += dStep) dTicks.push(v);
  if (!dTicks.includes(0) && dYMin <= 0 && dYMax >= 0) dTicks.push(0);
  dTicks.sort((a, b) => a - b);

  // Y축 ticks (금리)
  const rStep = Math.max(Math.ceil((rYRange / 5) * 20) / 20, 0.05);
  const rTicks: number[] = [];
  for (let v = Math.ceil(rYMin / rStep) * rStep; v <= rYMax + rStep * 0.01; v += rStep) {
    rTicks.push(Math.round(v * 100) / 100);
  }

  const labelInterval = Math.max(Math.ceil(n / 12), 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 700, maxHeight: 340 }}>
        {/* 그리드 (델타 기준) */}
        {dTicks.map((v) => (
          <line key={`dg-${v}`}
            x1={padL} y1={toDY(v)} x2={W - padR} y2={toDY(v)}
            stroke={v === 0 ? '#6B7280' : '#374151'}
            strokeWidth={v === 0 ? 1 : 0.5}
            strokeDasharray={v === 0 ? '' : '4 4'}
            opacity={0.4}
          />
        ))}

        {/* 왼쪽 Y축 라벨 (델타) */}
        {dTicks.map((v) => (
          <text key={`dl-${v}`} x={padL - 8} y={toDY(v) + 4} textAnchor="end"
            style={{ fontSize: 10 }} fill={deltaColor}>
            {v}{deltaUnit}
          </text>
        ))}

        {/* 오른쪽 Y축 라벨 (금리) */}
        {rTicks.map((v) => (
          <text key={`rl-${v}`} x={W - padR + 8} y={toRY(v) + 4} textAnchor="start"
            style={{ fontSize: 10 }} fill="#9CA3AF">
            {v.toFixed(2)}%
          </text>
        ))}

        {/* 델타 바 */}
        {data.map((d, i) => {
          const val = d[deltaKey];
          const x = toX(i) - barW / 2;
          const barTop = val >= 0 ? toDY(val) : zeroY;
          const barH = Math.abs(toDY(val) - zeroY);
          return (
            <rect key={i} x={x} y={barTop} width={barW} height={Math.max(barH, 0.5)}
              fill={deltaColor} opacity={0.6} rx={1}>
              <title>{d.date}: {val}{deltaUnit}</title>
            </rect>
          );
        })}

        {/* 금리 라인 1 */}
        {ratePath && <path d={ratePath} fill="none" stroke={rateColor} strokeWidth={2.5} strokeLinejoin="round" />}
        {data.map((d, i) => {
          if (d[rateKey] === null) return null;
          return <circle key={`rc-${i}`} cx={toX(i)} cy={toRY(d[rateKey] as number)} r={2.5}
            fill={rateColor} stroke="white" strokeWidth={1} />;
        })}

        {/* 금리 라인 2 (optional) */}
        {rateKey2 && ratePath2 && (
          <path d={ratePath2} fill="none" stroke={rateColor2} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray="6 3" />
        )}
        {rateKey2 && data.map((d, i) => {
          if (d[rateKey2] === null) return null;
          return <circle key={`rc2-${i}`} cx={toX(i)} cy={toRY(d[rateKey2] as number)} r={2.5}
            fill={rateColor2} stroke="white" strokeWidth={1} />;
        })}

        {/* X축 날짜 */}
        {data.map((d, i) =>
          i % labelInterval === 0 ? (
            <text key={i} x={toX(i)} y={H - 8} textAnchor="middle"
              className="fill-gray-400" style={{ fontSize: 9 }}>
              {d.date}
            </text>
          ) : null,
        )}

        {/* 축 레이블 */}
        <text x={padL - 5} y={padT - 5} textAnchor="end" style={{ fontSize: 9 }} fill={deltaColor}>
          {deltaLabel} ({deltaUnit})
        </text>
        <text x={W - padR + 5} y={padT - 5} textAnchor="start" style={{ fontSize: 9 }} fill="#9CA3AF">
          금리 (%)
        </text>
      </svg>

      {/* 범례 */}
      <div className="mt-2 flex items-center justify-center gap-x-6 text-[10px] text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: deltaColor, opacity: 0.6 }} />
          <span>{deltaLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5" style={{ backgroundColor: rateColor }} />
          <span>{rateLabel}</span>
        </div>
        {rateKey2 && rateLabel2 && rateColor2 && (
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-5" style={{ backgroundColor: rateColor2, borderTop: '2px dashed' }} />
            <span>{rateLabel2}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function KrwDeltaChart({ data }: { data: DeltaDataPoint[] }) {
  return (
    <DualAxisChart
      data={data}
      deltaKey="krwDelta"
      deltaLabel="KRW Delta"
      deltaColor={KRW_COLOR}
      rateKey="ktb10y"
      rateLabel="KTB 10Y"
      rateColor={KTB_RATE_COLOR}
      deltaUnit="억"
    />
  );
}

export function UsdDeltaChart({ data }: { data: DeltaDataPoint[] }) {
  return (
    <DualAxisChart
      data={data}
      deltaKey="usdDelta"
      deltaLabel="USD Delta"
      deltaColor={USD_COLOR}
      rateKey="ust10y"
      rateLabel="UST 10Y"
      rateColor={UST_RATE_COLOR}
      deltaUnit="억"
    />
  );
}

export function TotalDeltaChart({ data }: { data: DeltaDataPoint[] }) {
  return (
    <DualAxisChart
      data={data}
      deltaKey="totalDelta"
      deltaLabel="Total Delta"
      deltaColor={TOTAL_COLOR}
      rateKey="ktb10y"
      rateLabel="KTB 10Y"
      rateColor={KTB_RATE_COLOR}
      deltaUnit="억"
      rateKey2="ust10y"
      rateLabel2="UST 10Y"
      rateColor2={UST_RATE_COLOR}
    />
  );
}
