// app/ui/trading/ticker-bar.tsx
// 탑 티커바 — 주요 지표 스크롤 + 글로벌 시계
'use client';

import React, { useState, useEffect } from 'react';
import { useTradingContext } from '@/app/lib/trading-context';
import { getChangeColor, changeSign } from '@/app/lib/trading-utils';

interface TickerItem {
  label: string;
  value: number;
  change: number;
  changePercent?: number;
  digits?: number;
}

interface TickerBarProps {
  items: TickerItem[];
}

// 글로벌 시계 도시 설정
const CLOCKS = [
  { label: 'NY', tz: 'America/New_York' },
  { label: 'LDN', tz: 'Europe/London' },
  { label: 'TKY', tz: 'Asia/Tokyo' },
  { label: 'SEL', tz: 'Asia/Seoul' },
];

function GlobalClocks() {
  const [times, setTimes] = useState<string[]>([]);

  useEffect(() => {
    const update = () => {
      setTimes(
        CLOCKS.map((c) =>
          new Date().toLocaleTimeString('en-US', {
            timeZone: c.tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
        ),
      );
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  if (times.length === 0) return null;

  return (
    <div className="flex items-center gap-3 border-l border-terminal-border pl-3">
      {CLOCKS.map((c, i) => (
        <div key={c.label} className="flex items-center gap-1">
          <span className="text-[9px] font-medium text-gray-500">
            {c.label}
          </span>
          <span className="font-trading text-[11px] tabular-nums text-gray-300">
            {times[i] || '--:--'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TickerBar({ items }: TickerBarProps) {
  const { isKorean } = useTradingContext();

  // 티커 아이템 2번 반복 (무한 스크롤 효과)
  const doubled = [...items, ...items];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2">
      {/* 스크롤 티커 */}
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-ticker-scroll items-center gap-6 whitespace-nowrap hover:[animation-play-state:paused]">
          {doubled.map((item, idx) => (
            <div key={`${item.label}-${idx}`} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase text-gray-500">
                {item.label}
              </span>
              <span className="font-trading text-xs tabular-nums text-gray-200">
                {item.value.toLocaleString(undefined, {
                  maximumFractionDigits: item.digits ?? 2,
                })}
              </span>
              <span
                className={`font-trading text-[10px] tabular-nums ${getChangeColor(item.change, isKorean)}`}
              >
                {changeSign(item.change)}
                {item.change.toLocaleString(undefined, {
                  maximumFractionDigits: item.digits ?? 2,
                })}
                {item.changePercent !== undefined && (
                  <span className="ml-0.5">
                    ({changeSign(item.changePercent)}
                    {item.changePercent.toFixed(2)}%)
                  </span>
                )}
              </span>
              {/* 구분자 */}
              <span className="text-gray-700">|</span>
            </div>
          ))}
        </div>
      </div>
      {/* 글로벌 시계 */}
      <GlobalClocks />
    </div>
  );
}
