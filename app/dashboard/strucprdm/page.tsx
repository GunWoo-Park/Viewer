import { Suspense } from 'react';
import { Metadata } from 'next';
import Search from '@/app/ui/search';
import CallFilter from '@/app/ui/strucprdm/call-filter';
import SummaryCards from '@/app/ui/strucprdm/summary-cards';
import DistributionCharts from '@/app/ui/strucprdm/distribution-charts';
import StrucprdmTable from '@/app/ui/strucprdm/table';
import {
  SummaryCardsSkeleton,
  DistributionChartsSkeleton,
  TableSkeleton,
} from '@/app/ui/strucprdm/skeletons';
import { fetchStrucprdpSummary, fetchLatestAccintRates } from '@/app/lib/data';

export const metadata: Metadata = {
  title: '구조화 상품',
};

export default async function StrucprdmPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    callFilter?: string;
  };
}) {
  const query = searchParams?.query || '';
  const callFilter = searchParams?.callFilter || 'N';

  return (
    <div className="w-full">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">구조화 상품 현황</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          FICC 구조화 상품 포트폴리오 대시보드 — 상품 구조, 거래상대방, 유형별 분포를 한눈에 확인할 수 있습니다.
        </p>
      </div>

      {/* 요약 카드 */}
      <Suspense fallback={<SummaryCardsSkeleton />}>
        <SummaryCardsWrapper />
      </Suspense>

      {/* 분포 차트 */}
      <div className="mt-6">
        <Suspense fallback={<DistributionChartsSkeleton />}>
          <DistributionChartsWrapper />
        </Suspense>
      </div>

      {/* 상품 목록 */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">상품 목록</h2>
        <div className="flex items-center justify-between gap-2">
          <Search placeholder="상품코드, 거래상대방, 유형, 통화로 검색..." />
          <CallFilter />
        </div>
        <Suspense key={query + callFilter} fallback={<TableSkeleton />}>
          <StrucprdmTableWrapper query={query} callFilter={callFilter} />
        </Suspense>
      </div>
    </div>
  );
}

// 요약 카드 서버 컴포넌트 래퍼
async function SummaryCardsWrapper() {
  const summary = await fetchStrucprdpSummary();
  if (!summary) {
    return (
      <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
        <p className="text-sm text-yellow-700">
          구조화 상품 데이터를 불러올 수 없습니다. <code className="bg-yellow-100 px-1 rounded">pnpm seed:ficc</code>로 데이터를 시드해주세요.
        </p>
      </div>
    );
  }
  return <SummaryCards summary={summary} />;
}

// 분포 차트 서버 컴포넌트 래퍼
async function DistributionChartsWrapper() {
  const summary = await fetchStrucprdpSummary();
  if (!summary) return null;
  return <DistributionCharts summary={summary} />;
}

// 테이블 서버 컴포넌트 래퍼 (환율 + 쿠폰/펀딩 금리 전달)
async function StrucprdmTableWrapper({
  query,
  callFilter,
}: {
  query: string;
  callFilter: string;
}) {
  const [summary, accintRates] = await Promise.all([
    fetchStrucprdpSummary(),
    fetchLatestAccintRates(),
  ]);
  const usdKrwRate = summary?.usdKrwRate ?? 1450;
  return (
    <StrucprdmTable
      query={query}
      currentPage={1}
      callFilter={callFilter}
      usdKrwRate={usdKrwRate}
      accintRates={accintRates}
    />
  );
}
