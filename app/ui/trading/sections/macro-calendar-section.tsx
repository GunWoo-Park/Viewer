// app/ui/trading/sections/macro-calendar-section.tsx
// 경제 캘린더 섹션
'use client';

import React from 'react';
import SectionCard from '@/app/ui/trading/section-card';

interface MacroCalendarSectionProps {
  // 향후 tb_economic_calendar 데이터 연결
  events?: { date: string; event: string }[];
}

export default function MacroCalendarSection({
  events = [],
}: MacroCalendarSectionProps) {
  return (
    <SectionCard title="Macro Calendar" icon="📅">
      {events.length === 0 ? (
        <div className="flex h-20 items-center justify-center">
          <p className="text-xs text-gray-500">예정된 이벤트 없음</p>
        </div>
      ) : (
        <div className="space-y-1">
          {events.map((e, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-white/[0.02]"
            >
              <span className="font-trading text-[10px] tabular-nums text-gray-500">
                {e.date}
              </span>
              <span className="text-xs text-gray-300">{e.event}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
