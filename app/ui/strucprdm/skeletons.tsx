// 구조화 상품 대시보드 스켈레톤 컴포넌트

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
          <div className="mt-3 h-7 w-20 rounded bg-gray-200" />
          <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function DistributionChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm animate-pulse">
          <div className="mb-4 h-5 w-40 rounded bg-gray-200" />
          <div className="space-y-3">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="flex-1 h-6 rounded-full bg-gray-100" />
                <div className="h-4 w-8 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-full">
          {/* 헤더 */}
          <div className="flex bg-gray-50 p-3 gap-3">
            {[80, 140, 60, 50, 90, 50, 80, 80, 90, 40, 200].map((w, i) => (
              <div key={i} className="h-4 rounded bg-gray-200" style={{ width: w }} />
            ))}
          </div>
          {/* 행 */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex border-b border-gray-100 p-3 gap-3">
              {[80, 140, 60, 50, 90, 50, 80, 80, 90, 40, 200].map((w, j) => (
                <div key={j} className="h-4 rounded bg-gray-100" style={{ width: w }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
