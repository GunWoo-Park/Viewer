'use client';

import { useState } from 'react';
import { Strucprdp } from '@/app/lib/definitions';
import StrucprdpTable from './table';
import MTMModal from './mtm-modal';

export default function ClickableStrucprdpTable({
  products,
  usdKrwRate,
  accintRates,
}: {
  products: Strucprdp[];
  usdKrwRate: number;
  accintRates: Record<string, { couponRate: number | null; fundRate: number | null }>;
}) {
  const [selected, setSelected] = useState<{ eff_dt: string; curr: string } | null>(null);

  return (
    <>
      <StrucprdpTable
        products={products}
        usdKrwRate={usdKrwRate}
        accintRates={accintRates}
        onRowClick={(eff_dt, curr) => setSelected({ eff_dt, curr })}
      />
      {selected && (
        <MTMModal
          eff_dt={selected.eff_dt}
          curr={selected.curr}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
