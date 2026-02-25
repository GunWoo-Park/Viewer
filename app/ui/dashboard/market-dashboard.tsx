'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MarketDailyData } from '@/app/lib/market-data';
import { TradingProvider, useTradingContext } from '@/app/lib/trading-context';

// 섹션 컴포넌트
import TickerBar from '@/app/ui/trading/ticker-bar';
import EquitySection from '@/app/ui/trading/sections/equity-section';
import CurrenciesSection from '@/app/ui/trading/sections/currencies-section';
import FixedIncomeSection from '@/app/ui/trading/sections/fixed-income-section';
import SwapsSection from '@/app/ui/trading/sections/swaps-section';
import CreditCurveSection from '@/app/ui/trading/sections/credit-curve-section';
import FuturesSection from '@/app/ui/trading/sections/futures-section';
import BondLendingSection from '@/app/ui/trading/sections/bond-lending-section';
import MacroCalendarSection from '@/app/ui/trading/sections/macro-calendar-section';
import YieldCurveChart from '@/app/ui/trading/charts/yield-curve';

interface MarketDashboardProps {
  data: MarketDailyData;
  availableDates: string[];
}

// 색상 모드 토글 버튼
function ColorModeToggle() {
  const { isKorean, toggleColorMode } = useTradingContext();
  return (
    <button
      onClick={toggleColorMode}
      className="rounded border border-terminal-border px-2.5 py-1 text-[10px] font-medium text-gray-400 transition-colors hover:border-terminal-border-light hover:text-gray-200"
      title="색상 모드 전환"
    >
      {isKorean ? '🇰🇷 KR' : '🌍 Global'}
    </button>
  );
}

// 티커바 데이터 준비
function buildTickerItems(data: MarketDailyData) {
  const items = [];

  // FX
  for (const s of data.stocks) {
    if (s.name === 'USD/KRW' || s.name === 'JPY/USD') {
      items.push({
        label: s.name,
        value: s.level,
        change: s.change,
        changePercent: s.changePercent,
        digits: s.name === 'USD/KRW' ? 2 : 4,
      });
    }
  }

  // 주요 주가지수
  for (const s of data.stocks) {
    if (s.name === 'KOSPI' || s.name === 'S&P 500') {
      items.push({
        label: s.name,
        value: s.level,
        change: s.change,
        changePercent: s.changePercent,
        digits: 2,
      });
    }
  }

  // 미국채 10Y
  const us10y = data.usTreasury.find((u) => u.tenor === '10Y');
  if (us10y) {
    items.push({
      label: 'UST 10Y',
      value: us10y.level,
      change: us10y.change,
      digits: 3,
    });
  }

  // 국고 3년
  const ktb3y = data.bonds.find((b) => b.name === '국고 3년');
  if (ktb3y) {
    items.push({
      label: '국고3Y',
      value: ktb3y.level,
      change: ktb3y.change,
      digits: 3,
    });
  }

  // VIX / MOVE / DXY (목업)
  items.push(
    { label: 'VIX', value: 0, change: 0, digits: 2 },
    { label: 'MOVE', value: 0, change: 0, digits: 2 },
    { label: 'DXY', value: 0, change: 0, digits: 2 },
  );

  return items;
}

function DashboardInner({ data, availableDates }: MarketDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentIdx = availableDates.indexOf(data.date);

  const goToDate = (date: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', date);
    router.push(`/dashboard/market?${params.toString()}`);
  };

  const goPrev = () => {
    if (currentIdx < availableDates.length - 1) {
      goToDate(availableDates[currentIdx + 1]);
    }
  };

  const goNext = () => {
    if (currentIdx > 0) {
      goToDate(availableDates[currentIdx - 1]);
    }
  };

  const goLatest = () => {
    if (availableDates.length > 0) {
      goToDate(availableDates[0]);
    }
  };

  const tickerItems = buildTickerItems(data);

  return (
    <div className="space-y-3 bg-terminal-bg min-h-screen -m-6 p-4">
      {/* 탑 티커바 */}
      <TickerBar items={tickerItems} />

      {/* 헤더: 날짜 + 컨트롤 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-trading text-sm font-bold text-gray-200 tabular-nums">
            {data.date} ({data.dayOfWeek})
          </h2>
          <ColorModeToggle />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={goPrev}
            disabled={currentIdx >= availableDates.length - 1}
            className="rounded border border-terminal-border px-2.5 py-1 text-xs text-gray-400 hover:bg-terminal-card hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ◀
          </button>

          <select
            value={data.date}
            onChange={(e) => goToDate(e.target.value)}
            className="rounded border border-terminal-border bg-terminal-card px-2 py-1 font-trading text-xs text-gray-300 tabular-nums focus:border-trading-blue focus:outline-none"
          >
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button
            onClick={goNext}
            disabled={currentIdx <= 0}
            className="rounded border border-terminal-border px-2.5 py-1 text-xs text-gray-400 hover:bg-terminal-card hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ▶
          </button>

          <button
            onClick={goLatest}
            disabled={currentIdx === 0}
            className="rounded border border-trading-blue/50 px-2.5 py-1 text-xs text-trading-blue hover:bg-trading-blue/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Latest
          </button>
        </div>
      </div>

      {/* 카드 그리드 레이아웃 */}
      <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {/* 1행: 주가지수 + 환율 */}
        <div className="lg:col-span-2 xl:col-span-3">
          <EquitySection stocks={data.stocks} />
        </div>
        <div>
          <CurrenciesSection stocks={data.stocks} />
        </div>

        {/* 2행: 채권 + 스왑 */}
        <div className="lg:col-span-1 xl:col-span-2">
          <FixedIncomeSection
            usTreasury={data.usTreasury}
            bonds={data.bonds}
          />
        </div>
        <div className="lg:col-span-2 xl:col-span-2">
          <SwapsSection
            irs={data.irs}
            crs={data.crs}
            spreads={data.spreads}
          />
        </div>

        {/* 3행: 수익률 커브 차트 (전체 너비) */}
        <YieldCurveChart creditSpreads={data.creditSpreads} />

        {/* 4행: 크레딧 커브 매트릭스 (전체 너비) */}
        <CreditCurveSection creditSpreads={data.creditSpreads} />

        {/* 5행: 선물 + 대차 + 캘린더 */}
        <div className="lg:col-span-1 xl:col-span-2">
          <FuturesSection ktbFutures={data.ktbFutures} />
        </div>
        <div>
          <BondLendingSection bondLending={data.bondLending} />
        </div>
        <div>
          <MacroCalendarSection />
        </div>
      </div>
    </div>
  );
}

// Provider로 래핑하는 최상위 export
export default function MarketDashboard(props: MarketDashboardProps) {
  return (
    <TradingProvider>
      <DashboardInner {...props} />
    </TradingProvider>
  );
}
