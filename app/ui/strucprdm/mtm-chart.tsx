'use client';

import { MTMGroupData } from '@/app/lib/definitions';

// TP별 라인 색상
const TP_COLORS: Record<string, string> = {
  자산: '#3b82f6',    // blue
  MTM: '#ef4444',     // red
  캐리: '#10b981',    // emerald
  자체발행: '#f59e0b', // amber
};
const COMBINED_COLOR = '#6366f1'; // indigo - 통합 PnL 라인

function formatMtmAxis(v: number): string {
  const b = v / 100000000;
  if (Math.abs(b) >= 1) return `${b.toFixed(0)}억`;
  return `${(v / 10000).toFixed(0)}만`;
}

function formatDateLabel(dt: string): string {
  if (dt.length !== 8) return dt;
  return `${dt.slice(4, 6)}/${dt.slice(6, 8)}`;
}

export default function MTMTimeSeriesChart({ data }: { data: MTMGroupData }) {
  // 반응형: viewBox 기반
  const W = 800;
  const H = 350;
  const padL = 70, padR = 20, padT = 20, padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // 통합 PnL 라인만 표시
  const series = [
    {
      label: '통합 PnL (가격+쿠폰)',
      data: data.combined_mtm,
      color: COMBINED_COLOR,
      strokeWidth: 2.5,
      opacity: 1,
    },
  ];

  // Y축 범위 계산
  const allValues = series.flatMap((s) => s.data.map((d) => d.avg_prc));
  if (allValues.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400 dark:text-gray-500">
        PnL 데이터 없음
      </div>
    );
  }

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const yPad = (rawMax - rawMin) * 0.1 || Math.abs(rawMax) * 0.1 || 1;
  const yMin = rawMin - yPad;
  const yMax = rawMax + yPad;
  const yRange = yMax - yMin;

  // X축: 통합 시계열의 날짜 기준
  const dates = data.combined_mtm.map((d) => d.std_dt);
  const dateCount = dates.length;

  const toX = (i: number) => padL + (i / Math.max(dateCount - 1, 1)) * plotW;
  const toY = (v: number) => padT + ((yMax - v) / yRange) * plotH;

  // Y축 틱 (5개 정도)
  const tickCount = 5;
  const tickStep = yRange / tickCount;
  const yTicks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(yMin + tickStep * i);
  }

  // X축 라벨 (최대 10개)
  const xLabelStep = Math.max(1, Math.ceil(dateCount / 10));

  // 0선 위치
  const zeroY = yMin <= 0 && yMax >= 0 ? toY(0) : null;

  // 날짜 인덱스 맵 (빠른 lookup)
  const dateIdx = new Map(dates.map((d, i) => [d, i]));

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 그리드 라인 */}
        {yTicks.map((tick, i) => (
          <line
            key={`grid-${i}`}
            x1={padL}
            y1={toY(tick)}
            x2={W - padR}
            y2={toY(tick)}
            className="stroke-gray-200 dark:stroke-gray-700"
            strokeDasharray="3"
          />
        ))}

        {/* 0선 (있으면) */}
        {zeroY != null && (
          <line
            x1={padL}
            y1={zeroY}
            x2={W - padR}
            y2={zeroY}
            className="stroke-gray-400 dark:stroke-gray-500"
            strokeWidth={0.5}
          />
        )}

        {/* Y축 라벨 */}
        {yTicks.map((tick, i) => (
          <text
            key={`ylabel-${i}`}
            x={padL - 8}
            y={toY(tick) + 4}
            textAnchor="end"
            className="text-[10px] fill-gray-500 dark:fill-gray-400"
          >
            {formatMtmAxis(tick)}
          </text>
        ))}

        {/* X축 라벨 */}
        {dates.map((dt, i) => {
          if (i % xLabelStep !== 0 && i !== dateCount - 1) return null;
          return (
            <text
              key={`xlabel-${i}`}
              x={toX(i)}
              y={H - padB + 20}
              textAnchor="middle"
              className="text-[10px] fill-gray-500 dark:fill-gray-400"
            >
              {formatDateLabel(dt)}
            </text>
          );
        })}

        {/* 시리즈 라인 (개별 먼저, 통합은 마지막) */}
        {series.map((s, idx) => {
          if (s.data.length < 2) return null;

          // 날짜 인덱스 기준으로 매핑
          const points = s.data
            .map((d) => {
              const xi = dateIdx.get(d.std_dt);
              if (xi == null) return null;
              return { x: toX(xi), y: toY(d.avg_prc) };
            })
            .filter(Boolean) as { x: number; y: number }[];

          if (points.length < 2) return null;

          const pathD = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(' ');

          return (
            <path
              key={`line-${idx}`}
              d={pathD}
              fill="none"
              stroke={s.color}
              strokeWidth={s.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={s.opacity}
            />
          );
        })}

        {/* 축 */}
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={H - padB}
          className="stroke-gray-300 dark:stroke-gray-600"
        />
        <line
          x1={padL}
          y1={H - padB}
          x2={W - padR}
          y2={H - padB}
          className="stroke-gray-300 dark:stroke-gray-600"
        />
      </svg>

      {/* 범례 */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s, idx) => (
          <div key={`legend-${idx}`} className="flex items-center gap-1.5">
            <div
              className="w-3 h-0.5 rounded-full"
              style={{
                backgroundColor: s.color,
                opacity: s.opacity,
                height: s.strokeWidth,
              }}
            />
            <span className="text-[11px] text-gray-600 dark:text-gray-400">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
