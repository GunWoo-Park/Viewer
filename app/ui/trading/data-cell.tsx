// app/ui/trading/data-cell.tsx
// 숫자 데이터 셀 — 모노스페이스, 색상 코딩, tabular-nums
'use client';

import React from 'react';
import { useTradingContext } from '@/app/lib/trading-context';
import { getChangeColor, changeSign } from '@/app/lib/trading-utils';

interface DataCellProps {
  value: number;
  // 변동값 (색상 코딩에 사용)
  change?: number;
  // 포맷 타입
  format?: 'rate' | 'bp' | 'number' | 'percent' | 'price';
  // 소수점 자릿수
  digits?: number;
  // 추가 클래스
  className?: string;
  // 부호 표시 여부
  showSign?: boolean;
}

export default function DataCell({
  value,
  change,
  format = 'number',
  digits,
  className = '',
  showSign = false,
}: DataCellProps) {
  const { isKorean } = useTradingContext();

  // 변동값 기준 색상 (change가 주어지면 그걸로, 아니면 value로)
  const colorBase = change !== undefined ? change : value;
  const colorClass = showSign || change !== undefined
    ? getChangeColor(colorBase, isKorean)
    : 'text-gray-100';

  // 포맷팅
  let displayValue: string;
  const d = digits !== undefined ? digits : getDefaultDigits(format);

  if (!value && value !== 0) {
    displayValue = '-';
  } else if (value === 0 && format === 'bp') {
    displayValue = '-';
  } else {
    const sign = showSign ? changeSign(value) : '';
    switch (format) {
      case 'rate':
        displayValue = `${sign}${value.toFixed(d)}`;
        break;
      case 'bp':
        displayValue = `${sign}${value.toFixed(d)}`;
        break;
      case 'percent':
        displayValue = `${sign}${value.toFixed(d)}%`;
        break;
      case 'price':
        displayValue = `${sign}${value.toLocaleString(undefined, { maximumFractionDigits: d })}`;
        break;
      default:
        displayValue = `${sign}${value.toLocaleString(undefined, { maximumFractionDigits: d })}`;
    }
  }

  return (
    <span
      className={`font-trading tabular-nums ${colorClass} ${className}`}
    >
      {displayValue}
    </span>
  );
}

function getDefaultDigits(format: string): number {
  switch (format) {
    case 'rate':
      return 3;
    case 'bp':
      return 1;
    case 'percent':
      return 2;
    case 'price':
      return 2;
    default:
      return 0;
  }
}
