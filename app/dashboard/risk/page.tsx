// app/dashboard/risk/page.tsx
import { lusitana } from '@/app/ui/fonts';

export default function RiskPage() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        RISK
      </h1>

      {/* 리스크 지표 요약 카드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            DV01 (원화)
          </p>
          <p
            className={`${lusitana.className} mt-1 text-2xl font-bold text-gray-700 dark:text-gray-200`}
          >
            —
          </p>
        </div>
        <div className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            DV01 (외화)
          </p>
          <p
            className={`${lusitana.className} mt-1 text-2xl font-bold text-gray-700 dark:text-gray-200`}
          >
            —
          </p>
        </div>
        <div className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            VaR (95%)
          </p>
          <p
            className={`${lusitana.className} mt-1 text-2xl font-bold text-gray-700 dark:text-gray-200`}
          >
            —
          </p>
        </div>
        <div className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Greeks (Delta)
          </p>
          <p
            className={`${lusitana.className} mt-1 text-2xl font-bold text-gray-700 dark:text-gray-200`}
          >
            —
          </p>
        </div>
      </div>

      {/* 금리 리스크 섹션 */}
      <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          금리 리스크 (Interest Rate Risk)
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            🚧 DV01 / Key Rate Duration
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>

      {/* 신용 리스크 섹션 */}
      <div className="mt-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          신용 리스크 (Credit Risk)
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            🚧 거래상대방 신용 노출
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>

      {/* 유동성 리스크 섹션 */}
      <div className="mt-6 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          유동성 리스크 (Liquidity Risk)
        </h2>
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-400 dark:text-gray-500">
            🚧 만기 구조 / Cash Flow 분석
          </p>
          <p className="mt-2 text-sm text-gray-300 dark:text-gray-600">
            데이터 소스 연동 후 구현 예정
          </p>
        </div>
      </div>
    </main>
  );
}
