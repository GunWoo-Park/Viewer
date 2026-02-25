// app/ui/trading/sections/swaps-section.tsx
// IRS/CRS + Bond-Swap Spread 섹션
'use client';

import React from 'react';
import SectionCard from '@/app/ui/trading/section-card';
import DataCell from '@/app/ui/trading/data-cell';
import type { IRSRate, CRSRate, BondSpread } from '@/app/lib/market-data';

interface SwapsSectionProps {
  irs: IRSRate[];
  crs: CRSRate[];
  spreads: BondSpread[];
}

export default function SwapsSection({ irs, crs, spreads }: SwapsSectionProps) {
  return (
    <SectionCard title="IRS / CRS / Spread" icon="🔄">
      <div className="space-y-4">
        {/* IRS & CRS 병합 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-border text-gray-500">
                <th className="pb-1.5 text-left font-medium">Tenor</th>
                <th className="pb-1.5 text-right font-medium">IRS</th>
                <th className="pb-1.5 text-right font-medium">Chg</th>
                <th className="pb-1.5 text-right font-medium">CRS</th>
                <th className="pb-1.5 text-right font-medium">Chg</th>
              </tr>
            </thead>
            <tbody>
              {irs.map((irsItem, idx) => {
                const crsItem = crs[idx];
                return (
                  <tr
                    key={irsItem.tenor}
                    className="border-b border-terminal-border/50"
                  >
                    <td className="py-1.5 text-gray-400">{irsItem.tenor}</td>
                    <td className="py-1.5 text-right">
                      <DataCell value={irsItem.rate} format="rate" digits={4} />
                    </td>
                    <td className="py-1.5 text-right">
                      <DataCell
                        value={irsItem.change}
                        format="bp"
                        showSign
                        change={irsItem.change}
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      {crsItem ? (
                        <DataCell value={crsItem.rate} format="rate" digits={3} />
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right">
                      {crsItem ? (
                        <DataCell
                          value={crsItem.change}
                          format="bp"
                          showSign
                          change={crsItem.change}
                        />
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bond-Swap Spread */}
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Bond-Swap Spread
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-border text-gray-500">
                <th className="pb-1.5 text-left font-medium">Name</th>
                <th className="pb-1.5 text-right font-medium">IRS</th>
                <th className="pb-1.5 text-right font-medium">Spread(bp)</th>
              </tr>
            </thead>
            <tbody>
              {spreads.map((s) => (
                <tr
                  key={s.name}
                  className="border-b border-terminal-border/50"
                >
                  <td className="py-1.5 text-gray-400 whitespace-nowrap text-[11px]">
                    {s.name}
                  </td>
                  <td className="py-1.5 text-right">
                    <DataCell
                      value={s.irs}
                      format="rate"
                      digits={4}
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <DataCell
                      value={s.sp}
                      format="bp"
                      digits={2}
                      showSign
                      change={s.sp}
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
