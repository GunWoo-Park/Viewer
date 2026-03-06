// app/ui/trading/charts/yield-curve.tsx
// 수익률 커브 차트 — SVG 기반 (외부 라이브러리 불필요)
'use client';

import React, { useState } from 'react';
import SectionCard from '@/app/ui/trading/section-card';
import type { CreditSpread } from '@/app/lib/market-data';

interface YieldCurveChartProps {
  creditSpreads: CreditSpread[];
}

const TENORS = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y', '20Y'];
const TENOR_KEYS = [
  'y3M', 'y6M', 'y1Y', 'y2Y', 'y3Y', 'y5Y', 'y10Y', 'y20Y',
] as const;

// 커브별 색상 (market-data.ts의 sector명 기준)
const CURVE_COLORS: Record<string, string> = {
  '국고': '#4A9EFF',
  '통안': '#00FF87',
  '특수채 AAA': '#FFD700',
  '특수': '#FFD700',
  '은행': '#FF6B6B',
  '중금': '#FF8C94',
  '카드': '#F97316',
  '회사': '#C084FC',
  '지역개발': '#67E8F9',
  '도철': '#A3E635',
};

// 기본 표시할 커브
const DEFAULT_VISIBLE = ['국고', '특수채 AAA', '은행', '회사'];

export default function YieldCurveChart({
  creditSpreads,
}: YieldCurveChartProps) {
  const [visibleCurves, setVisibleCurves] = useState<Set<string>>(
    new Set(DEFAULT_VISIBLE),
  );
  const [hoveredPoint, setHoveredPoint] = useState<{
    name: string;
    tenor: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // 차트 영역 설정
  const W = 600;
  const H = 280;
  const PAD = { top: 20, right: 20, bottom: 35, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // 데이터 범위 계산
  const allValues = creditSpreads
    .filter((c) => visibleCurves.has(c.name))
    .flatMap((c) => TENOR_KEYS.map((k) => c[k]))
    .filter((v) => v > 0);

  const minY = allValues.length > 0 ? Math.floor(Math.min(...allValues) * 10) / 10 - 0.1 : 2.0;
  const maxY = allValues.length > 0 ? Math.ceil(Math.max(...allValues) * 10) / 10 + 0.1 : 5.0;
  const rangeY = maxY - minY || 1;

  // 좌표 변환
  const xScale = (idx: number) => PAD.left + (idx / (TENORS.length - 1)) * chartW;
  const yScale = (val: number) =>
    PAD.top + chartH - ((val - minY) / rangeY) * chartH;

  // 커브 토글
  const toggleCurve = (name: string) => {
    setVisibleCurves((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Y축 그리드 라인
  const yTicks: number[] = [];
  const step = rangeY > 2 ? 0.5 : 0.2;
  for (let v = Math.ceil(minY / step) * step; v <= maxY; v += step) {
    yTicks.push(Math.round(v * 100) / 100);
  }

  return (
    <SectionCard title="Yield Curve" icon="📐" fullWidth>
      {/* 범례 (토글) */}
      <div className="mb-3 flex flex-wrap gap-2">
        {creditSpreads
          .filter((c) => c.name in CURVE_COLORS)
          .map((c) => (
            <button
              key={c.name}
              onClick={() => toggleCurve(c.name)}
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-medium transition-opacity ${
                visibleCurves.has(c.name) ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: CURVE_COLORS[c.name] || '#888' }}
              />
              <span className="text-gray-300">{c.name}</span>
            </button>
          ))}
      </div>

      {/* SVG 차트 */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-[600px]"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* 배경 그리드 */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={yScale(v)}
                x2={W - PAD.right}
                y2={yScale(v)}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={0.5}
              />
              <text
                x={PAD.left - 8}
                y={yScale(v) + 3}
                textAnchor="end"
                className="fill-gray-500 text-[9px] font-trading"
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}

          {/* X축 라벨 */}
          {TENORS.map((t, i) => (
            <text
              key={t}
              x={xScale(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-gray-500 text-[9px] font-trading"
            >
              {t}
            </text>
          ))}

          {/* 커브 라인들 */}
          {creditSpreads
            .filter((c) => visibleCurves.has(c.name) && c.name in CURVE_COLORS)
            .map((curve) => {
              const points = TENOR_KEYS.map((k, i) => ({
                x: xScale(i),
                y: yScale(curve[k] || minY),
                value: curve[k],
                tenor: TENORS[i],
              })).filter((p) => p.value > 0);

              if (points.length < 2) return null;

              const pathD = points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                .join(' ');

              const color = CURVE_COLORS[curve.name] || '#888';

              return (
                <g key={curve.name}>
                  {/* 라인 */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* 데이터 포인트 */}
                  {points.map((p) => (
                    <circle
                      key={`${curve.name}-${p.tenor}`}
                      cx={p.x}
                      cy={p.y}
                      r={3}
                      fill={color}
                      className="cursor-pointer"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          name: curve.name,
                          tenor: p.tenor,
                          value: p.value,
                          x: p.x,
                          y: p.y,
                        })
                      }
                    />
                  ))}
                </g>
              );
            })}

          {/* 호버 툴팁 */}
          {hoveredPoint && (
            <g>
              <rect
                x={hoveredPoint.x - 40}
                y={hoveredPoint.y - 30}
                width={80}
                height={22}
                rx={3}
                fill="rgba(0,0,0,0.85)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={0.5}
              />
              <text
                x={hoveredPoint.x}
                y={hoveredPoint.y - 15}
                textAnchor="middle"
                className="fill-gray-200 text-[9px] font-trading"
              >
                {hoveredPoint.name} {hoveredPoint.tenor}:{' '}
                {hoveredPoint.value.toFixed(3)}%
              </text>
            </g>
          )}
        </svg>
      </div>
    </SectionCard>
  );
}
