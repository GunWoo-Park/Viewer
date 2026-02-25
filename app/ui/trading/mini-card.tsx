// app/ui/trading/mini-card.tsx
// 컴팩트 지표 카드 — 주가/환율 등 단일 지표 표시
'use client';

import React from 'react';
import { useTradingContext } from '@/app/lib/trading-context';
import { getChangeColor, getChangeBgColor, changeSign } from '@/app/lib/trading-utils';

interface MiniCardProps {
  label: string;
  value: number;
  change: number;
  changePercent?: number;
  // 소수점 자릿수
  digits?: number;
}

export default function MiniCard({
  label,
  value,
  change,
  changePercent,
  digits = 2,
}: MiniCardProps) {
  const { isKorean } = useTradingContext();
  const changeColorClass = getChangeColor(change, isKorean);
  const bgClass = getChangeBgColor(change, isKorean);

  return (
    <div
      className={`rounded-lg border border-terminal-border bg-terminal-card p-3 transition-colors hover:border-terminal-border-light ${bgClass}`}
    >
      {/* 라벨 */}
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      {/* 값 */}
      <p className="mt-1 font-trading text-lg font-bold tabular-nums text-gray-100">
        {value.toLocaleString(undefined, { maximumFractionDigits: digits })}
      </p>
      {/* 변동 */}
      <p className={`mt-0.5 font-trading text-xs tabular-nums ${changeColorClass}`}>
        {changeSign(change)}
        {change.toLocaleString(undefined, { maximumFractionDigits: digits })}
        {changePercent !== undefined && (
          <span className="ml-1">
            ({changeSign(changePercent)}
            {changePercent.toFixed(2)}%)
          </span>
        )}
      </p>
    </div>
  );
}
