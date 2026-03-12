'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * 기준일 선택 드롭다운
 * - dates: 'MM/DD' 형식 배열 (최신순)
 * - dateFull: 'YYYYMMDD' 형식 배열 (dates와 1:1 대응)
 * - current: 현재 선택된 YYYYMMDD (없으면 최신)
 */
export function DateSelector({
  dates,
  dateFull,
  current,
}: {
  dates: string[];
  dateFull: string[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val === dateFull[0]) {
      // 최신일이면 파라미터 제거
      params.delete('date');
    } else {
      params.set('date', val);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  };

  // 표시용 포맷: YYYY-MM-DD
  const fmtDisplay = (full: string) =>
    `${full.slice(0, 4)}-${full.slice(4, 6)}-${full.slice(6, 8)}`;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">기준일</span>
      <select
        value={current}
        onChange={handleChange}
        className="bg-transparent text-sm font-mono font-semibold text-gray-700 dark:text-gray-200 border-none outline-none cursor-pointer appearance-none pr-4"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0 center',
        }}
      >
        {dateFull.map((full, i) => (
          <option key={full} value={full}>
            {fmtDisplay(full)}{i === 0 ? ' (최신)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
