'use client';

import { useState } from 'react';
import { Strucprdp, ProductDailyPnl } from '@/app/lib/definitions';
import StrucprdpTable from './table';
import MTMModal from './mtm-modal';
import PnlDetailModal from './pnl-detail-modal';

export default function ClickableStrucprdpTable({
  products,
  usdKrwRate,
  accintRates,
  pnlMap = {},
  marRates = {},
}: {
  products: Strucprdp[];
  usdKrwRate: number;
  accintRates: Record<string, { couponRate: number | null; fundRate: number | null }>;
  pnlMap?: Record<string, ProductDailyPnl>;
  marRates?: Record<string, number>;
}) {
  const [selected, setSelected] = useState<{ eff_dt: string; curr: string } | null>(null);
  const [pnlObjCd, setPnlObjCd] = useState<string | null>(null);

  return (
    <>
      <StrucprdpTable
        products={products}
        usdKrwRate={usdKrwRate}
        accintRates={accintRates}
        pnlMap={pnlMap}
        marRates={marRates}
        onRowClick={(eff_dt, curr) => setSelected({ eff_dt, curr })}
        onPnlClick={(objCd) => setPnlObjCd(objCd)}
      />
      {selected && (
        <MTMModal
          eff_dt={selected.eff_dt}
          curr={selected.curr}
          onClose={() => setSelected(null)}
        />
      )}
      {pnlObjCd && (
        <PnlDetailModal
          objCd={pnlObjCd}
          onClose={() => setPnlObjCd(null)}
        />
      )}
    </>
  );
}
