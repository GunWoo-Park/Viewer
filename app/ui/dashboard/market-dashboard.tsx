'use client';

import React, { useState } from 'react';
import { lusitana } from '@/app/ui/fonts';
import type { MarketDailyData } from '@/app/lib/market-data';

interface MarketDashboardProps {
  data: MarketDailyData;
}

// 변동 색상 헬퍼
function changeColor(val: number) {
  if (val > 0) return 'text-red-500';
  if (val < 0) return 'text-blue-500';
  return 'text-gray-500 dark:text-gray-400';
}

function changeSign(val: number) {
  if (val > 0) return '+';
  return '';
}

function formatBp(val: number) {
  if (val === 0) return '-';
  return `${changeSign(val)}${val.toFixed(1)}`;
}

export default function MarketDashboard({ data }: MarketDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rates' | 'credit'>('overview');

  const tabs = [
    { key: 'overview' as const, label: '📊 시장 개요' },
    { key: 'rates' as const, label: '📈 금리/스왑' },
    { key: 'credit' as const, label: '🏦 크레딧 커브' },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className={`${lusitana.className} text-xl md:text-2xl`}>
          📅 기준일: {data.date} ({data.dayOfWeek})
        </h2>
      </div>

      {/* 주요 지수 카드 (항상 표시) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {data.stocks.map((s) => (
          <div
            key={s.name}
            className="rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              {s.name}
            </p>
            <p className={`${lusitana.className} mt-1 text-lg font-bold text-gray-800 dark:text-gray-100`}>
              {s.level.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs font-medium ${changeColor(s.change)}`}>
              {changeSign(s.change)}{s.change.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {' '}
              ({changeSign(s.changePercent)}{s.changePercent.toFixed(2)}%)
            </p>
          </div>
        ))}
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'rates' && <RatesTab data={data} />}
        {activeTab === 'credit' && <CreditTab data={data} />}
      </div>
    </div>
  );
}

// --- 시장 개요 탭 ---
function OverviewTab({ data }: { data: MarketDailyData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 미국채 금리 */}
      <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          🇺🇸 미국채 금리 (Bloomberg)
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="py-2 text-left">만기</th>
              <th className="py-2 text-right">금리 (%)</th>
              <th className="py-2 text-right">변동 (bp)</th>
            </tr>
          </thead>
          <tbody>
            {data.usTreasury.map((u) => (
              <tr key={u.tenor} className="border-b dark:border-gray-800">
                <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{u.tenor}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{u.level.toFixed(3)}</td>
                <td className={`py-2 text-right font-medium ${changeColor(-u.change)}`}>
                  {formatBp(u.change)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CD/통안/국고/회사채 */}
      <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          🇰🇷 국내 채권 금리
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="py-2 text-left">구분</th>
              <th className="py-2 text-right">금리 (%)</th>
              <th className="py-2 text-right">변동 (bp)</th>
            </tr>
          </thead>
          <tbody>
            {data.bonds.map((b) => (
              <tr key={b.name} className="border-b dark:border-gray-800">
                <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{b.name}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{b.level.toFixed(3)}</td>
                <td className={`py-2 text-right font-medium ${changeColor(b.change)}`}>
                  {formatBp(b.change)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 이동평균 */}
      <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm lg:col-span-2">
        <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          📉 주요지표 이동평균
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-2 text-left">기간</th>
                <th className="py-2 text-right">통안 1Y</th>
                <th className="py-2 text-right">통안 2Y</th>
                <th className="py-2 text-right">국고 3Y</th>
                <th className="py-2 text-right">국고 5Y</th>
                <th className="py-2 text-right">국고 10Y</th>
              </tr>
            </thead>
            <tbody>
              {data.movingAverages.map((m) => (
                <tr key={m.period} className="border-b dark:border-gray-800">
                  <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{m.period}</td>
                  <td className="py-2 text-right text-gray-800 dark:text-gray-100">{m.tongAn1Y ? m.tongAn1Y.toFixed(4) : '-'}</td>
                  <td className="py-2 text-right text-gray-800 dark:text-gray-100">{m.tongAn2Y ? m.tongAn2Y.toFixed(4) : '-'}</td>
                  <td className="py-2 text-right text-gray-800 dark:text-gray-100">{m.gov3Y ? m.gov3Y.toFixed(4) : '-'}</td>
                  <td className="py-2 text-right text-gray-800 dark:text-gray-100">{m.gov5Y ? m.gov5Y.toFixed(4) : '-'}</td>
                  <td className="py-2 text-right text-gray-800 dark:text-gray-100">{m.gov10Y ? m.gov10Y.toFixed(4) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- 금리/스왑 탭 ---
function RatesTab({ data }: { data: MarketDailyData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* IRS */}
      <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          IRS (mid)
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="py-2 text-left">만기</th>
              <th className="py-2 text-right">금리 (%)</th>
              <th className="py-2 text-right">변동 (bp)</th>
            </tr>
          </thead>
          <tbody>
            {data.irs.map((i) => (
              <tr key={i.tenor} className="border-b dark:border-gray-800">
                <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{i.tenor}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{i.rate.toFixed(4)}</td>
                <td className={`py-2 text-right font-medium ${changeColor(i.change)}`}>
                  {formatBp(i.change)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CRS */}
      <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          CRS (mid)
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="py-2 text-left">만기</th>
              <th className="py-2 text-right">금리 (%)</th>
              <th className="py-2 text-right">변동 (bp)</th>
            </tr>
          </thead>
          <tbody>
            {data.crs.map((c) => (
              <tr key={c.tenor} className="border-b dark:border-gray-800">
                <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{c.tenor}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{c.rate.toFixed(3)}</td>
                <td className={`py-2 text-right font-medium ${changeColor(c.change)}`}>
                  {formatBp(c.change)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bond-Swap Spread */}
      <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm lg:col-span-2">
        <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
          Bond-Swap Spread
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="py-2 text-left">구분</th>
              <th className="py-2 text-right">IRS</th>
              <th className="py-2 text-right">Spread (bp)</th>
            </tr>
          </thead>
          <tbody>
            {data.spreads.map((s) => (
              <tr key={s.name} className="border-b dark:border-gray-800">
                <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{s.name}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{s.irs ? s.irs.toFixed(4) : '-'}</td>
                <td className={`py-2 text-right font-medium ${changeColor(s.sp)}`}>
                  {s.sp ? s.sp.toFixed(2) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 크레딧 커브 탭 ---
function CreditTab({ data }: { data: MarketDailyData }) {
  const tenors = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y', '20Y'];

  return (
    <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">
        🏦 크레딧 커브 (3사 기준)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="py-2 text-left min-w-[100px]">구분</th>
              {tenors.map((t) => (
                <th key={t} className="py-2 text-right min-w-[60px]">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.creditSpreads.map((c) => (
              <tr key={c.name} className="border-b dark:border-gray-800">
                <td className="py-2 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {c.name}
                </td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{c.y3M ? c.y3M.toFixed(3) : '-'}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{c.y6M ? c.y6M.toFixed(3) : '-'}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{c.y1Y ? c.y1Y.toFixed(3) : '-'}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{c.y2Y ? c.y2Y.toFixed(3) : '-'}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{c.y3Y ? c.y3Y.toFixed(3) : '-'}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{c.y5Y ? c.y5Y.toFixed(3) : '-'}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{c.y10Y ? c.y10Y.toFixed(3) : '-'}</td>
                <td className="py-2 text-right text-gray-800 dark:text-gray-100">{c.y20Y ? c.y20Y.toFixed(3) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
