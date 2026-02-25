// app/ui/trading/sections/credit-curve-section.tsx
// 크레딧 커브 매트릭스 — 12섹터 × 8만기
'use client';

import React from 'react';
import SectionCard from '@/app/ui/trading/section-card';
import type { CreditSpread } from '@/app/lib/market-data';

interface CreditCurveSectionProps {
  creditSpreads: CreditSpread[];
}

const TENORS = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y', '20Y'] as const;
const TENOR_KEYS = [
  'y3M', 'y6M', 'y1Y', 'y2Y', 'y3Y', 'y5Y', 'y10Y', 'y20Y',
] as const;

// 수익률 기반 색상 강도 (히트맵 효과)
function getHeatColor(val: number): string {
  if (!val) return '';
  if (val < 2.5) return 'text-emerald-400';
  if (val < 3.0) return 'text-emerald-300';
  if (val < 3.5) return 'text-yellow-300';
  if (val < 4.0) return 'text-orange-300';
  if (val < 5.0) return 'text-orange-400';
  return 'text-red-400';
}

export default function CreditCurveSection({
  creditSpreads,
}: CreditCurveSectionProps) {
  return (
    <SectionCard title="Credit Curve Matrix" icon="📊" fullWidth>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-terminal-border text-gray-500">
              <th className="pb-1.5 text-left font-medium min-w-[80px] sticky left-0 bg-terminal-card z-10">
                Sector
              </th>
              {TENORS.map((t) => (
                <th
                  key={t}
                  className="pb-1.5 text-right font-medium min-w-[55px]"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {creditSpreads.map((c) => (
              <tr
                key={c.name}
                className="border-b border-terminal-border/50 hover:bg-white/[0.02]"
              >
                <td className="py-1.5 text-gray-400 whitespace-nowrap font-medium sticky left-0 bg-terminal-card z-10">
                  {c.name}
                </td>
                {TENOR_KEYS.map((key) => {
                  const val = c[key];
                  return (
                    <td
                      key={key}
                      className={`py-1.5 text-right font-trading tabular-nums ${getHeatColor(val)}`}
                    >
                      {val ? val.toFixed(3) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
