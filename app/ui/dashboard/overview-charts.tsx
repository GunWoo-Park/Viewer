'use client';

import { useState, useEffect, useRef } from 'react';

// ——— 타입 ———
type WeeklyTypePoint = {
  date: string;       // MM/DD
  byType: Record<string, number>;  // type1 → 억
  daily: number;      // 전체 daily (억)
};

type PnlTypeBar = {
  label: string;
  value: number;  // 억
  curr: string;
};

type DeltaCurve = {
  label: string;
  value: number;  // 원 단위
  color: string;
};

// ——— 유틸 ———
function fmtDate(d: string): string {
  // date가 이미 'MM/DD' 형식이면 그대로, YYYYMMDD이면 변환
  if (d.includes('/')) return d;
  return `${d.slice(4, 6)}/${d.slice(6, 8)}`;
}

function fmtEok(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1) return `${v.toFixed(1)}`;
  if (abs >= 0.01) return `${v.toFixed(2)}`;
  return v.toFixed(3);
}

// 유형별 색상 팔레트 (최대 12개)
const TYPE_COLORS = [
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
];

// ——— 1. 1주일치 유형별 Stacked Bar 차트 ———
export function WeeklyTypePnlChart({
  data,
  height = 220,
}: {
  data: WeeklyTypePoint[];
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    items: { type: string; value: number; color: string }[];
    total: number;
  } | null>(null);

  // 모든 type1 수집 (합산 절대값 기준 정렬)
  const typeAgg: Record<string, number> = {};
  data.forEach((d) => {
    for (const [t, v] of Object.entries(d.byType)) {
      typeAgg[t] = (typeAgg[t] || 0) + Math.abs(v);
    }
  });
  const types = Object.entries(typeAgg)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);
  const typeColorMap: Record<string, string> = {};
  types.forEach((t, i) => {
    typeColorMap[t] = TYPE_COLORS[i % TYPE_COLORS.length];
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const ml = 44, mr = 20, mt = 24, mb = 28;
    const pw = W - ml - mr;
    const ph = H - mt - mb;

    // 각 날짜별 양/음 합산 계산
    const posStacks: number[] = [];
    const negStacks: number[] = [];
    data.forEach((d) => {
      let pos = 0, neg = 0;
      for (const v of Object.values(d.byType)) {
        if (v >= 0) pos += v;
        else neg += v;
      }
      posStacks.push(pos);
      negStacks.push(neg);
    });

    const maxPos = Math.max(...posStacks, 0.1);
    const maxNeg = Math.min(...negStacks, -0.1);
    const totalRange = maxPos - maxNeg || 1;

    const gap = pw / data.length;
    const barW = Math.max(16, gap * 0.7);

    ctx.clearRect(0, 0, W, H);

    // 0선 위치
    const zeroY = mt + (maxPos / totalRange) * ph;

    // 0선
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(ml, zeroY);
    ctx.lineTo(ml + pw, zeroY);
    ctx.stroke();

    // 각 날짜별 stacked bar 그리기
    data.forEach((d, i) => {
      const cx = ml + i * gap + gap / 2;

      // 양수 스택 (위로)
      let posOffset = 0;
      for (const t of types) {
        const v = d.byType[t] || 0;
        if (v <= 0) continue;
        const barH = (v / totalRange) * ph;
        const y = zeroY - posOffset - barH;
        ctx.fillStyle = typeColorMap[t] + 'cc';
        ctx.fillRect(cx - barW / 2, y, barW, barH);
        posOffset += barH;
      }

      // 음수 스택 (아래로)
      let negOffset = 0;
      for (const t of types) {
        const v = d.byType[t] || 0;
        if (v >= 0) continue;
        const barH = (Math.abs(v) / totalRange) * ph;
        const y = zeroY + negOffset;
        ctx.fillStyle = typeColorMap[t] + 'cc';
        ctx.fillRect(cx - barW / 2, y, barW, barH);
        negOffset += barH;
      }
    });

    // Daily PnL 추이선 (net total)
    ctx.strokeStyle = '#facc15'; // yellow-400
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const cx = ml + i * gap + gap / 2;
      const dy = zeroY - (d.daily / totalRange) * ph;
      if (i === 0) ctx.moveTo(cx, dy);
      else ctx.lineTo(cx, dy);
    });
    ctx.stroke();

    // 추이선 위에 점 + daily PnL 값 표시
    data.forEach((d, i) => {
      const cx = ml + i * gap + gap / 2;
      const dy = zeroY - (d.daily / totalRange) * ph;
      // 점
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(cx, dy, 3, 0, Math.PI * 2);
      ctx.fill();
      // 값 레이블 (캔버스 밖으로 나가지 않도록 클램핑)
      ctx.fillStyle = '#fde047'; // yellow-300
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const rawLabelY = d.daily >= 0 ? dy - 8 : dy + 14;
      const labelY = Math.max(10, Math.min(rawLabelY, H - 4));
      ctx.fillText(`${d.daily > 0 ? '+' : ''}${fmtEok(d.daily)}`, Math.min(cx, W - mr - 10), labelY);
    });

    // Y축 레이블
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${fmtEok(maxPos)}`, ml - 4, mt + 8);
    ctx.fillText(`${fmtEok(maxNeg)}`, ml - 4, H - mb - 2);
    ctx.fillText('0', ml - 4, zeroY + 3);

    // X축 레이블 (모든 날짜)
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.font = '10px sans-serif';
    data.forEach((d, i) => {
      const x = ml + i * gap + gap / 2;
      ctx.fillText(fmtDate(d.date), x, H - 6);
    });
  }, [data, types, typeColorMap]);

  // 마우스 호버
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const ml = 44, mr = 20;
    const pw = rect.width - ml - mr;
    const gap = pw / data.length;
    const idx = Math.floor((mx - ml) / gap);
    if (idx >= 0 && idx < data.length) {
      const d = data[idx];
      const items = types
        .filter((t) => (d.byType[t] || 0) !== 0)
        .map((t) => ({ type: t, value: d.byType[t] || 0, color: typeColorMap[t] }));
      const x = ml + idx * gap + gap / 2;
      setTooltip({
        x: Math.min(Math.max(x, 80), rect.width - 80),
        y: e.clientY - rect.top - 10,
        date: d.date,
        items,
        total: d.daily,
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="relative" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-lg bg-gray-900/95 dark:bg-gray-100/95 text-white dark:text-gray-900 text-[10px] px-3 py-2 shadow-lg min-w-[130px]"
          style={{ left: tooltip.x, top: Math.max(tooltip.y - tooltip.items.length * 14 - 30, 4), transform: 'translateX(-50%)' }}
        >
          <p className="font-bold mb-1 border-b border-gray-700 dark:border-gray-300 pb-1">
            {fmtDate(tooltip.date)} · 합계: <span className={tooltip.total >= 0 ? 'text-emerald-300 dark:text-emerald-600' : 'text-rose-300 dark:text-rose-600'}>{tooltip.total > 0 ? '+' : ''}{tooltip.total.toFixed(2)}억</span>
          </p>
          {tooltip.items.map((it: { type: string; value: number; color: string }, i: number) => (
            <div key={i} className="flex items-center gap-1.5 py-0.5">
              <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: it.color }} />
              <span className="flex-1 truncate">{it.type}</span>
              <span className={`font-mono font-semibold ${it.value >= 0 ? 'text-emerald-300 dark:text-emerald-600' : 'text-rose-300 dark:text-rose-600'}`}>
                {it.value > 0 ? '+' : ''}{it.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ——— 2. PnL Attribution 수평 바 차트 ———
export function PnlAttributionBarChart({
  data,
  height = 180,
}: {
  data: PnlTypeBar[];
  height?: number;
}) {
  if (data.length === 0) return null;

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 0.01);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div style={{ height }} className="flex flex-col justify-center gap-1.5 px-2">
      {sorted.map((item, i) => {
        const pct = (item.value / maxAbs) * 100;
        const isPos = item.value >= 0;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-24 text-right text-[10px] text-gray-500 dark:text-gray-400 truncate">
              {item.label}
            </span>
            <span
              className={`inline-flex rounded-full px-1 py-0 text-[8px] font-bold ${
                item.curr === 'KRW'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
              }`}
            >
              {item.curr}
            </span>
            <div className="flex-1 relative h-4">
              {/* 중심선 */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
              {/* 바 */}
              <div
                className={`absolute top-0.5 h-3 rounded-sm transition-all ${
                  isPos
                    ? 'bg-emerald-500/70 dark:bg-emerald-400/60'
                    : 'bg-rose-500/70 dark:bg-rose-400/60'
                }`}
                style={{
                  left: isPos ? '50%' : `${50 + pct / 2}%`,
                  width: `${Math.abs(pct) / 2}%`,
                }}
              />
            </div>
            <span
              className={`w-16 text-right font-mono text-[10px] font-semibold ${
                isPos
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {item.value > 0 ? '+' : ''}{item.value.toFixed(2)}억
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ——— 3. Risk Delta + PnL 게이지 바 (수평 diverging) ———
export function DeltaGaugeBar({
  curves,
  dailyPnl,
  height = 100,
}: {
  curves: DeltaCurve[];
  dailyPnl?: number; // 억 단위
  height?: number;
}) {
  const total = curves.reduce((s, c) => s + c.value, 0);
  const allVals = [...curves.map((c) => c.value), total];
  const maxAbs = Math.max(...allVals.map(Math.abs), 1);

  // 억 변환
  const toEok = (v: number) => v / 100000000;

  const deltaItems = [
    ...curves,
    { label: 'Total', value: total, color: '#3b82f6' },
  ];

  // PnL 별도 스케일 최대값
  const pnlMaxAbs = dailyPnl !== undefined ? Math.max(Math.abs(dailyPnl), 0.01) : 1;

  return (
    <div style={{ minHeight: height }} className="flex flex-col justify-center gap-1.5 px-1">
      {/* 섹션 레이블: Hedge Delta */}
      <p className="text-[8px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
        Hedge Net Delta
      </p>
      {deltaItems.map((item, i) => {
        const eok = toEok(item.value);
        const pct = (item.value / maxAbs) * 100;
        const isPos = item.value >= 0;
        const isTotal = item.label === 'Total';

        return (
          <div key={i} className={`flex items-center gap-2 ${isTotal ? 'pt-1.5 border-t border-gray-200 dark:border-gray-700' : ''}`}>
            <span className={`w-14 text-right text-[10px] ${isTotal ? 'font-bold text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
              {item.label}
            </span>
            <div className="flex-1 relative h-5">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600" />
              <div
                className="absolute top-0.5 h-4 rounded-sm transition-all"
                style={{
                  backgroundColor: item.color + (isTotal ? 'cc' : '99'),
                  left: isPos ? '50%' : `${50 + pct / 2}%`,
                  width: `${Math.min(Math.abs(pct) / 2, 49)}%`,
                }}
              />
            </div>
            <span
              className="w-20 text-right font-mono text-[10px] font-semibold"
              style={{ color: item.color }}
            >
              {isPos ? '+' : ''}{eok.toFixed(1)}억
            </span>
          </div>
        );
      })}

      {/* Daily PnL 바 */}
      {dailyPnl !== undefined && (
        <>
          <p className="text-[8px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-2 mb-0.5">
            Daily PnL
          </p>
          <div className="flex items-center gap-2">
            <span className="w-14 text-right text-[10px] font-bold text-gray-700 dark:text-gray-200">
              PnL
            </span>
            <div className="flex-1 relative h-5">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600" />
              <div
                className="absolute top-0.5 h-4 rounded-sm transition-all"
                style={{
                  backgroundColor: dailyPnl >= 0 ? '#10b981cc' : '#f43f5ecc',
                  left: dailyPnl >= 0 ? '50%' : `${50 - Math.min(Math.abs(dailyPnl) / pnlMaxAbs * 50, 49)}%`,
                  width: `${Math.min(Math.abs(dailyPnl) / pnlMaxAbs * 50, 49)}%`,
                }}
              />
            </div>
            <span
              className={`w-20 text-right font-mono text-[10px] font-semibold ${
                dailyPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {dailyPnl > 0 ? '+' : ''}{dailyPnl.toFixed(2)}억
            </span>
          </div>
        </>
      )}
    </div>
  );
}
