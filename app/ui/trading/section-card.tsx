// app/ui/trading/section-card.tsx
// 섹션 래퍼 카드 — 각 데이터 영역을 감싸는 컨테이너
'use client';

import React from 'react';

interface SectionCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
  // 카드 전체 너비 사용 여부
  fullWidth?: boolean;
}

export default function SectionCard({
  title,
  icon,
  children,
  className = '',
  fullWidth = false,
}: SectionCardProps) {
  return (
    <div
      className={`rounded-lg border border-terminal-border bg-terminal-card overflow-hidden ${
        fullWidth ? 'col-span-full' : ''
      } ${className}`}
    >
      {/* 타이틀 바 */}
      <div className="flex items-center gap-2 border-b border-terminal-border px-4 py-2.5">
        {icon && <span className="text-sm">{icon}</span>}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </h3>
      </div>
      {/* 콘텐츠 */}
      <div className="p-4">{children}</div>
    </div>
  );
}
