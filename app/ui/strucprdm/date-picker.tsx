'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * 영업일 기준 날짜 선택기
 * - 드롭다운에서 breakdownprc 가용 날짜 중 선택
 * - 좌/우 화살표로 이전/다음 영업일 이동
 * - 미선택(빈값)이면 최신일 기준
 */
export default function DatePicker({ availableDates }: { availableDates: string[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // URL에서 현재 날짜 읽기 (기본값: 빈값 = 최신일)
  const currentDate = searchParams.get('pnlDate') || '';
  // 실제 선택된 날짜 (빈값이면 첫번째=최신일)
  const effectiveDate = currentDate || (availableDates.length > 0 ? availableDates[0] : '');
  const currentIdx = availableDates.indexOf(effectiveDate);

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (!value || value === availableDates[0]) {
      // 최신일이면 URL에서 제거 (깔끔한 URL 유지)
      params.delete('pnlDate');
    } else {
      params.set('pnlDate', value);
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const goPrev = () => {
    if (currentIdx < availableDates.length - 1) {
      handleChange(availableDates[currentIdx + 1]);
    }
  };

  const goNext = () => {
    if (currentIdx > 0) {
      handleChange(availableDates[currentIdx - 1]);
    }
  };

  // YYYYMMDD → YYYY-MM-DD (요일) 포맷
  const fmtDate = (dt: string) => {
    if (dt.length !== 8) return dt;
    const d = new Date(`${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)} (${days[d.getDay()]})`;
  };

  if (availableDates.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
      <button
        onClick={goPrev}
        disabled={currentIdx >= availableDates.length - 1}
        className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="이전 영업일"
      >
        <ChevronLeftIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
      <select
        value={effectiveDate}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-1 px-2 text-sm font-mono outline-2 cursor-pointer min-w-[130px]"
      >
        {availableDates.map((dt) => (
          <option key={dt} value={dt}>
            {fmtDate(dt)}
          </option>
        ))}
      </select>
      <button
        onClick={goNext}
        disabled={currentIdx <= 0}
        className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="다음 영업일"
      >
        <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
      {currentDate && (
        <button
          onClick={() => handleChange('')}
          className="ml-1 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400"
        >
          최신
        </button>
      )}
    </div>
  );
}
