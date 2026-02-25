// app/ui/trading/sections/bond-lending-section.tsx
// 채권 대차 섹션
'use client';

import React from 'react';
import SectionCard from '@/app/ui/trading/section-card';
import DataCell from '@/app/ui/trading/data-cell';
import type { BondLending } from '@/app/lib/market-data';

interface BondLendingSectionProps {
  bondLending: BondLending[];
}

export default function BondLendingSection({
  bondLending,
}: BondLendingSectionProps) {
  if (bondLending.length === 0) {
    return (
      <SectionCard title="Bond Lending" icon="🔁">
        <p className="text-xs text-gray-500">데이터 없음</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Bond Lending" icon="🔁">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-terminal-border text-gray-500">
              <th className="pb-1.5 text-left font-medium">종목</th>
              <th className="pb-1.5 text-right font-medium">대차(억)</th>
              <th className="pb-1.5 text-right font-medium">상환(억)</th>
              <th className="pb-1.5 text-right font-medium">증감(억)</th>
              <th className="pb-1.5 text-right font-medium">잔량(억)</th>
            </tr>
          </thead>
          <tbody>
            {bondLending.map((l) => (
              <tr
                key={l.ticker}
                className="border-b border-terminal-border/50"
              >
                <td className="py-1.5 font-medium text-gray-300 whitespace-nowrap text-[11px]">
                  {l.ticker}
                </td>
                <td className="py-1.5 text-right">
                  <DataCell value={l.borrowAmt} format="number" digits={0} />
                </td>
                <td className="py-1.5 text-right">
                  <DataCell value={l.repayAmt} format="number" digits={0} />
                </td>
                <td className="py-1.5 text-right">
                  <DataCell
                    value={l.netChange}
                    format="number"
                    digits={0}
                    showSign
                    change={l.netChange}
                  />
                </td>
                <td className="py-1.5 text-right">
                  <DataCell value={l.balance} format="number" digits={0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
