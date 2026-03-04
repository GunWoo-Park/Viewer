// app/ui/trading/sections/macro-calendar-section.tsx
// 경제 캘린더 섹션 — tb_economic_calendar DB 연동
'use client';

import React from 'react';
import SectionCard from '@/app/ui/trading/section-card';
import type { EconomicEvent } from '@/app/lib/market-data';

// 이벤트 유형별 아이콘/색상 판별
function eventStyle(desc: string) {
  if (desc.includes('입찰'))
    return { icon: '🏛', color: 'text-trading-blue' };
  if (desc.includes('국고'))
    return { icon: '📜', color: 'text-yellow-400' };
  if (desc.includes('통안'))
    return { icon: '🏦', color: 'text-cyan-400' };
  if (desc.includes('美') || desc.includes('미국'))
    return { icon: '🇺🇸', color: 'text-red-400' };
  if (desc.includes('中') || desc.includes('중국'))
    return { icon: '🇨🇳', color: 'text-red-500' };
  if (desc.includes('日') || desc.includes('일본'))
    return { icon: '🇯🇵', color: 'text-gray-300' };
  if (desc.includes('韓') || desc.includes('한국') || desc.includes('휴장'))
    return { icon: '🇰🇷', color: 'text-blue-400' };
  if (desc.includes('발표'))
    return { icon: '📊', color: 'text-emerald-400' };
  return { icon: '📌', color: 'text-gray-400' };
}

// 시간 추출 (예: [09:30~10:00] → 09:30)
function extractTime(desc: string): string | null {
  const m = desc.match(/\[(\d{2}:\d{2})/);
  return m ? m[1] : null;
}

interface MacroCalendarSectionProps {
  events?: EconomicEvent[];
}

export default function MacroCalendarSection({
  events = [],
}: MacroCalendarSectionProps) {
  return (
    <SectionCard title="Economic Calendar" icon="📅">
      {events.length === 0 ? (
        <div className="flex h-20 items-center justify-center">
          <p className="text-xs text-gray-500">예정된 이벤트 없음</p>
        </div>
      ) : (
        <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
          {events.map((e, i) => {
            const { icon, color } = eventStyle(e.event);
            const time = extractTime(e.event);
            // 시간 부분 제거한 본문
            const desc = e.event.replace(/\s*\[.*?\]\s*$/, '').trim();

            return (
              <div
                key={i}
                className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-white/[0.03] transition-colors"
              >
                <span className="mt-0.5 text-xs leading-none">{icon}</span>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs leading-snug ${color}`}>{desc}</span>
                </div>
                {time && (
                  <span className="shrink-0 font-trading text-[10px] tabular-nums text-gray-500">
                    {time}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
