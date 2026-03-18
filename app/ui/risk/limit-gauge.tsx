'use client';

import { useState, useEffect } from 'react';
import { lusitana } from '@/app/ui/fonts';

// 억 단위 포맷
function fmtEok(v: number): string {
  if (Math.abs(v) >= 10) return `${v.toFixed(0)}억`;
  if (Math.abs(v) >= 1) return `${v.toFixed(1)}억`;
  return `${v.toFixed(2)}억`;
}

export default function LimitGauge({
  selfIssuedEok,
  mtmHedgeEok,
  defaultLimit,
}: {
  selfIssuedEok: number; // 자체발행 부채 (억, 음수)
  mtmHedgeEok: number;   // MTM헤지 (억, 음수)
  defaultLimit: number;  // 기본 한도 (억, 양수)
}) {
  // localStorage에서 한도 복원 (클라이언트만)
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

  // 합산 (절대값 — 부채이므로 음수를 양수로)
  const selfAbs = Math.abs(selfIssuedEok);
  const mtmAbs = Math.abs(mtmHedgeEok);
  const totalAbs = selfAbs + mtmAbs;
  const usage = limit > 0 ? (totalAbs / limit) * 100 : 0;
  const isOver = totalAbs > limit;
  const isWarning = usage >= 80 && !isOver;

  // 한도 저장
  const saveLimit = () => {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v > 0) {
      setLimit(v);
      try { localStorage.setItem('risk_limit_eok', String(v)); } catch {}
    }
    setEditing(false);
  };

  if (!mounted) return null;

  // 게이지 바 색상
  const barColor = isOver
    ? 'bg-rose-500 dark:bg-rose-400'
    : isWarning
      ? 'bg-amber-500 dark:bg-amber-400'
      : 'bg-emerald-500 dark:bg-emerald-400';

  const statusColor = isOver
    ? 'text-rose-600 dark:text-rose-400'
    : isWarning
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';

  const statusBg = isOver
    ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800'
    : isWarning
      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
      : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800';

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${statusBg}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
            부채 평가금액 한도 모니터링
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            자체발행 + MTM헤지 합산 |{' '}
            {isOver ? '한도 초과' : isWarning ? '한도 경고 (80% 이상)' : '정상 범위'}
          </p>
        </div>
        {/* 한도 설정 */}
        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveLimit()}
                className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="억"
                autoFocus
              />
              <button
                onClick={saveLimit}
                className="rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white hover:bg-blue-600"
              >
                저장
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-[10px] text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setEditVal(String(limit)); setEditing(true); }}
              className="flex items-center gap-1 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              한도: {limit}억
            </button>
          )}
        </div>
      </div>

      {/* 메인 수치 */}
      <div className="flex items-end gap-3 mb-4">
        <p className={`${lusitana.className} text-3xl font-bold ${statusColor}`}>
          {fmtEok(totalAbs)}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 pb-0.5">
          / {limit}억
        </p>
        <p className={`text-sm font-semibold pb-0.5 ${statusColor}`}>
          ({usage.toFixed(1)}%)
        </p>
      </div>

      {/* 게이지 바 */}
      <div className="relative h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-3">
        {/* 한도 채움 바 */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(usage, 100)}%` }}
        />
        {/* 초과분 (빨간 줄무늬) */}
        {isOver && (
          <div
            className="absolute inset-y-0 rounded-r-full bg-rose-600/30 dark:bg-rose-400/20"
            style={{
              left: `${(limit / totalAbs) * 100}%`,
              width: `${100 - (limit / totalAbs) * 100}%`,
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
            }}
          />
        )}
        {/* 한도선 */}
        {usage < 100 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-gray-500 dark:bg-gray-400"
            style={{ left: '100%' }}
          />
        )}
        {isOver && (
          <div
            className="absolute inset-y-0 w-0.5 bg-rose-700 dark:bg-rose-300"
            style={{ left: `${(limit / totalAbs) * 100}%` }}
          />
        )}
      </div>

      {/* 내역 구분 바 (stacked horizontal) */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-fuchsia-400 dark:bg-fuchsia-500" />
          <span className="text-gray-500 dark:text-gray-400">자체발행</span>
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">
            {fmtEok(selfAbs)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400 dark:bg-amber-500" />
          <span className="text-gray-500 dark:text-gray-400">MTM헤지</span>
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">
            {fmtEok(mtmAbs)}
          </span>
        </div>
        <div className="flex-1" />
        <span className="text-gray-400 dark:text-gray-500">
          여유: {limit - totalAbs >= 0 ? fmtEok(limit - totalAbs) : `-${fmtEok(totalAbs - limit)}`}
        </span>
      </div>

      {/* 비율 막대 (자체발행 vs MTM헤지) */}
      {totalAbs > 0 && (
        <div className="mt-3 flex h-2 rounded-full overflow-hidden">
          <div
            className="bg-fuchsia-400 dark:bg-fuchsia-500"
            style={{ width: `${(selfAbs / totalAbs) * 100}%` }}
          />
          <div
            className="bg-amber-400 dark:bg-amber-500"
            style={{ width: `${(mtmAbs / totalAbs) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
