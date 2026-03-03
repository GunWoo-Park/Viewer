'use client';

import { useEffect, useState, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { MTMGroupData } from '@/app/lib/definitions';
import MTMTimeSeriesChart from './mtm-chart';

// TP 뱃지 색상
const TP_BADGE: Record<string, string> = {
  자산: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  MTM: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  캐리: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  자체발행: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300',
};

function formatDate(dt: string): string {
  if (!dt || dt.length !== 8) return dt || '-';
  return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
}

function formatKRW(amount: number): string {
  const b = amount / 100000000;
  return `${b.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억`;
}

function formatUSD(amount: number): string {
  const m = amount / 1000000;
  return `$${m.toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
}

function fmtMtm(v: number): string {
  const b = v / 100000000;
  return `${b >= 0 ? '+' : ''}${b.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
}

function mtmColor(v: number): string {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-gray-500 dark:text-gray-400';
}

export default function MTMModal({
  eff_dt,
  curr,
  onClose,
}: {
  eff_dt: string;
  curr: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<MTMGroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/mtm-timeseries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eff_dt, curr }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('데이터 조회 실패');
        return res.json();
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eff_dt, curr]);

  // ESC 키로 닫기
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 그룹 유형 판별
  const groupType =
    data && data.products.length >= 3
      ? '자산→MTM→캐리'
      : '자산→MTM';

  // 최근 통합 MTM
  const latestCombined =
    data && data.combined_mtm.length > 0
      ? data.combined_mtm[data.combined_mtm.length - 1].avg_prc
      : 0;

  // 전일 통합 MTM
  const prevCombined =
    data && data.combined_mtm.length > 1
      ? data.combined_mtm[data.combined_mtm.length - 2].avg_prc
      : 0;
  const dailyChange = latestCombined - prevCombined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              MTM 시계열
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                유효일 {formatDate(eff_dt)}
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  curr === 'KRW'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300'
                }`}
              >
                {curr}
              </span>
              {data && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {groupType} · {data.products.length}종목
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                오류: {error}
              </p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* 통합 MTM 요약 */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    통합 MTM (최근)
                  </p>
                  <p
                    className={`text-lg font-bold font-mono ${mtmColor(latestCombined)}`}
                  >
                    {fmtMtm(latestCombined)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    일간 변동
                  </p>
                  <p
                    className={`text-lg font-bold font-mono ${mtmColor(dailyChange)}`}
                  >
                    {fmtMtm(dailyChange)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    데이터 기간
                  </p>
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {data.combined_mtm.length > 0 && (
                      <>
                        {formatDate(data.combined_mtm[0].std_dt)} ~{' '}
                        {formatDate(
                          data.combined_mtm[data.combined_mtm.length - 1]
                            .std_dt,
                        )}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {data.combined_mtm.length}영업일
                  </p>
                </div>
              </div>

              {/* 차트 */}
              <div className="mb-6">
                <MTMTimeSeriesChart data={data} />
              </div>

              {/* 상품 구성 테이블 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  상품 구성
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
                        <th className="py-2 px-3 text-left font-medium">
                          종목코드
                        </th>
                        <th className="py-2 px-3 text-left font-medium">TP</th>
                        <th className="py-2 px-3 text-left font-medium">
                          거래상대방
                        </th>
                        <th className="py-2 px-3 text-right font-medium">
                          명목금액
                        </th>
                        <th className="py-2 px-3 text-right font-medium">
                          최근 MTM
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p) => {
                        const latestMtm =
                          p.mtm_data.length > 0
                            ? p.mtm_data[p.mtm_data.length - 1].avg_prc
                            : 0;
                        return (
                          <tr
                            key={p.obj_cd}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="py-2 px-3 font-mono text-xs text-blue-700 dark:text-blue-400">
                              {p.obj_cd}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                  TP_BADGE[p.tp] ||
                                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {p.tp}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                              {p.cntr_nm}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                              {curr === 'KRW'
                                ? formatKRW(p.notn)
                                : formatUSD(p.notn)}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono text-xs font-medium ${mtmColor(latestMtm)}`}
                            >
                              {fmtMtm(latestMtm)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
