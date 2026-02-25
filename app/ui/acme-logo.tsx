export default function AcmeLogo() {
  return (
    <div className="flex items-center gap-1.5 select-none">
      {/* 아이콘 마크 */}
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
        <svg
          className="h-4 w-4 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      </div>
      {/* 텍스트 */}
      <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
        FICC
      </span>
    </div>
  );
}
