// app/dashboard/pnl/page.tsx
import { lusitana } from '@/app/ui/fonts';

export default function PnLPage() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        손익 (PnL)
      </h1>

      {/* PnL 요약 카드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Daily PnL
          </p>
          <p
            className={`${lusitana.className} mt-1 text-2xl font-bold text-gray-700 dark:text-gray-200`}
          >
            —
          </p>
        </div>
        <div className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            MTD PnL
          </p>
          <p
            className={`${lusitana.className} mt-1 text-2xl font-bold text-gray-700 dark:text-gray-200`}
          >
            —
          </p>
        </div>
        <div className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            YTD PnL
          </p>
          <p
            className={`${lusitana.className} mt-1 text-2xl font-bold text-gray-700 dark:text-gray-200`}
          >
            —
          </p>
        </div>
        <div className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Carry PnL
          </p>
          <p
            className={`${lusitana.className} mt-1 text-2xl font-bold text-gray-700 dark:text-gray-200`}
          >
            —
          </p>
        </div>
      </div>

      {/* PnL Attribution 테이블 플레이스홀더 */}
      <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          PnL Attribution Breakdown
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            🚧 손익 상세
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>

      {/* PnL 추이 차트 플레이스홀더 */}
      <div className="mt-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          PnL 추이
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            📈 일별 PnL 추이 차트
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>
    </main>
  );
}
