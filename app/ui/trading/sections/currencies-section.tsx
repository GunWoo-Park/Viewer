// app/ui/trading/sections/currencies-section.tsx
// FX 환율 섹션
'use client';

import React from 'react';
import SectionCard from '@/app/ui/trading/section-card';
import MiniCard from '@/app/ui/trading/mini-card';
import type { StockIndex } from '@/app/lib/market-data';

interface CurrenciesSectionProps {
  stocks: StockIndex[];
}

export default function CurrenciesSection({ stocks }: CurrenciesSectionProps) {
  const fxPairs = stocks.filter(
    (s) => s.name === 'USD/KRW' || s.name === 'JPY/USD',
  );

  return (
    <SectionCard title="Currencies" icon="💱">
      <div className="grid grid-cols-2 gap-2">
        {fxPairs.map((s) => (
          <MiniCard
            key={s.name}
            label={s.name}
            value={s.level}
            change={s.change}
            changePercent={s.changePercent}
            digits={s.name === 'USD/KRW' ? 2 : 4}
          />
        ))}
      </div>
    </SectionCard>
  );
}
