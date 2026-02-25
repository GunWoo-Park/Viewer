// app/ui/trading/sections/futures-section.tsx
// KTB 선물 섹션
'use client';

import React from 'react';
import SectionCard from '@/app/ui/trading/section-card';
import DataCell from '@/app/ui/trading/data-cell';
import type { KTBFutures } from '@/app/lib/market-data';

interface FuturesSectionProps {
  ktbFutures: KTBFutures[];
}

export default function FuturesSection({ ktbFutures }: FuturesSectionProps) {
  if (ktbFutures.length === 0) {
    return (
      <SectionCard title="KTB Futures" icon="📋">
        <p className="text-xs text-gray-500">데이터 없음</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="KTB Futures" icon="📋">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-terminal-border text-gray-500">
              <th className="pb-1.5 text-left font-medium">종목</th>
              <th className="pb-1.5 text-right font-medium">종가</th>
              <th className="pb-1.5 text-right font-medium">거래량</th>
              <th className="pb-1.5 text-right font-medium">외국인</th>
              <th className="pb-1.5 text-right font-medium">금투</th>
              <th className="pb-1.5 text-right font-medium">은행</th>
            </tr>
          </thead>
          <tbody>
            {ktbFutures.map((f) => (
              <tr
                key={f.ticker}
                className="border-b border-terminal-border/50"
              >
                <td className="py-1.5 font-medium text-gray-300">
                  {f.ticker}
                </td>
                <td className="py-1.5 text-right">
                  <DataCell value={f.price} format="price" digits={2} />
                </td>
                <td className="py-1.5 text-right">
                  <DataCell value={f.volume} format="number" digits={0} />
                </td>
                <td className="py-1.5 text-right">
                  <DataCell
                    value={f.netForeign}
                    format="number"
                    digits={0}
                    showSign
                    change={f.netForeign}
                  />
                </td>
                <td className="py-1.5 text-right">
                  <DataCell
                    value={f.netFinInvest}
                    format="number"
                    digits={0}
                    showSign
                    change={f.netFinInvest}
                  />
                </td>
                <td className="py-1.5 text-right">
                  <DataCell
                    value={f.netBank}
                    format="number"
                    digits={0}
                    showSign
                    change={f.netBank}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
