'use client'; // 탭 전환을 위해 클라이언트 컴포넌트로 선언

import React, { useState } from 'react';
import { lusitana } from '@/app/ui/fonts';
import { BTBDashboardData } from '@/app/lib/definitions';

interface BTBDashboardProps {
  data: BTBDashboardData;
}

export default function BTBDashboard({ data }: BTBDashboardProps) {
  const [activeTab, setActiveTab] = useState('pnl');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`${lusitana.className} text-xl md:text-2xl`}>
          📅 기준일: {data.latestDate}
        </h2>
      </div>

      {/* KPI 섹션 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="전체 운용 잔고"
          value={`${(data.totalBalance / 100000000).toLocaleString(undefined, { maximumFractionDigits: 0 })} 억`}
        />
        <KpiCard
          title="자산 잔고"
          value={`${(data.assetBalance / 100000000).toLocaleString(undefined, { maximumFractionDigits: 0 })} 억`}
        />
        <KpiCard
          title="부채 잔고"
          value={`${(data.liabilityBalance / 100000000).toLocaleString(undefined, { maximumFractionDigits: 0 })} 억`}
        />
        <KpiCard
          title="Daily PnL"
          value={data.dailyPnl.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
          isPnL
        />
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['pnl', 'risk', 'distribution'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab === 'pnl'
                ? '💰 손익(PnL) 상세'
                : tab === 'risk'
                  ? '⚠️ 리스크 관리'
                  : '📉 분포 분석'}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[300px] rounded-xl border bg-white p-6 shadow-sm">
        {activeTab === 'pnl' && (
          <PnLSection pnlAttribution={data.pnlAttribution} />
        )}
        {activeTab === 'risk' && <PlaceholderSection label="리스크 관리" />}
        {activeTab === 'distribution' && (
          <PlaceholderSection label="분포 분석" />
        )}
      </div>
    </div>
  );
}

// --- 서브 컴포넌트들 ---

function KpiCard({
  title,
  value,
  isPnL = false,
}: {
  title: string;
  value: string;
  isPnL?: boolean;
}) {
  const numVal = parseFloat(value.replace(/,/g, ''));
  const pnlColor =
    isPnL && !isNaN(numVal)
      ? numVal < 0
        ? 'text-red-600'
        : 'text-blue-600'
      : '';

  return (
    <div className="rounded-xl border bg-gray-50 p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p
        className={`${lusitana.className} mt-1 text-2xl font-bold ${pnlColor}`}
      >
        {value}
      </p>
    </div>
  );
}

function PnLSection({
  pnlAttribution,
}: {
  pnlAttribution: { name: string; daily_pnl: number }[];
}) {
  return (
    <div>
      <h3 className="mb-4 font-semibold text-gray-700">
        PnL Attribution Breakdown
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 font-medium uppercase text-gray-500">
            <tr>
              <th className="border-b px-4 py-3">항목</th>
              <th className="border-b px-4 py-3 text-right">Daily PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pnlAttribution.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-400">
                  해당 기준일의 PnL 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              pnlAttribution.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{item.name}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      item.daily_pnl < 0 ? 'text-red-500' : 'text-blue-600'
                    }`}
                  >
                    {item.daily_pnl.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlaceholderSection({ label }: { label: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
      <p className="text-lg font-medium text-gray-400">🚧 {label}</p>
      <p className="mt-2 text-sm text-gray-300">
        2차 구현 예정 (데이터 소스 확정 후 추가)
      </p>
    </div>
  );
}
