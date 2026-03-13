'use client';

import { useState, useEffect } from 'react';
import { PnlSummaryByType } from '@/app/lib/definitions';

// --- type1 기준 색상 (구조화 상품 탭과 동일) ---
const TYPE_COLORS: Record<string, { text: string; fill: string }> = {
  'Range Accrual': { text: 'text-sky-700 dark:text-sky-300', fill: '#0284c7' },
  Spread: { text: 'text-amber-700 dark:text-amber-300', fill: '#d97706' },
  Floater: { text: 'text-teal-700 dark:text-teal-300', fill: '#0d9488' },
  InvF: { text: 'text-indigo-700 dark:text-indigo-300', fill: '#4f46e5' },
  Power: { text: 'text-orange-700 dark:text-orange-300', fill: '#ea580c' },
  'Zero Callable': { text: 'text-purple-700 dark:text-purple-300', fill: '#9333ea' },
  '기타': { text: 'text-gray-600 dark:text-gray-400', fill: '#6b7280' },
};

function getTypeColor(type1: string): { text: string; fill: string } {
  return TYPE_COLORS[type1] || TYPE_COLORS['기타'];
}

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

// 액면 포맷 (억 단위, 부호 없음)
function fmtNotn(v: number, curr: string): string {
  if (curr === 'USD') {
    const m = v / 1000000;
    if (Math.abs(m) >= 1) return `$${m.toLocaleString('en-US', { maximumFractionDigits: 0 })}M`;
    const k = v / 1000;
    return `$${k.toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
  }
  const eok = v / 100000000;
  return `${eok.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억`;
}

// ========== YTD PnL 추이 차트 (Stacked Bar + Cumulative Line) ==========

export function PnlTrendChart({
  data,
  allTypes,
}: {
  data: { date: string; daily: number; cumulative: number; byType: Record<string, number> }[];
  allTypes: string[];
}) {
  const [mounted, setMounted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[360px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-gray-400 dark:text-gray-500">
        PnL 추이 데이터가 없습니다
      </div>
    );
  }

  const n = data.length;
  // 차트를 좌우로 더 넓게
  const W = 1200, H = 340;
  const padL = 55, padR = 20, padT = 20, padB = 45;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Y축 범위
  const allVals = data.flatMap((d) => [d.daily, d.cumulative]);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const yPad = Math.max((rawMax - rawMin) * 0.1, 1);
  const yMin = Math.floor(rawMin - yPad);
  const yMax = Math.ceil(rawMax + yPad);
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => padL + ((i + 0.5) / n) * chartW;
  const toY = (v: number) => padT + ((yMax - v) / yRange) * chartH;
  const zeroY = toY(0);

  const barW = Math.max((chartW / n) * 0.7, 6);

  // 누적 PnL 라인
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.cumulative).toFixed(1)}`)
    .join(' ');

  // Y축 ticks
  const yTicks: number[] = [];
  const step = Math.max(Math.ceil(yRange / 8), 1);
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    yTicks.push(v);
  }
  if (!yTicks.includes(0)) yTicks.push(0);
  yTicks.sort((a, b) => a - b);

  const labelInterval = Math.max(Math.ceil(n / 15), 1);

  // 유형 색상 맵
  const typeColorMap: Record<string, string> = {};
  for (const t of allTypes) {
    typeColorMap[t] = getTypeColor(t).fill;
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 800, maxHeight: 360 }}>
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
            <text x={padL - 8} y={toY(v) + 4} textAnchor="end" className="fill-gray-400" style={{ fontSize: 10 }}>
              {v}억
            </text>
          </g>
        ))}

        {/* Stacked Bar 차트 (유형별) */}
        {data.map((d, i) => {
          const x = toX(i) - barW / 2;
          // 양수/음수 유형 분리
          const positiveTypes = allTypes.filter((t) => (d.byType[t] || 0) > 0);
          const negativeTypes = allTypes.filter((t) => (d.byType[t] || 0) < 0);

          const bars: JSX.Element[] = [];

          // 양수: 0선 위로 쌓기
          let posOffset = 0;
          for (const t of positiveTypes) {
            const val = d.byType[t] || 0;
            const barH = Math.abs(toY(0) - toY(val));
            const y = zeroY - posOffset - barH;
            bars.push(
              <rect
                key={`${i}-${t}`}
                x={x} y={y} width={barW} height={Math.max(barH, 0.5)}
                fill={typeColorMap[t] || '#6b7280'}
                opacity={0.8}
                rx={1}
              >
                <title>{t}: {val > 0 ? '+' : ''}{val.toFixed(2)}억</title>
              </rect>
            );
            posOffset += barH;
          }

          // 음수: 0선 아래로 쌓기
          let negOffset = 0;
          for (const t of negativeTypes) {
            const val = d.byType[t] || 0;
            const barH = Math.abs(toY(val) - toY(0));
            const y = zeroY + negOffset;
            bars.push(
              <rect
                key={`${i}-${t}`}
                x={x} y={y} width={barW} height={Math.max(barH, 0.5)}
                fill={typeColorMap[t] || '#6b7280'}
                opacity={0.8}
                rx={1}
              >
                <title>{t}: {val.toFixed(2)}억</title>
              </rect>
            );
            negOffset += barH;
          }

          return <g key={i}>{bars}</g>;
        })}

        {/* 누적 라인 */}
        <path d={linePath} fill="none" stroke="#F59E0B" strokeWidth={2.5} />
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.cumulative)} r={2} fill="#F59E0B" />
        ))}

        {/* X축 라벨 */}
        {data.map((d, i) =>
          i % labelInterval === 0 ? (
            <text
              key={i}
              x={toX(i)} y={H - 8}
              textAnchor="middle"
              className="fill-gray-400"
              style={{ fontSize: 9 }}
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
          style={{ fontSize: 11 }}
        >
          {data[n - 1].cumulative.toFixed(1)}억
        </text>

        {/* 호버 인터랙션 영역 */}
        {data.map((d, i) => {
          const colW = chartW / n;
          return (
            <rect key={`hover-${i}`} x={padL + i * colW} y={padT} width={colW} height={chartH}
              fill="transparent" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'crosshair' }} />
          );
        })}

        {/* 호버 가이드라인 */}
        {hoveredIdx !== null && (
          <line x1={toX(hoveredIdx)} y1={padT} x2={toX(hoveredIdx)} y2={padT + chartH}
            stroke="#9CA3AF" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        )}

        {/* 호버 시 누적 라인 강조 점 */}
        {hoveredIdx !== null && (
          <circle cx={toX(hoveredIdx)} cy={toY(data[hoveredIdx].cumulative)} r={5}
            fill="#F59E0B" stroke="white" strokeWidth={2} />
        )}

        {/* 툴팁 */}
        {hoveredIdx !== null && (() => {
          const d = data[hoveredIdx];
          const cx = toX(hoveredIdx);
          const tooltipW = 180;
          const tooltipOnLeft = cx > padL + chartW / 2;
          const tx = tooltipOnLeft ? cx - tooltipW - 12 : cx + 12;
          const ty = padT + 10;
          // 유형별 상세 (0이 아닌 것만)
          const typeEntries = allTypes
            .filter((t) => d.byType[t] && Math.abs(d.byType[t]) > 0.001)
            .sort((a, b) => (d.byType[b] || 0) - (d.byType[a] || 0));
          const maxTypeRows = 5;
          const shownTypes = typeEntries.slice(0, maxTypeRows);
          const boxH = 46 + shownTypes.length * 16;
          return (
            <g>
              <rect x={tx} y={ty} width={tooltipW} height={boxH} rx={6}
                fill="#1f2937" fillOpacity={0.95} stroke="#374151" strokeWidth={1} />
              <text x={tx + tooltipW / 2} y={ty + 16} textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 600 }} fill="#e5e7eb">{d.date}</text>
              <text x={tx + 10} y={ty + 32} style={{ fontSize: 10 }} fill="#9ca3af">Daily</text>
              <text x={tx + tooltipW / 2 - 5} y={ty + 32} textAnchor="end"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
                fill={d.daily >= 0 ? '#34d399' : '#fb7185'}>{d.daily > 0 ? '+' : ''}{d.daily.toFixed(2)}억</text>
              <text x={tx + tooltipW / 2 + 5} y={ty + 32} style={{ fontSize: 10 }} fill="#9ca3af">누적</text>
              <text x={tx + tooltipW - 10} y={ty + 32} textAnchor="end"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }} fill="#fbbf24">
                {d.cumulative > 0 ? '+' : ''}{d.cumulative.toFixed(1)}억</text>
              {shownTypes.map((t, ti) => (
                <g key={ti}>
                  <circle cx={tx + 12} cy={ty + 46 + ti * 16} r={3.5} fill={typeColorMap[t] || '#6b7280'} />
                  <text x={tx + 22} y={ty + 50 + ti * 16} style={{ fontSize: 9 }} fill="#d1d5db">{t}</text>
                  <text x={tx + tooltipW - 10} y={ty + 50 + ti * 16} textAnchor="end"
                    style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                    fill={d.byType[t] >= 0 ? '#86efac' : '#fda4af'}>
                    {d.byType[t] > 0 ? '+' : ''}{d.byType[t].toFixed(2)}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>

      {/* 범례 */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
        {allTypes.map((t) => (
          <div key={t} className="flex items-center gap-1">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: typeColorMap[t] || '#6b7280' }}
            />
            <span>{t}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-2">
          <div className="h-0.5 w-4 bg-amber-500" />
          <span>누적 PnL</span>
        </div>
      </div>
    </div>
  );
}

// ========== YTD Carry PnL 추이 차트 (Stacked Bar + Cumulative Line) ==========

export function CarryYtdPnlChart({
  data,
  allCarryStructTypes,
}: {
  data: { date: string; daily: number; cumulative: number; byStructType: Record<string, number> }[];
  allCarryStructTypes: string[];
}) {
  const [mounted, setMounted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[360px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-gray-400 dark:text-gray-500">
        Carry PnL 추이 데이터가 없습니다
      </div>
    );
  }

  const PALETTE = [
    '#0284c7', '#d97706', '#0d9488', '#4f46e5', '#ea580c', '#9333ea',
    '#e11d48', '#059669', '#7c3aed', '#dc2626', '#2563eb', '#ca8a04',
    '#0891b2', '#c026d3', '#65a30d', '#f97316', '#6366f1', '#14b8a6',
  ];
  const typeColorMap: Record<string, string> = {};
  allCarryStructTypes.forEach((t, i) => {
    typeColorMap[t] = PALETTE[i % PALETTE.length];
  });

  const n = data.length;
  const W = 1200, H = 340;
  const padL = 55, padR = 20, padT = 20, padB = 45;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allVals = data.flatMap((d) => [d.daily, d.cumulative]);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const yPad = Math.max((rawMax - rawMin) * 0.1, 1);
  const yMin = Math.floor(rawMin - yPad);
  const yMax = Math.ceil(rawMax + yPad);
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => padL + ((i + 0.5) / n) * chartW;
  const toY = (v: number) => padT + ((yMax - v) / yRange) * chartH;
  const zeroY = toY(0);
  const barW = Math.max((chartW / n) * 0.7, 6);

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

  const labelInterval = Math.max(Math.ceil(n / 15), 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 800, maxHeight: 360 }}>
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
            <text x={padL - 8} y={toY(v) + 4} textAnchor="end" className="fill-gray-400" style={{ fontSize: 10 }}>
              {v}억
            </text>
          </g>
        ))}

        {/* Stacked Bar (struct_type별) */}
        {data.map((d, i) => {
          const x = toX(i) - barW / 2;
          const positiveTypes = allCarryStructTypes.filter((t) => (d.byStructType[t] || 0) > 0);
          const negativeTypes = allCarryStructTypes.filter((t) => (d.byStructType[t] || 0) < 0);
          const bars: JSX.Element[] = [];

          let posOffset = 0;
          for (const t of positiveTypes) {
            const val = d.byStructType[t] || 0;
            const barH = Math.abs(toY(0) - toY(val));
            const y = zeroY - posOffset - barH;
            bars.push(
              <rect key={`${i}-${t}`} x={x} y={y} width={barW} height={Math.max(barH, 0.5)}
                fill={typeColorMap[t] || '#6b7280'} opacity={0.8} rx={1}>
                <title>{t}: +{val.toFixed(2)}억</title>
              </rect>
            );
            posOffset += barH;
          }

          let negOffset = 0;
          for (const t of negativeTypes) {
            const val = d.byStructType[t] || 0;
            const barH = Math.abs(toY(val) - toY(0));
            const y = zeroY + negOffset;
            bars.push(
              <rect key={`${i}-${t}`} x={x} y={y} width={barW} height={Math.max(barH, 0.5)}
                fill={typeColorMap[t] || '#6b7280'} opacity={0.8} rx={1}>
                <title>{t}: {val.toFixed(2)}억</title>
              </rect>
            );
            negOffset += barH;
          }

          return <g key={i}>{bars}</g>;
        })}

        {/* 누적 라인 */}
        <path d={linePath} fill="none" stroke="#F59E0B" strokeWidth={2.5} />
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.cumulative)} r={2} fill="#F59E0B" />
        ))}

        {/* X축 라벨 */}
        {data.map((d, i) =>
          i % labelInterval === 0 ? (
            <text key={i} x={toX(i)} y={H - 8} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 9 }}>
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
          style={{ fontSize: 11 }}
        >
          {data[n - 1].cumulative.toFixed(1)}억
        </text>

        {/* 호버 인터랙션 영역 */}
        {data.map((d, i) => {
          const colW = chartW / n;
          return (
            <rect key={`hover-${i}`} x={padL + i * colW} y={padT} width={colW} height={chartH}
              fill="transparent" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'crosshair' }} />
          );
        })}
        {hoveredIdx !== null && (
          <line x1={toX(hoveredIdx)} y1={padT} x2={toX(hoveredIdx)} y2={padT + chartH}
            stroke="#9CA3AF" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        )}
        {hoveredIdx !== null && (
          <circle cx={toX(hoveredIdx)} cy={toY(data[hoveredIdx].cumulative)} r={5}
            fill="#F59E0B" stroke="white" strokeWidth={2} />
        )}
        {hoveredIdx !== null && (() => {
          const d = data[hoveredIdx];
          const cx = toX(hoveredIdx);
          const tooltipW = 180;
          const tooltipOnLeft = cx > padL + chartW / 2;
          const tx = tooltipOnLeft ? cx - tooltipW - 12 : cx + 12;
          const ty = padT + 10;
          const typeEntries = allCarryStructTypes
            .filter((t) => d.byStructType[t] && Math.abs(d.byStructType[t]) > 0.001)
            .sort((a, b) => (d.byStructType[b] || 0) - (d.byStructType[a] || 0));
          const shownTypes = typeEntries.slice(0, 5);
          const boxH = 46 + shownTypes.length * 16;
          return (
            <g>
              <rect x={tx} y={ty} width={tooltipW} height={boxH} rx={6}
                fill="#1f2937" fillOpacity={0.95} stroke="#374151" strokeWidth={1} />
              <text x={tx + tooltipW / 2} y={ty + 16} textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 600 }} fill="#e5e7eb">{d.date}</text>
              <text x={tx + 10} y={ty + 32} style={{ fontSize: 10 }} fill="#9ca3af">Daily</text>
              <text x={tx + tooltipW / 2 - 5} y={ty + 32} textAnchor="end"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
                fill={d.daily >= 0 ? '#34d399' : '#fb7185'}>{d.daily > 0 ? '+' : ''}{d.daily.toFixed(2)}억</text>
              <text x={tx + tooltipW / 2 + 5} y={ty + 32} style={{ fontSize: 10 }} fill="#9ca3af">누적</text>
              <text x={tx + tooltipW - 10} y={ty + 32} textAnchor="end"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }} fill="#fbbf24">
                {d.cumulative > 0 ? '+' : ''}{d.cumulative.toFixed(1)}억</text>
              {shownTypes.map((t, ti) => (
                <g key={ti}>
                  <circle cx={tx + 12} cy={ty + 46 + ti * 16} r={3.5} fill={typeColorMap[t] || '#6b7280'} />
                  <text x={tx + 22} y={ty + 50 + ti * 16} style={{ fontSize: 9 }} fill="#d1d5db">{t}</text>
                  <text x={tx + tooltipW - 10} y={ty + 50 + ti * 16} textAnchor="end"
                    style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                    fill={d.byStructType[t] >= 0 ? '#86efac' : '#fda4af'}>
                    {d.byStructType[t] > 0 ? '+' : ''}{d.byStructType[t].toFixed(2)}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>

      {/* 범례 */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
        {allCarryStructTypes.map((t) => (
          <div key={t} className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: typeColorMap[t] || '#6b7280' }} />
            <span>{t}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-2">
          <div className="h-0.5 w-4 bg-amber-500" />
          <span>누적 Carry PnL</span>
        </div>
      </div>
    </div>
  );
}

// ========== WTD PnL 추이 차트 (struct_type별 Stacked Bar + Daily/Cumulative Lines) ==========

// struct_type별 고유 색상 팔레트 (충분히 구분 가능한 색상들)
const STRUCT_TYPE_PALETTE = [
  '#0284c7', '#d97706', '#0d9488', '#4f46e5', '#ea580c', '#9333ea',
  '#e11d48', '#059669', '#7c3aed', '#dc2626', '#2563eb', '#ca8a04',
  '#0891b2', '#c026d3', '#65a30d', '#f97316', '#6366f1', '#14b8a6',
  '#be185d', '#84cc16',
];

function getStructTypeColor(structType: string, allStructTypes: string[]): string {
  const idx = allStructTypes.indexOf(structType);
  if (idx >= 0 && idx < STRUCT_TYPE_PALETTE.length) {
    return STRUCT_TYPE_PALETTE[idx];
  }
  // 해시 기반 fallback
  let hash = 0;
  for (let i = 0; i < structType.length; i++) {
    hash = structType.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 50%)`;
}

export function WtdPnlChart({
  data,
  allStructTypes,
}: {
  data: { date: string; daily: number; cumulative: number; byStructType: Record<string, number> }[];
  allStructTypes: string[];
}) {
  const [mounted, setMounted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[400px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;
  }

  // 마지막 5영업일만 표시
  const wtdData = data.slice(-5);

  if (wtdData.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-gray-400 dark:text-gray-500">
        WTD PnL 데이터가 없습니다
      </div>
    );
  }

  // WTD 기간 누적 PnL 재계산 (WTD 시작부터)
  let wtdCumulative = 0;
  const wtdDataWithCum = wtdData.map((d) => {
    wtdCumulative += d.daily;
    return { ...d, wtdCumulative: Math.round(wtdCumulative * 100) / 100 };
  });

  const n = wtdDataWithCum.length;
  const W = 1200, H = 380;
  const padL = 60, padR = 60, padT = 25, padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Y축 범위: stacked bar의 양수합/음수합 + 라인값 모두 고려
  let yDataMin = 0, yDataMax = 0;
  for (const d of wtdDataWithCum) {
    let posSum = 0, negSum = 0;
    for (const st of allStructTypes) {
      const v = d.byStructType[st] || 0;
      if (v > 0) posSum += v;
      else negSum += v;
    }
    yDataMin = Math.min(yDataMin, negSum, d.daily, d.wtdCumulative);
    yDataMax = Math.max(yDataMax, posSum, d.daily, d.wtdCumulative);
  }
  const yPad = Math.max((yDataMax - yDataMin) * 0.15, 0.5);
  const yMin = Math.floor((yDataMin - yPad) * 10) / 10;
  const yMax = Math.ceil((yDataMax + yPad) * 10) / 10;
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => padL + ((i + 0.5) / n) * chartW;
  const toY = (v: number) => padT + ((yMax - v) / yRange) * chartH;
  const zeroY = toY(0);

  const barW = Math.min(Math.max((chartW / n) * 0.55, 30), 120);

  // Y축 ticks
  const yTicks: number[] = [];
  const rawStep = yRange / 6;
  const niceStep = rawStep <= 0.2 ? 0.1 : rawStep <= 0.5 ? 0.25 : rawStep <= 1 ? 0.5 : Math.ceil(rawStep);
  for (let v = Math.ceil(yMin / niceStep) * niceStep; v <= yMax + niceStep * 0.01; v += niceStep) {
    yTicks.push(Math.round(v * 100) / 100);
  }
  if (!yTicks.some((t) => Math.abs(t) < niceStep * 0.01)) yTicks.push(0);
  yTicks.sort((a, b) => a - b);

  // struct_type별 색상
  const stColorMap: Record<string, string> = {};
  for (const st of allStructTypes) {
    stColorMap[st] = getStructTypeColor(st, allStructTypes);
  }

  // 활성 struct_type만 (WTD에서 값이 있는 것들)
  const activeStructTypes = allStructTypes.filter((st) =>
    wtdDataWithCum.some((d) => d.byStructType[st] && d.byStructType[st] !== 0)
  );

  // Daily PnL 라인
  const dailyLinePath = wtdDataWithCum
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.daily).toFixed(1)}`)
    .join(' ');

  // WTD 누적 PnL 라인
  const cumLinePath = wtdDataWithCum
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.wtdCumulative).toFixed(1)}`)
    .join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 700, maxHeight: 400 }}>
        {/* 그리드 + Y축 */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)}
              stroke={Math.abs(v) < 0.001 ? '#6B7280' : '#374151'}
              strokeWidth={Math.abs(v) < 0.001 ? 1.2 : 0.5}
              strokeDasharray={Math.abs(v) < 0.001 ? '' : '4 4'}
              opacity={0.5}
            />
            <text x={padL - 8} y={toY(v) + 4} textAnchor="end" className="fill-gray-400" style={{ fontSize: 10 }}>
              {v.toFixed(1)}억
            </text>
          </g>
        ))}

        {/* Stacked Bar (struct_type별) */}
        {wtdDataWithCum.map((d, i) => {
          const x = toX(i) - barW / 2;
          const positiveTypes = activeStructTypes.filter((st) => (d.byStructType[st] || 0) > 0);
          const negativeTypes = activeStructTypes.filter((st) => (d.byStructType[st] || 0) < 0);

          const bars: JSX.Element[] = [];

          // 양수: 0선 위로 쌓기
          let posOffset = 0;
          for (const st of positiveTypes) {
            const val = d.byStructType[st] || 0;
            const barH = Math.abs(toY(0) - toY(val));
            const y = zeroY - posOffset - barH;
            bars.push(
              <rect
                key={`${i}-p-${st}`}
                x={x} y={y} width={barW} height={Math.max(barH, 0.5)}
                fill={stColorMap[st]}
                opacity={0.85}
                rx={1}
              >
                <title>{st}: {val > 0 ? '+' : ''}{val.toFixed(2)}억</title>
              </rect>
            );
            posOffset += barH;
          }

          // 음수: 0선 아래로 쌓기
          let negOffset = 0;
          for (const st of negativeTypes) {
            const val = d.byStructType[st] || 0;
            const barH = Math.abs(toY(val) - toY(0));
            const y = zeroY + negOffset;
            bars.push(
              <rect
                key={`${i}-n-${st}`}
                x={x} y={y} width={barW} height={Math.max(barH, 0.5)}
                fill={stColorMap[st]}
                opacity={0.85}
                rx={1}
              >
                <title>{st}: {val.toFixed(2)}억</title>
              </rect>
            );
            negOffset += barH;
          }

          return <g key={i}>{bars}</g>;
        })}

        {/* Daily PnL 라인 (파란색) */}
        <path d={dailyLinePath} fill="none" stroke="#3B82F6" strokeWidth={2.5} strokeLinejoin="round" />
        {wtdDataWithCum.map((d, i) => (
          <g key={`daily-${i}`}>
            <circle cx={toX(i)} cy={toY(d.daily)} r={4} fill="#3B82F6" stroke="white" strokeWidth={1.5} />
            <text
              x={toX(i)}
              y={toY(d.daily) - 10}
              textAnchor="middle"
              className="fill-blue-500 dark:fill-blue-400"
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              {d.daily > 0 ? '+' : ''}{d.daily.toFixed(2)}
            </text>
          </g>
        ))}

        {/* WTD 누적 PnL 라인 (앰버) */}
        <path d={cumLinePath} fill="none" stroke="#F59E0B" strokeWidth={2.5} strokeLinejoin="round" strokeDasharray="6 3" />
        {wtdDataWithCum.map((d, i) => (
          <g key={`cum-${i}`}>
            <circle cx={toX(i)} cy={toY(d.wtdCumulative)} r={4} fill="#F59E0B" stroke="white" strokeWidth={1.5} />
            <text
              x={toX(i)}
              y={toY(d.wtdCumulative) + 18}
              textAnchor="middle"
              className="fill-amber-500 dark:fill-amber-400"
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              {d.wtdCumulative > 0 ? '+' : ''}{d.wtdCumulative.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X축 날짜 라벨 */}
        {wtdDataWithCum.map((d, i) => (
          <text
            key={i}
            x={toX(i)} y={H - 10}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-400"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            {d.date}
          </text>
        ))}

        {/* 호버 인터랙션 영역 */}
        {wtdDataWithCum.map((d, i) => {
          const colW = chartW / n;
          return (
            <rect key={`hover-${i}`} x={padL + i * colW} y={padT} width={colW} height={chartH}
              fill="transparent" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'crosshair' }} />
          );
        })}
        {hoveredIdx !== null && (
          <line x1={toX(hoveredIdx)} y1={padT} x2={toX(hoveredIdx)} y2={padT + chartH}
            stroke="#9CA3AF" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        )}
        {hoveredIdx !== null && (() => {
          const d = wtdDataWithCum[hoveredIdx];
          const cx = toX(hoveredIdx);
          const tooltipW = 190;
          const tooltipOnLeft = cx > padL + chartW / 2;
          const tx = tooltipOnLeft ? cx - tooltipW - 12 : cx + 12;
          const ty = padT + 10;
          const typeEntries = activeStructTypes
            .filter((st) => d.byStructType[st] && Math.abs(d.byStructType[st]) > 0.001)
            .sort((a, b) => (d.byStructType[b] || 0) - (d.byStructType[a] || 0));
          const shownTypes = typeEntries.slice(0, 6);
          const boxH = 46 + shownTypes.length * 16;
          return (
            <g>
              <rect x={tx} y={ty} width={tooltipW} height={boxH} rx={6}
                fill="#1f2937" fillOpacity={0.95} stroke="#374151" strokeWidth={1} />
              <text x={tx + tooltipW / 2} y={ty + 16} textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 600 }} fill="#e5e7eb">{d.date}</text>
              <text x={tx + 10} y={ty + 32} style={{ fontSize: 10 }} fill="#9ca3af">Daily</text>
              <text x={tx + tooltipW / 2 - 5} y={ty + 32} textAnchor="end"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
                fill={d.daily >= 0 ? '#34d399' : '#fb7185'}>{d.daily > 0 ? '+' : ''}{d.daily.toFixed(2)}억</text>
              <text x={tx + tooltipW / 2 + 5} y={ty + 32} style={{ fontSize: 10 }} fill="#9ca3af">WTD</text>
              <text x={tx + tooltipW - 10} y={ty + 32} textAnchor="end"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }} fill="#fbbf24">
                {d.wtdCumulative > 0 ? '+' : ''}{d.wtdCumulative.toFixed(2)}억</text>
              {shownTypes.map((st, ti) => (
                <g key={ti}>
                  <circle cx={tx + 12} cy={ty + 46 + ti * 16} r={3.5} fill={stColorMap[st]} />
                  <text x={tx + 22} y={ty + 50 + ti * 16} style={{ fontSize: 9 }} fill="#d1d5db">{st}</text>
                  <text x={tx + tooltipW - 10} y={ty + 50 + ti * 16} textAnchor="end"
                    style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                    fill={d.byStructType[st] >= 0 ? '#86efac' : '#fda4af'}>
                    {d.byStructType[st] > 0 ? '+' : ''}{d.byStructType[st].toFixed(2)}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>

      {/* 범례 */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
        {activeStructTypes.map((st) => (
          <div key={st} className="flex items-center gap-1">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: stColorMap[st] }}
            />
            <span>{st}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-3">
          <div className="h-0.5 w-4 bg-blue-500" />
          <span>Daily PnL</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-0.5 w-4 bg-amber-500" style={{ borderTop: '2px dashed #F59E0B', height: 0 }} />
          <span>WTD 누적</span>
        </div>
      </div>
    </div>
  );
}

// ========== Carry WTD PnL 추이 차트 (tp='캐리' 전용) ==========

export function CarryWtdPnlChart({
  data,
  allCarryStructTypes,
}: {
  data: { date: string; daily: number; cumulative: number; byStructType: Record<string, number> }[];
  allCarryStructTypes: string[];
}) {
  const [mounted, setMounted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[380px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;
  }

  const wtdData = data.slice(-5);

  if (wtdData.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-gray-400 dark:text-gray-500">
        Carry PnL 데이터가 없습니다
      </div>
    );
  }

  // WTD 기간 누적 재계산
  let wtdCum = 0;
  const wtdDataWithCum = wtdData.map((d) => {
    wtdCum += d.daily;
    return { ...d, wtdCumulative: Math.round(wtdCum * 100) / 100 };
  });

  const n = wtdDataWithCum.length;
  const W = 1200, H = 380;
  const padL = 60, padR = 60, padT = 25, padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Y축 범위
  let yDataMin = 0, yDataMax = 0;
  for (const d of wtdDataWithCum) {
    let posSum = 0, negSum = 0;
    for (const st of allCarryStructTypes) {
      const v = d.byStructType[st] || 0;
      if (v > 0) posSum += v;
      else negSum += v;
    }
    yDataMin = Math.min(yDataMin, negSum, d.daily, d.wtdCumulative);
    yDataMax = Math.max(yDataMax, posSum, d.daily, d.wtdCumulative);
  }
  const yPad = Math.max((yDataMax - yDataMin) * 0.15, 0.5);
  const yMin = Math.floor((yDataMin - yPad) * 10) / 10;
  const yMax = Math.ceil((yDataMax + yPad) * 10) / 10;
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => padL + ((i + 0.5) / n) * chartW;
  const toY = (v: number) => padT + ((yMax - v) / yRange) * chartH;
  const zeroY = toY(0);
  const barW = Math.min(Math.max((chartW / n) * 0.55, 30), 120);

  // Y축 ticks
  const yTicks: number[] = [];
  const rawStep = yRange / 6;
  const niceStep = rawStep <= 0.2 ? 0.1 : rawStep <= 0.5 ? 0.25 : rawStep <= 1 ? 0.5 : Math.ceil(rawStep);
  for (let v = Math.ceil(yMin / niceStep) * niceStep; v <= yMax + niceStep * 0.01; v += niceStep) {
    yTicks.push(Math.round(v * 100) / 100);
  }
  if (!yTicks.some((t) => Math.abs(t) < niceStep * 0.01)) yTicks.push(0);
  yTicks.sort((a, b) => a - b);

  // 캐리 전용 색상 (고대비, 확실히 구분 가능한 팔레트)
  const CARRY_PALETTE = [
    '#e11d48', // rose-600
    '#2563eb', // blue-600
    '#16a34a', // green-600
    '#f59e0b', // amber-500
    '#7c3aed', // violet-600
    '#ea580c', // orange-600
    '#0891b2', // cyan-600
    '#c026d3', // fuchsia-600
    '#65a30d', // lime-600
    '#dc2626', // red-600
    '#4f46e5', // indigo-600
    '#0d9488', // teal-600
    '#d97706', // amber-600
    '#9333ea', // purple-600
    '#059669', // emerald-600
    '#be185d', // pink-700
    '#1d4ed8', // blue-700
    '#b91c1c', // red-700
    '#15803d', // green-700
    '#7e22ce', // purple-700
  ];
  const stColorMap: Record<string, string> = {};
  for (let i = 0; i < allCarryStructTypes.length; i++) {
    stColorMap[allCarryStructTypes[i]] = CARRY_PALETTE[i % CARRY_PALETTE.length];
  }

  // 활성 struct_type만
  const activeStructTypes = allCarryStructTypes.filter((st) =>
    wtdDataWithCum.some((d) => d.byStructType[st] && d.byStructType[st] !== 0)
  );

  // Daily PnL 라인
  const dailyLinePath = wtdDataWithCum
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.daily).toFixed(1)}`)
    .join(' ');
  // WTD 누적 라인
  const cumLinePath = wtdDataWithCum
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.wtdCumulative).toFixed(1)}`)
    .join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 700, maxHeight: 400 }}>
        {/* 그리드 */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)}
              stroke={Math.abs(v) < 0.001 ? '#6B7280' : '#374151'}
              strokeWidth={Math.abs(v) < 0.001 ? 1.2 : 0.5}
              strokeDasharray={Math.abs(v) < 0.001 ? '' : '4 4'}
              opacity={0.5}
            />
            <text x={padL - 8} y={toY(v) + 4} textAnchor="end" className="fill-gray-400" style={{ fontSize: 10 }}>
              {v.toFixed(1)}억
            </text>
          </g>
        ))}

        {/* Stacked Bar (struct_type별) */}
        {wtdDataWithCum.map((d, i) => {
          const x = toX(i) - barW / 2;
          const positiveTypes = activeStructTypes.filter((st) => (d.byStructType[st] || 0) > 0);
          const negativeTypes = activeStructTypes.filter((st) => (d.byStructType[st] || 0) < 0);
          const bars: JSX.Element[] = [];

          let posOffset = 0;
          for (const st of positiveTypes) {
            const val = d.byStructType[st] || 0;
            const barH = Math.abs(toY(0) - toY(val));
            const y = zeroY - posOffset - barH;
            bars.push(
              <rect key={`${i}-p-${st}`} x={x} y={y} width={barW} height={Math.max(barH, 0.5)}
                fill={stColorMap[st]} opacity={0.85} rx={1}>
                <title>{st}: {val > 0 ? '+' : ''}{val.toFixed(2)}억</title>
              </rect>
            );
            posOffset += barH;
          }
          let negOffset = 0;
          for (const st of negativeTypes) {
            const val = d.byStructType[st] || 0;
            const barH = Math.abs(toY(val) - toY(0));
            const y = zeroY + negOffset;
            bars.push(
              <rect key={`${i}-n-${st}`} x={x} y={y} width={barW} height={Math.max(barH, 0.5)}
                fill={stColorMap[st]} opacity={0.85} rx={1}>
                <title>{st}: {val.toFixed(2)}억</title>
              </rect>
            );
            negOffset += barH;
          }
          return <g key={i}>{bars}</g>;
        })}

        {/* Daily PnL 라인 (오렌지) */}
        <path d={dailyLinePath} fill="none" stroke="#EA580C" strokeWidth={2.5} strokeLinejoin="round" />
        {wtdDataWithCum.map((d, i) => (
          <g key={`daily-${i}`}>
            <circle cx={toX(i)} cy={toY(d.daily)} r={4} fill="#EA580C" stroke="white" strokeWidth={1.5} />
            <text x={toX(i)} y={toY(d.daily) - 10} textAnchor="middle"
              className="fill-orange-600 dark:fill-orange-400" style={{ fontSize: 10, fontWeight: 600 }}>
              {d.daily > 0 ? '+' : ''}{d.daily.toFixed(2)}
            </text>
          </g>
        ))}

        {/* WTD 누적 라인 (앰버 점선) */}
        <path d={cumLinePath} fill="none" stroke="#F59E0B" strokeWidth={2.5} strokeLinejoin="round" strokeDasharray="6 3" />
        {wtdDataWithCum.map((d, i) => (
          <g key={`cum-${i}`}>
            <circle cx={toX(i)} cy={toY(d.wtdCumulative)} r={4} fill="#F59E0B" stroke="white" strokeWidth={1.5} />
            <text x={toX(i)} y={toY(d.wtdCumulative) + 18} textAnchor="middle"
              className="fill-amber-500 dark:fill-amber-400" style={{ fontSize: 10, fontWeight: 600 }}>
              {d.wtdCumulative > 0 ? '+' : ''}{d.wtdCumulative.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X축 날짜 */}
        {wtdDataWithCum.map((d, i) => (
          <text key={i} x={toX(i)} y={H - 10} textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-400" style={{ fontSize: 12, fontWeight: 500 }}>
            {d.date}
          </text>
        ))}

        {/* 호버 인터랙션 영역 */}
        {wtdDataWithCum.map((d, i) => {
          const colW = chartW / n;
          return (
            <rect key={`hover-${i}`} x={padL + i * colW} y={padT} width={colW} height={chartH}
              fill="transparent" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'crosshair' }} />
          );
        })}
        {hoveredIdx !== null && (
          <line x1={toX(hoveredIdx)} y1={padT} x2={toX(hoveredIdx)} y2={padT + chartH}
            stroke="#9CA3AF" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        )}
        {hoveredIdx !== null && (() => {
          const d = wtdDataWithCum[hoveredIdx];
          const cx = toX(hoveredIdx);
          const tooltipW = 190;
          const tooltipOnLeft = cx > padL + chartW / 2;
          const tx = tooltipOnLeft ? cx - tooltipW - 12 : cx + 12;
          const ty = padT + 10;
          const typeEntries = activeStructTypes
            .filter((st) => d.byStructType[st] && Math.abs(d.byStructType[st]) > 0.001)
            .sort((a, b) => (d.byStructType[b] || 0) - (d.byStructType[a] || 0));
          const shownTypes = typeEntries.slice(0, 6);
          const boxH = 46 + shownTypes.length * 16;
          return (
            <g>
              <rect x={tx} y={ty} width={tooltipW} height={boxH} rx={6}
                fill="#1f2937" fillOpacity={0.95} stroke="#374151" strokeWidth={1} />
              <text x={tx + tooltipW / 2} y={ty + 16} textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 600 }} fill="#e5e7eb">{d.date}</text>
              <text x={tx + 10} y={ty + 32} style={{ fontSize: 10 }} fill="#9ca3af">Daily</text>
              <text x={tx + tooltipW / 2 - 5} y={ty + 32} textAnchor="end"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
                fill={d.daily >= 0 ? '#34d399' : '#fb7185'}>{d.daily > 0 ? '+' : ''}{d.daily.toFixed(2)}억</text>
              <text x={tx + tooltipW / 2 + 5} y={ty + 32} style={{ fontSize: 10 }} fill="#9ca3af">WTD</text>
              <text x={tx + tooltipW - 10} y={ty + 32} textAnchor="end"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }} fill="#fbbf24">
                {d.wtdCumulative > 0 ? '+' : ''}{d.wtdCumulative.toFixed(2)}억</text>
              {shownTypes.map((st, ti) => (
                <g key={ti}>
                  <circle cx={tx + 12} cy={ty + 46 + ti * 16} r={3.5} fill={stColorMap[st]} />
                  <text x={tx + 22} y={ty + 50 + ti * 16} style={{ fontSize: 9 }} fill="#d1d5db">{st}</text>
                  <text x={tx + tooltipW - 10} y={ty + 50 + ti * 16} textAnchor="end"
                    style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                    fill={d.byStructType[st] >= 0 ? '#86efac' : '#fda4af'}>
                    {d.byStructType[st] > 0 ? '+' : ''}{d.byStructType[st].toFixed(2)}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>

      {/* 범례 */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
        {activeStructTypes.map((st) => (
          <div key={st} className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: stColorMap[st] }} />
            <span>{st}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-3">
          <div className="h-0.5 w-4 bg-orange-600" />
          <span>Daily Carry</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-0.5 w-4 bg-amber-500" style={{ borderTop: '2px dashed #F59E0B', height: 0 }} />
          <span>WTD 누적</span>
        </div>
      </div>
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
  const totalAssetCount = summary.reduce((s, r) => s + r.asset_count, 0);

  return (
    <div>
      {/* 전체 합계 헤더 */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-lg font-bold font-mono ${amtColor(totalPnlKrw)}`}>
          {fmtKrw(totalPnlKrw)}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">({totalAssetCount}종목)</span>
      </div>

      <div className="space-y-2">
        {Object.entries(byCurr).map(([curr, items]) => {
          const currTotalKrw = items.reduce((s, r) => s + r.total_pnl_krw, 0);
          const currMtmKrw = items.reduce((s, r) => s + r.total_daily_pnl_krw, 0);
          const currCouponKrw = items.reduce((s, r) => s + r.total_coupon_krw, 0);
          const currAssetCount = items.reduce((s, r) => s + r.asset_count, 0);
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
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{currAssetCount}종목</span>
                </div>
                <span className={`text-sm font-bold font-mono ${amtColor(currTotalKrw)}`}>
                  {fmtAmt(currTotalKrw, curr, isUsd ? currTotalUsd : undefined)}
                </span>
              </div>

              {/* struct_type별 행 */}
              <table className="w-full text-xs">
                <tbody>
                  {items.map((s) => (
                    <tr
                      key={s.struct_type}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <td className="pl-3 py-1">
                        <span className={`font-medium ${getTypeColor(s.type1).text}`}>
                          {s.struct_type}
                        </span>
                        <span className="ml-1 text-[10px] text-gray-400">
                          {s.asset_count > 0 ? `${s.asset_count}종목` : ''}{' '}
                          {s.total_notional > 0 ? fmtNotn(s.total_notional, s.curr) : ''}
                        </span>
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
