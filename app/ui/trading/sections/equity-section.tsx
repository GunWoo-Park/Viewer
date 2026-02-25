// app/ui/trading/sections/equity-section.tsx
// 주가지수 섹션 — mini-card 그리드
'use client';

import React from 'react';
import SectionCard from '@/app/ui/trading/section-card';
import MiniCard from '@/app/ui/trading/mini-card';
import type { StockIndex } from '@/app/lib/market-data';

interface EquitySectionProps {
  stocks: StockIndex[];
}

export default function EquitySection({ stocks }: EquitySectionProps) {
  // FX와 주가지수 분리
  const equities = stocks.filter(
    (s) => s.name !== 'USD/KRW' && s.name !== 'JPY/USD',
  );

  return (
    <SectionCard title="Equities" icon="📈">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {equities.map((s) => (
          <MiniCard
            key={s.name}
            label={s.name}
            value={s.level}
            change={s.change}
            changePercent={s.changePercent}
            digits={s.name === 'KOSPI' || s.name === 'KOSDAQ' ? 2 : 2}
          />
        ))}
      </div>
    </SectionCard>
  );
}
