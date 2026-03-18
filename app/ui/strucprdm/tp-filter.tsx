'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

/**
 * 스왑 유형 필터
 * - 'ASSET' (기본): 자산(원천) / MTM헤지 / 캐리연속
 * - 'SELF': 자체발행만
 * - 'ALL': 전체
 */
export default function TpFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const current = searchParams.get('tpFilter') || 'ASSET';

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'ASSET') {
      params.delete('tpFilter');
    } else {
      params.set('tpFilter', value);
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="tp-filter"
        className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap"
      >
        스왑 유형
      </label>
      <select
        id="tp-filter"
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-[9px] px-3 text-sm outline-2 cursor-pointer"
      >
        <option value="ASSET">G.BTB</option>
        <option value="SELF">자체발행</option>
        <option value="ALL">전체</option>
      </select>
    </div>
  );
}
