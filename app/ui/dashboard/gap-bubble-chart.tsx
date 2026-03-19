'use client';

import { useState, useEffect, useMemo } from 'react';
import type { GapDataPoint, GapTrendPoint, GapProductDetail } from '@/app/lib/data';

// 유형별 고정 색상
const TYPE_COLORS: Record<string, string> = {
  'Range Accrual': '#0284c7',
  Spread: '#d97706',
  Floater: '#0d9488',
  InvF: '#4f46e5',
  Power: '#ea580c',
  'Zero Callable': '#9333ea',
};

function getColor(structType: string): string {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (structType.startsWith(key)) return color;
  }
  return '#6b7280';
}

// 억 단위 포맷 (부호 포함)
function fmtEok(v: number, showSign = true): string {
  const sign = showSign ? (v > 0 ? '+' : '') : '';
  if (Math.abs(v) >= 10) return `${sign}${v.toFixed(0)}억`;
  return `${sign}${v.toFixed(1)}억`;
}

// '\' → '₩' 변환 (struct_type 표시용)
function wonLabel(s: string): string {
  return s.replace(/\\/g, '₩');
}

export function GapBubbleChart({
  data,
  trend,
  details = [],
}: {
  data: GapDataPoint[];
  trend: GapTrendPoint[];
  details?: GapProductDetail[];
}) {
  const [mounted, setMounted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  useEffect(() => setMounted(true), []);

  // 유의미한 괴리만 (절대값 0.5억 이상)
  const filtered = useMemo(
    () => data.filter((d) => Math.abs(d.gapEok) >= 0.5),
    [data],
  );

  if (!mounted) {
    return <div className="h-[420px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;
  }

  if (filtered.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-gray-400 dark:text-gray-500">
        괴리 데이터가 없습니다
      </div>
    );
  }

  // 레이아웃 설정
  const W = 1200, H = 420;
  const padL = 55, padR = 20, padT = 30, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // X축: 전일 대비 변동, Y축: 현재 괴리
  const gaps = filtered.map((d) => d.gapEok);
  const changes = filtered.map((d) => d.change);
  const absGaps = gaps.map(Math.abs);
  const maxAbsGap = Math.max(...absGaps);

  // 버블 크기: 잔액 규모 기준 (억)
  const notionals = filtered.map((d) => d.notionalEok);
  const maxNotional = Math.max(...notionals, 1);
  const minR = 12, maxR = 45;

  const toR = (n: number) => minR + ((n / maxNotional) * (maxR - minR));

  // Y축 범위: 괴리 값 (대칭)
  const yBound = Math.ceil(maxAbsGap * 1.15);
  const yMin = -yBound;
  const yMax = yBound;
  const yRange = yMax - yMin || 1;

  // X축 범위: 변동 값 (대칭)
  const maxAbsChange = Math.max(...changes.map(Math.abs), 1);
  const xBound = Math.ceil(maxAbsChange * 1.3);
  const xMin = -xBound;
  const xMax = xBound;
  const xRange = xMax - xMin || 1;

  const toX = (v: number) => padL + ((v - xMin) / xRange) * chartW;
  const toY = (v: number) => padT + ((yMax - v) / yRange) * chartH;
  const zeroX = toX(0);
  const zeroY = toY(0);

  // Y축 ticks
  const yStep = Math.max(Math.ceil(yBound / 4), 1);
  const yTicks: number[] = [];
  for (let v = -yStep * 4; v <= yStep * 4; v += yStep) {
    if (v >= yMin && v <= yMax) yTicks.push(v);
  }
  if (!yTicks.includes(0)) yTicks.push(0);
  yTicks.sort((a, b) => a - b);

  // X축 ticks
  const xStep = Math.max(Math.ceil(xBound / 3), 1);
  const xTicks: number[] = [];
  for (let v = -xStep * 3; v <= xStep * 3; v += xStep) {
    if (v >= xMin && v <= xMax) xTicks.push(v);
  }
  if (!xTicks.includes(0)) xTicks.push(0);
  xTicks.sort((a, b) => a - b);

  // 선택된 항목의 추이 데이터
  const selectedItem = selectedIdx !== null ? filtered[selectedIdx] : null;
  const selectedTrend = selectedItem
    ? trend
        .filter(
          (t) =>
            t.structType === selectedItem.structType &&
            t.curr === selectedItem.curr,
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <div className="w-full">
      <div className="flex gap-4">
        {/* 버블 차트 영역 */}
        <div className={`overflow-x-auto ${selectedItem ? 'flex-1' : 'w-full'}`}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ minWidth: 600, maxHeight: 440 }}
          >
            {/* 4분면 배경 */}
            <rect x={padL} y={padT} width={zeroX - padL} height={zeroY - padT}
              fill="#dcfce7" fillOpacity={0.15} />
            <rect x={zeroX} y={padT} width={W - padR - zeroX} height={zeroY - padT}
              fill="#dcfce7" fillOpacity={0.08} />
            <rect x={padL} y={zeroY} width={zeroX - padL} height={padT + chartH - zeroY}
              fill="#fce7f3" fillOpacity={0.08} />
            <rect x={zeroX} y={zeroY} width={W - padR - zeroX} height={padT + chartH - zeroY}
              fill="#fce7f3" fillOpacity={0.15} />

            {/* 4분면 라벨 */}
            <text x={padL + 8} y={padT + 16} style={{ fontSize: 9 }} fill="#86efac" opacity={0.6}>
              양 괴리 · 축소중
            </text>
            <text x={W - padR - 8} y={padT + 16} textAnchor="end" style={{ fontSize: 9 }} fill="#86efac" opacity={0.6}>
              양 괴리 · 확대중
            </text>
            <text x={padL + 8} y={padT + chartH - 6} style={{ fontSize: 9 }} fill="#fda4af" opacity={0.6}>
              음 괴리 · 확대중
            </text>
            <text x={W - padR - 8} y={padT + chartH - 6} textAnchor="end" style={{ fontSize: 9 }} fill="#fda4af" opacity={0.6}>
              음 괴리 · 축소중
            </text>

            {/* Y축 그리드 */}
            {yTicks.map((v) => (
              <g key={`yg-${v}`}>
                <line
                  x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)}
                  stroke={v === 0 ? '#6B7280' : '#374151'}
                  strokeWidth={v === 0 ? 1.2 : 0.5}
                  strokeDasharray={v === 0 ? '' : '4 4'}
                  opacity={0.4}
                />
                <text x={padL - 8} y={toY(v) + 4} textAnchor="end"
                  style={{ fontSize: 10 }} fill={v > 0 ? '#6ee7b7' : v < 0 ? '#fda4af' : '#9ca3af'}>
                  {v === 0 ? '0' : `${v > 0 ? '+' : ''}${v}억`}
                </text>
              </g>
            ))}

            {/* X축 그리드 */}
            {xTicks.map((v) => (
              <g key={`xg-${v}`}>
                <line
                  x1={toX(v)} y1={padT} x2={toX(v)} y2={padT + chartH}
                  stroke={v === 0 ? '#6B7280' : '#374151'}
                  strokeWidth={v === 0 ? 1.2 : 0.5}
                  strokeDasharray={v === 0 ? '' : '4 4'}
                  opacity={0.4}
                />
                {v !== 0 && (
                  <text x={toX(v)} y={H - 8} textAnchor="middle"
                    className="fill-gray-400" style={{ fontSize: 10 }}>
                    {v > 0 ? '+' : ''}{v}억
                  </text>
                )}
              </g>
            ))}

            {/* 축 라벨 */}
            <text x={padL - 5} y={padT - 10} textAnchor="end"
              style={{ fontSize: 9 }} className="fill-gray-400">
              괴리 (억)
            </text>
            <text x={W - padR} y={H - 8} textAnchor="end"
              style={{ fontSize: 9 }} className="fill-gray-400">
              일일변동 (억) →
            </text>

            {/* 버블 */}
            {filtered.map((d, i) => {
              const cx = toX(d.change);
              const cy = toY(d.gapEok);
              const r = toR(d.notionalEok);
              const color = getColor(d.structType);
              const isHovered = hoveredIdx === i;
              const isSelected = selectedIdx === i;
              const dimmed = selectedIdx !== null && !isSelected && !isHovered;
              // 양/음 괴리 시각 구분
              const isPositive = d.gapEok >= 0;
              const signColor = isPositive ? '#34d399' : '#fb7185'; // emerald / rose
              const defaultStroke = isPositive ? '#10b981' : '#f43f5e';

              return (
                <g key={i}>
                  {/* 외곽 링: 양/음 방향 표시 */}
                  {!dimmed && (
                    <circle
                      cx={cx} cy={cy} r={(isHovered || isSelected ? r + 3 : r) + 2}
                      fill="none"
                      stroke={defaultStroke}
                      strokeWidth={1.5}
                      strokeDasharray={isPositive ? '' : '4 3'}
                      opacity={0.6}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  <circle
                    cx={cx} cy={cy} r={isHovered || isSelected ? r + 3 : r}
                    fill={color}
                    fillOpacity={dimmed ? 0.15 : isHovered || isSelected ? 0.7 : 0.45}
                    stroke={isSelected ? '#fbbf24' : isHovered ? 'white' : color}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
                    style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                  />
                  {/* 버블 내 라벨 (충분히 큰 경우) */}
                  {r >= 18 && !dimmed && (
                    <text
                      x={cx} y={cy - 4}
                      textAnchor="middle"
                      style={{ fontSize: Math.min(r * 0.45, 11), fontWeight: 600, pointerEvents: 'none' }}
                      fill="white"
                    >
                      {wonLabel(d.structType.split(' / ')[0])}
                    </text>
                  )}
                  {r >= 18 && !dimmed && (
                    <text
                      x={cx} y={cy + 10}
                      textAnchor="middle"
                      style={{ fontSize: Math.min(r * 0.38, 10), fontWeight: 700, fontFamily: 'monospace', pointerEvents: 'none' }}
                      fill={signColor}
                    >
                      {fmtEok(d.gapEok)}
                    </text>
                  )}
                  {/* 작은 버블도 부호 표시 */}
                  {r < 18 && !dimmed && (
                    <text
                      x={cx} y={cy - r - 5}
                      textAnchor="middle"
                      style={{ fontSize: 8, fontWeight: 700, fontFamily: 'monospace', pointerEvents: 'none' }}
                      fill={signColor}
                    >
                      {fmtEok(d.gapEok)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 호버 툴팁 */}
            {hoveredIdx !== null && (() => {
              const d = filtered[hoveredIdx];
              const cx = toX(d.change);
              const cy = toY(d.gapEok);
              const tooltipW = 200;
              const tooltipOnLeft = cx > padL + chartW / 2;
              const tx = tooltipOnLeft ? cx - tooltipW - 15 : cx + 15;
              const ty = Math.max(padT, Math.min(cy - 50, padT + chartH - 110));

              return (
                <g>
                  <rect x={tx} y={ty} width={tooltipW} height={100} rx={6}
                    fill="#1f2937" fillOpacity={0.95} stroke="#374151" strokeWidth={1} />
                  <text x={tx + tooltipW / 2} y={ty + 16} textAnchor="middle"
                    style={{ fontSize: 11, fontWeight: 700 }} fill="#e5e7eb">
                    {wonLabel(d.structType)}
                  </text>
                  <text x={tx + 10} y={ty + 34} style={{ fontSize: 10 }} fill="#9ca3af">
                    {d.curr} · {d.productCount}종목 · 잔액 {fmtEok(d.notionalEok)}
                  </text>
                  <text x={tx + 10} y={ty + 52} style={{ fontSize: 10 }} fill="#d1d5db">괴리</text>
                  <text x={tx + tooltipW - 10} y={ty + 52} textAnchor="end"
                    style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}
                    fill={d.gapEok >= 0 ? '#34d399' : '#fb7185'}>
                    {fmtEok(d.gapEok)}
                  </text>
                  <text x={tx + 10} y={ty + 70} style={{ fontSize: 10 }} fill="#d1d5db">변동</text>
                  <text x={tx + tooltipW - 10} y={ty + 70} textAnchor="end"
                    style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}
                    fill={d.change >= 0 ? '#34d399' : '#fb7185'}>
                    {d.change > 0 ? '+' : ''}{d.change.toFixed(1)}억
                  </text>
                  <text x={tx + 10} y={ty + 88} style={{ fontSize: 10 }} fill="#d1d5db">방향</text>
                  <text x={tx + tooltipW - 10} y={ty + 88} textAnchor="end"
                    style={{ fontSize: 11, fontWeight: 600 }}
                    fill={d.gapEok >= 0 ? '#6ee7b7' : '#fda4af'}>
                    {d.gapEok >= 0 ? '▲ 양(+) 괴리' : '▼ 음(-) 괴리'}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* 선택 시 추이 미니 차트 + 상위 종목 */}
        {selectedItem && selectedTrend.length > 1 && (() => {
          // 해당 struct_type의 개별 종목 괴리 상위 3개
          const topProducts = details
            .filter((d) => d.structType === selectedItem.structType && d.curr === selectedItem.curr)
            .sort((a, b) => Math.abs(b.gapEok) - Math.abs(a.gapEok))
            .slice(0, 3);

          return (
            <div className="w-64 flex-shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="mb-2">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">
                  {wonLabel(selectedItem.structType)}
                </p>
                <p className="text-[10px] text-gray-400">{selectedItem.curr} · 추이</p>
              </div>
              <TrendMiniChart data={selectedTrend} color={getColor(selectedItem.structType)} />

              {/* MTM 헤지 불일치 상위 종목 */}
              {topProducts.length > 0 && (
                <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    MTM 헤지 불일치 상위 {topProducts.length}개 종목
                  </p>
                  <div className="space-y-2">
                    {topProducts.map((p, i) => {
                      const isPos = p.gapEok >= 0;
                      const barMax = Math.max(...topProducts.map((t) => Math.abs(t.gapEok)), 1);
                      const barPct = (Math.abs(p.gapEok) / barMax) * 100;
                      return (
                        <div key={p.objCd} className="text-[10px]">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-gray-600 dark:text-gray-300 truncate max-w-[140px]" title={p.objCd}>
                              {i + 1}. {p.objCd}
                            </span>
                            <span className={`font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {p.gapEok > 0 ? '+' : ''}{p.gapEok.toFixed(1)}억
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isPos ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-gray-400 whitespace-nowrap">
                              {p.notionalEok.toFixed(0)}억
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedIdx(null)}
                className="mt-2 w-full text-center text-[10px] text-gray-400 hover:text-gray-200 transition-colors"
              >
                닫기 ✕
              </button>
            </div>
          );
        })()}
      </div>

      {/* 범례: 버블 크기 설명 */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, opacity: 0.7 }} />
            <span>{type}</span>
          </div>
        ))}
        <span className="mx-2 text-gray-600">|</span>
        <div className="flex items-center gap-1">
          <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="#10b981" strokeWidth="1.5" /></svg>
          <span className="text-emerald-400">양(+) 괴리</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
          <span className="text-rose-400">음(-) 괴리</span>
        </div>
        <span className="mx-2 text-gray-600">|</span>
        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
          <svg width="12" height="12"><circle cx="6" cy="6" r="3" fill="#6b7280" opacity="0.4" /></svg>
          <span>소</span>
          <svg width="18" height="18"><circle cx="9" cy="9" r="7" fill="#6b7280" opacity="0.4" /></svg>
          <span>잔액 규모</span>
        </div>
      </div>
    </div>
  );
}

// 미니 추이 차트 (선택 시 사이드에 표시)
function TrendMiniChart({ data, color }: { data: GapTrendPoint[]; color: string }) {
  const n = data.length;
  const W = 230, H = 140;
  const padL = 35, padR = 10, padT = 10, padB = 25;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const vals = data.map((d) => d.gapEok);
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const vPad = Math.max((vMax - vMin) * 0.15, 0.5);
  const yMin = vMin - vPad;
  const yMax = vMax + vPad;
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => padL + (i / (n - 1)) * chartW;
  const toY = (v: number) => padT + ((yMax - v) / yRange) * chartH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.gapEok).toFixed(1)}`)
    .join(' ');

  // 면적 채우기
  const areaPath = `${linePath} L${toX(n - 1).toFixed(1)},${(padT + chartH).toFixed(1)} L${toX(0).toFixed(1)},${(padT + chartH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* 0선 */}
      {yMin <= 0 && yMax >= 0 && (
        <line x1={padL} y1={toY(0)} x2={W - padR} y2={toY(0)}
          stroke="#6B7280" strokeWidth={0.5} strokeDasharray="3 3" opacity={0.5} />
      )}

      {/* 면적 */}
      <path d={areaPath} fill={color} fillOpacity={0.1} />

      {/* 라인 */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

      {/* 점 */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.gapEok)} r={3} fill={color} stroke="white" strokeWidth={1} />
          {(i === 0 || i === n - 1) && (
            <text x={toX(i)} y={toY(d.gapEok) - 8} textAnchor="middle"
              style={{ fontSize: 9, fontWeight: 600, fontFamily: 'monospace' }} fill={color}>
              {d.gapEok > 0 ? '+' : ''}{d.gapEok.toFixed(1)}
            </text>
          )}
        </g>
      ))}

      {/* X축 날짜 */}
      {data.map((d, i) => {
        if (n <= 5 || i === 0 || i === n - 1 || i === Math.floor(n / 2)) {
          const label = `${d.date.slice(4, 6)}/${d.date.slice(6, 8)}`;
          return (
            <text key={i} x={toX(i)} y={H - 5} textAnchor="middle"
              style={{ fontSize: 8 }} className="fill-gray-400">{label}</text>
          );
        }
        return null;
      })}

      {/* Y축 */}
      <text x={padL - 5} y={toY(vMax) + 3} textAnchor="end"
        style={{ fontSize: 8 }} className="fill-gray-400">{vMax.toFixed(1)}</text>
      <text x={padL - 5} y={toY(vMin) + 3} textAnchor="end"
        style={{ fontSize: 8 }} className="fill-gray-400">{vMin.toFixed(1)}</text>
    </svg>
  );
}
