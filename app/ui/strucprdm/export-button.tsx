'use client';

import { useSearchParams } from 'next/navigation';

export default function ExportButton() {
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';
  const callFilter = searchParams.get('callFilter') || 'N';
  const tpFilter = searchParams.get('tpFilter') || 'ASSET';

  const href = `/api/strucprdm-export?callFilter=${callFilter}&tpFilter=${tpFilter}&query=${encodeURIComponent(query)}`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-[9px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title="현재 필터 기준으로 엑셀 다운로드"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
      </svg>
      XLSX
    </a>
  );
}
