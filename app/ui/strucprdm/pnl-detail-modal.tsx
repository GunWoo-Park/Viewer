// PnL 상세 모달 — KIS/KAP 가격 시계열 + 실쿠폰 유출입 내역
'use client';

import { useEffect, useState, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PnlDetailData } from '@/app/lib/definitions';

function formatDate(dt: string): string {
  if (!dt || dt.length !== 8) return dt || '-';
  return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
}

function fmtAmt(v: number): string {
  const b = v / 100000000;
  if (Math.abs(b) >= 1) {
    return `${b >= 0 ? '+' : ''}${b.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  }
  const m = v / 10000;
  return `${m >= 0 ? '+' : ''}${m.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
}

function amtColor(v: number): string {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-gray-500 dark:text-gray-400';
}

// 간단한 SVG 라인 차트
function MiniPriceChart({
  data,
}: {
  data: { std_dt: string; kis_prc: number; kap_prc: number; avg_prc: number }[];
}) {
  if (data.length < 2) return <p className="text-xs text-gray-400">데이터 부족</p>;

  const W = 700;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 30, left: 70 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  // 모든 값 중 min/max
  const allVals = data.flatMap((d) => [d.kis_prc, d.kap_prc, d.avg_prc]);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * cW;
  const yScale = (v: number) => PAD.top + cH - ((v - minV) / range) * cH;

  const makeLine = (key: 'kis_prc' | 'kap_prc' | 'avg_prc') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d[key])}`).join(' ');

  // Y축 눈금 (5개)
  const yTicks = Array.from({ length: 5 }, (_, i) => minV + (range / 4) * i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Y축 그리드 */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)}
            stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeDasharray="4" />
          <text x={PAD.left - 8} y={yScale(v) + 4} textAnchor="end"
            className="fill-gray-400 dark:fill-gray-500" fontSize="9">
            {(v / 100000000).toFixed(1)}억
          </text>
        </g>
      ))}

      {/* KIS 라인 (파랑) */}
      <path d={makeLine('kis_prc')} fill="none" stroke="#3B82F6" strokeWidth="1.5" opacity="0.7" />
      {/* KAP 라인 (주황) */}
      <path d={makeLine('kap_prc')} fill="none" stroke="#F97316" strokeWidth="1.5" opacity="0.7" />
      {/* AVG 라인 (흰색/두껍게) */}
      <path d={makeLine('avg_prc')} fill="none" stroke="#A78BFA" strokeWidth="2.5" />

      {/* 범례 */}
      <g transform={`translate(${PAD.left + 10}, ${PAD.top})`}>
        <rect x="0" y="-2" width="14" height="3" fill="#3B82F6" rx="1" opacity="0.7" />
        <text x="18" y="2" fontSize="9" className="fill-gray-500 dark:fill-gray-400">KIS</text>
        <rect x="50" y="-2" width="14" height="3" fill="#F97316" rx="1" opacity="0.7" />
        <text x="68" y="2" fontSize="9" className="fill-gray-500 dark:fill-gray-400">KAP</text>
        <rect x="100" y="-2" width="14" height="3" fill="#A78BFA" rx="1" />
        <text x="118" y="2" fontSize="9" className="fill-gray-500 dark:fill-gray-400">AVG</text>
      </g>

      {/* X축 날짜 (시작/중간/끝) */}
      {[0, Math.floor(data.length / 2), data.length - 1].map((idx) => (
        <text key={idx} x={xScale(idx)} y={H - 8} textAnchor="middle"
          className="fill-gray-400 dark:fill-gray-500" fontSize="9">
          {formatDate(data[idx].std_dt).slice(5)}
        </text>
      ))}
    </svg>
  );
}

export default function PnlDetailModal({
  objCd,
  onClose,
}: {
  objCd: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<PnlDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/pnl-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ obj_cd: objCd }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('조회 실패');
        return res.json();
      })
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [objCd]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose],
  );
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Daily PnL 계산
  const dailyMtmPnl =
    data && data.mtm_series.length >= 2
      ? data.mtm_series[data.mtm_series.length - 1].avg_prc -
        data.mtm_series[data.mtm_series.length - 2].avg_prc
      : 0;

  const latestDate =
    data && data.mtm_series.length > 0
      ? data.mtm_series[data.mtm_series.length - 1].std_dt
      : '';

  // 쿠폰 합산 (최근일)
  const latestCoupon =
    data && latestDate
      ? data.coupons
          .filter((c) => c.pay_dt === latestDate)
          .reduce((sum, c) => sum + c.amt, 0)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              PnL 상세 — {objCd}
            </h2>
            {data && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {data.cntr_nm} · {data.curr}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-700 dark:text-red-300">오류: {error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Daily PnL 요약 */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">MTM 변동</p>
                  <p className={`text-lg font-bold font-mono ${amtColor(dailyMtmPnl)}`}>
                    {fmtAmt(dailyMtmPnl)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">쿠폰 유출입</p>
                  <p className={`text-lg font-bold font-mono ${amtColor(latestCoupon)}`}>
                    {latestCoupon !== 0 ? fmtAmt(latestCoupon) : '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total PnL</p>
                  <p className={`text-lg font-bold font-mono ${amtColor(dailyMtmPnl + latestCoupon)}`}>
                    {fmtAmt(dailyMtmPnl + latestCoupon)}
                  </p>
                </div>
              </div>

              {/* KIS/KAP/AVG 차트 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  MTM 가격 추이 (KIS / KAP / AVG)
                </h3>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
                  <MiniPriceChart data={data.mtm_series} />
                </div>
              </div>

              {/* MTM 최근 가격 테이블 (최근 10일) */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  최근 MTM 가격
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr className="text-gray-500 dark:text-gray-400">
                        <th className="px-3 py-2 text-left">기준일</th>
                        <th className="px-3 py-2 text-right">KIS</th>
                        <th className="px-3 py-2 text-right">KAP</th>
                        <th className="px-3 py-2 text-right font-semibold">AVG</th>
                        <th className="px-3 py-2 text-right">일간변동</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {data.mtm_series.slice(-10).reverse().map((d, i, arr) => {
                        const prevIdx = i + 1;
                        const daily = prevIdx < arr.length ? d.avg_prc - arr[prevIdx].avg_prc : 0;
                        return (
                          <tr key={d.std_dt} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{formatDate(d.std_dt)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-blue-600 dark:text-blue-400">
                              {(d.kis_prc / 100000000).toFixed(1)}억
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-orange-600 dark:text-orange-400">
                              {(d.kap_prc / 100000000).toFixed(1)}억
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                              {(d.avg_prc / 100000000).toFixed(1)}억
                            </td>
                            <td className={`px-3 py-1.5 text-right font-mono ${amtColor(daily)}`}>
                              {i < arr.length - 1 ? fmtAmt(daily) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 쿠폰 유출입 내역 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  실쿠폰 유출입 내역
                </h3>
                {data.coupons.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">쿠폰 내역 없음</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr className="text-gray-500 dark:text-gray-400">
                          <th className="px-3 py-2 text-left">지급일</th>
                          <th className="px-3 py-2 text-left">유형</th>
                          <th className="px-3 py-2 text-left">통화</th>
                          <th className="px-3 py-2 text-right">금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.coupons.map((c, i) => (
                          <tr key={`${c.pay_dt}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{formatDate(c.pay_dt)}</td>
                            <td className="px-3 py-1.5">
                              <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {c.tp}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{c.curr}</td>
                            <td className={`px-3 py-1.5 text-right font-mono ${amtColor(c.amt)}`}>
                              {fmtAmt(c.amt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
