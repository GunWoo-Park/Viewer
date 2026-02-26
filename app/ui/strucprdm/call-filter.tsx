'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

/**
 * Call 여부 필터 콤보박스
 * - 'N' (기본값): 조기종료되지 않은 종목만 표시
 * - 'Y': 조기종료된 종목만 표시
 * - 'ALL': 전체 표시
 */
export default function CallFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // URL에서 현재 필터값 읽기 (기본값: 'N')
  const currentFilter = searchParams.get('callFilter') || 'N';

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1'); // 필터 변경 시 첫 페이지로 이동

    if (value === 'N') {
      // 기본값이면 URL에서 제거 (깔끔한 URL 유지)
      params.delete('callFilter');
    } else {
      params.set('callFilter', value);
    }

    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="call-filter"
        className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap"
      >
        Call 여부
      </label>
      <select
        id="call-filter"
        value={currentFilter}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-[9px] px-3 text-sm outline-2 cursor-pointer"
      >
        <option value="N">Alive</option>
        <option value="Y">Dead</option>
        <option value="ALL">전체</option>
      </select>
    </div>
  );
}
