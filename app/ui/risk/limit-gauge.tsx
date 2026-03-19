'use client';

import { useState, useEffect } from 'react';
import { lusitana } from '@/app/ui/fonts';

function fmtEok(v: number): string {
  const sign = v > 0 ? '+' : '';
  const a = Math.abs(v);
  if (a >= 10) return `${sign}${v.toFixed(0)}억`;
  if (a >= 1) return `${sign}${v.toFixed(1)}억`;
  return `${sign}${v.toFixed(2)}억`;
}

export default function LimitGauge({
  spcTotalEok,
  spcTotalCount,
  selfIssuedEok,
  selfIssuedCount,
  mtmHedgeEok,
  mtmHedgeCount,
  defaultLimit,
  exportDate,
}: {
  spcTotalEok: number;      // SPC 담보 대상 합산 (억, 보통 음수)
  spcTotalCount: number;
  selfIssuedEok: number;    // 자체발행 부채 (억)
  selfIssuedCount: number;
  mtmHedgeEok: number;      // MTM헤지 (억)
  mtmHedgeCount: number;
  defaultLimit: number;     // 한도 (억, 양수)
  exportDate: string;
}) {
  const [limit, setLimit] = useState(defaultLimit);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('risk_limit_eok');
      if (saved) setLimit(Number(saved));
    } catch {}
  }, []);

  // SPC 합산 기준 한도 판단
  const headroom = limit - spcTotalEok;
  const gaugeMin = Math.min(spcTotalEok, -limit);
  const gaugeRange = limit - gaugeMin;
  const fillPct = gaugeRange > 0 ? ((spcTotalEok - gaugeMin) / gaugeRange) * 100 : 0;

  const isOver = spcTotalEok > limit;
  const isWarning = spcTotalEok > limit * 0.8;
  const isHealthy = !isOver && !isWarning;

  const saveLimit = () => {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v > 0) {
      setLimit(v);
      try { localStorage.setItem('risk_limit_eok', String(v)); } catch {}
    }
    setEditing(false);
  };

  if (!mounted) return null;

  const statusColor = isOver
    ? 'text-rose-600 dark:text-rose-400'
    : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  const barColor = isOver
    ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
  const statusBg = isOver
    ? 'border-rose-200 dark:border-rose-800'
    : isWarning ? 'border-amber-200 dark:border-amber-800' : 'border-gray-200 dark:border-gray-700';
  const statusLabel = isOver ? '한도 초과' : isWarning ? '한도 근접' : '건전';

  return (
    <div className={`rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm ${statusBg}`}>
      {/* 상단: SPC 합산 수치 + 게이지 + 한도 설정 */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">SPC담보 MTM</span>
          <span className={`${lusitana.className} text-xl font-bold ${statusColor}`}>
            {fmtEok(spcTotalEok)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">/ {limit}억</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            isOver ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
              : isWarning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          }`}>
            {statusLabel}
          </span>
        </div>

        {/* 게이지 바 */}
        <div className="flex-1 relative h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(Math.max(fillPct, 2), 100)}%` }}
          />
          {!isOver && (
            <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-400 dark:bg-gray-500" />
          )}
          {isOver && (
            <div
              className="absolute inset-y-0 rounded-r-full bg-rose-600/30"
              style={{
                left: `${((limit - gaugeMin) / gaugeRange) * 100}%`,
                right: 0,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 6px)',
              }}
            />
          )}
        </div>

        {/* 한도 설정 */}
        {editing ? (
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number" value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveLimit(); if (e.key === 'Escape') setEditing(false); }}
              className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
            <button onClick={saveLimit} className="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] text-white hover:bg-blue-600">OK</button>
            <button onClick={() => setEditing(false)} className="rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">X</button>
          </div>
        ) : (
          <button
            onClick={() => { setEditVal(String(limit)); setEditing(true); }}
            className="shrink-0 rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            한도: {limit}억
          </button>
        )}
      </div>

      {/* 하단: 내역 + 여유 */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="text-gray-400 dark:text-gray-500 text-[10px]">{spcTotalCount}건</span>

        <span className="text-gray-300 dark:text-gray-600">|</span>

        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-fuchsia-400" />
          <span className="text-gray-500 dark:text-gray-400">자체발행</span>
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{fmtEok(selfIssuedEok)}</span>
          <span className="text-gray-400 dark:text-gray-600">({selfIssuedCount})</span>
          <a href={`/api/risk-export?tp=self&date=${exportDate}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="XLSX">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </a>
        </div>

        <span className="text-gray-300 dark:text-gray-600">|</span>

        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-400" />
          <span className="text-gray-500 dark:text-gray-400">MTM헤지</span>
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{fmtEok(mtmHedgeEok)}</span>
          <span className="text-gray-400 dark:text-gray-600">({mtmHedgeCount})</span>
          <a href={`/api/risk-export?tp=mtm&date=${exportDate}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="XLSX">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </a>
        </div>

        <span className="flex-1" />
        <span className="text-gray-400 dark:text-gray-500 text-[10px]">
          여유: <span className={statusColor}>{fmtEok(headroom)}</span>
        </span>
      </div>
    </div>
  );
}
