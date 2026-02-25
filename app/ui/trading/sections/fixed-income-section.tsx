// app/ui/trading/sections/fixed-income-section.tsx
// 채권금리 섹션 — 미국채 + 국내 채권
'use client';

import React from 'react';
import SectionCard from '@/app/ui/trading/section-card';
import DataCell from '@/app/ui/trading/data-cell';
import type { USTreasury, BondYield } from '@/app/lib/market-data';

interface FixedIncomeSectionProps {
  usTreasury: USTreasury[];
  bonds: BondYield[];
}

export default function FixedIncomeSection({
  usTreasury,
  bonds,
}: FixedIncomeSectionProps) {
  return (
    <SectionCard title="Fixed Income" icon="🏛️">
      <div className="space-y-4">
        {/* 미국채 */}
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            US Treasury
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-border text-gray-500">
                <th className="pb-1.5 text-left font-medium">Tenor</th>
                <th className="pb-1.5 text-right font-medium">Yield</th>
                <th className="pb-1.5 text-right font-medium">Chg(bp)</th>
              </tr>
            </thead>
            <tbody>
              {usTreasury.map((u) => (
                <tr
                  key={u.tenor}
                  className="border-b border-terminal-border/50"
                >
                  <td className="py-1.5 text-gray-400">{u.tenor}</td>
                  <td className="py-1.5 text-right">
                    <DataCell value={u.level} format="rate" digits={3} />
                  </td>
                  <td className="py-1.5 text-right">
                    <DataCell
                      value={u.change}
                      format="bp"
                      showSign
                      change={-u.change}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 국내 채권 */}
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            KR Bond Yields
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-border text-gray-500">
                <th className="pb-1.5 text-left font-medium">Name</th>
                <th className="pb-1.5 text-right font-medium">Yield</th>
                <th className="pb-1.5 text-right font-medium">Chg(bp)</th>
              </tr>
            </thead>
            <tbody>
              {bonds.map((b) => (
                <tr
                  key={b.name}
                  className="border-b border-terminal-border/50"
                >
                  <td className="py-1.5 text-gray-400 whitespace-nowrap text-[11px]">
                    {b.name}
                  </td>
                  <td className="py-1.5 text-right">
                    <DataCell value={b.level} format="rate" digits={3} />
                  </td>
                  <td className="py-1.5 text-right">
                    <DataCell
                      value={b.change}
                      format="bp"
                      showSign
                      change={b.change}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}
