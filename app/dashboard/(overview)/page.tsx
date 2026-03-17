// app/dashboard/(overview)/page.tsx
// 요약 탭: 운용잔고, 캐리, PnL Attribution, Risk Delta 통합 뷰
// searchParams.date (YYYYMMDD)로 과거 기준일 선택 가능
import { lusitana } from '@/app/ui/fonts';
import {
  fetchStrucprdpSummary,
  fetchWeightedAvgCarry,
  fetchPnlTrend,
  computePnlSummaryCards,
  fetchPnlSummaryByTypeAllFunds,
  fetchRiskDelta,
  fetchGapAnalysis,
} from '@/app/lib/data';
import {
  WeeklyTypePnlChart,
  DeltaGaugeBar,
} from '@/app/ui/dashboard/overview-charts';
import { GapBubbleChart } from '@/app/ui/dashboard/gap-bubble-chart';
import { DateSelector } from '@/app/ui/dashboard/date-selector';

// 억 포맷
function fmtEok(v: number): string {
  const eok = v / 100000000;
  if (Math.abs(eok) >= 1) return `${eok.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  const man = v / 10000;
  if (Math.abs(man) >= 1) return `${man.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
  return v.toLocaleString('ko-KR');
}

// PnL 색상
function pnlColor(v: number): string {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-gray-500';
}
function pnlSign(v: number): string {
  return v > 0 ? '+' : v < 0 ? '' : '';
}

export default async function Page({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const selectedDate = searchParams?.date || '';

  const [summary, carry, pnlTrend, riskDelta, gapAnalysis] = await Promise.all([
    fetchStrucprdpSummary(),
    fetchWeightedAvgCarry(),
    fetchPnlTrend(),
    fetchRiskDelta(),
    fetchGapAnalysis(selectedDate || undefined),
  ]);

  // 사용 가능한 날짜 목록 (최신순, YYYYMMDD)
  const allDatesFull = [...pnlTrend.allDates].reverse();
  // trend의 date(MM/DD)와 dateFull(YYYYMMDD) 매핑
  const trendDates = pnlTrend.trend.map((t) => t.dateFull);

  // 선택된 기준일 결정
  const currentDate = selectedDate && allDatesFull.includes(selectedDate)
    ? selectedDate
    : allDatesFull[0] || '';

  // 선택된 날짜에 해당하는 trend index
  const trendIdx = pnlTrend.trend.findIndex((t) => t.dateFull === currentDate);
  const selectedTrend = trendIdx >= 0 ? pnlTrend.trend[trendIdx] : pnlTrend.trend[pnlTrend.trend.length - 1];

  // PnL 요약 카드: 선택 날짜까지 슬라이스
  const selectedMMDD = selectedTrend?.date || '';
  const pnlCards = computePnlSummaryCards(pnlTrend.trend, pnlTrend.carryTrend, selectedMMDD);

  // YTD MTM 괴리 = YTD PnL - YTD Carry PnL
  const ytdMtmGap = pnlCards.ytdPnl - pnlCards.ytdCarryPnl;

  // PnL by type (선택 날짜 기준으로 fetch)
  const pnlByType = await fetchPnlSummaryByTypeAllFunds(currentDate || undefined);

  // PnL by type → PnL 내림차순 (양수 큰 값 → 음수 큰 값)
  const sortedPnlByType = [...pnlByType].sort(
    (a, b) => b.total_pnl_krw - a.total_pnl_krw,
  );

  // Risk Delta: 선택 날짜에 해당하는 데이터 사용
  const riskDataForDate = riskDelta.data.find((d) => d.dateFull === currentDate);
  const latestDelta = riskDataForDate || (riskDelta.data.length > 0 ? riskDelta.data[riskDelta.data.length - 1] : null);
  const curves = riskDelta.latestCurves ?? { krw: 0, ktb: 0, usd: 0, ust: 0 };

  // 1주일(선택일 기준 최근 5영업일) struct_type별 PnL 데이터
  const weekStart = Math.max(0, trendIdx - 4);
  const weekEnd = trendIdx + 1;
  const weeklyData = pnlTrend.trend.slice(weekStart, weekEnd).map((t) => ({
    date: t.date,
    byType: t.byStructType,  // struct_type 세분화
    daily: t.daily,
  }));

  // Delta 게이지 데이터
  const deltaCurves = [
    { label: 'KRW', value: curves.krw, color: '#10b981' },
    { label: 'KTB', value: curves.ktb, color: '#0ea5e9' },
    { label: 'USD', value: curves.usd, color: '#8b5cf6' },
    { label: 'UST', value: curves.ust, color: '#f43f5e' },
  ];

  return (
    <main>
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className={`${lusitana.className} text-xl md:text-2xl dark:text-gray-100`}>
          요약
        </h1>
        {allDatesFull.length > 0 && (
          <DateSelector
            dates={allDatesFull.map((d) => `${d.slice(4, 6)}/${d.slice(6, 8)}`)}
            dateFull={allDatesFull}
            current={currentDate}
          />
        )}
      </div>

      {/* ===== 1. 운용잔고 & 캐리 ===== */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          운용잔고 / 캐리
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="KRW 운용잔고"
            value={summary ? fmtEok(summary.krwAssetNotional) : '-'}
            sub={summary ? `${summary.krwCount}건` : ''}
            badge="KRW"
            badgeColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          />
          <SummaryCard
            label="USD 운용잔고"
            value={summary ? `$${(summary.usdAssetNotional / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M` : '-'}
            sub={summary ? `${summary.usdCount}건 · MAR ${carry.usdKrwRate.toFixed(0)}` : ''}
            badge="USD"
            badgeColor="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
          />
          {carry.byCurrency.map((c) => (
            <div key={c.curr}>
            <SummaryCard
              label={`${c.curr} 평균 캐리`}
              value={c.avgCarry !== null ? `${(c.avgCarry * 100).toFixed(2)}%` : '-'}
              sub={`잔고 ${c.curr === 'KRW' ? fmtEok(c.totalNotional) : `$${(c.totalNotional / 1000000).toFixed(1)}M`} · ${c.count}건`}
              badge={c.curr}
              badgeColor={c.curr === 'KRW'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'}
            />
            </div>
          ))}
        </div>
      </section>

      {/* ===== 2. PnL Attribution ===== */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          PnL Attribution
        </h2>

        {/* 상단: 핵심 PnL 숫자 (2열 — 좌: 카드, 우: 트렌드 차트) */}
        <div className="mb-4 grid gap-4 grid-cols-1 lg:grid-cols-5">
          {/* 좌측: PnL 핵심 카드 (2×2 + 1) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            <PnlCard label="Daily PnL" value={pnlCards.dailyPnl} unit="억" highlight />
            <PnlCard label="MTD PnL" value={pnlCards.mtdPnl} unit="억" />
            <PnlCard label="YTD PnL" value={pnlCards.ytdPnl} unit="억" />
            <PnlCard label="Carry PnL" value={pnlCards.carryPnl} unit="억" />
            <PnlCard
              label="Daily Coupon"
              value={Math.round(pnlByType.reduce((s, r) => s + r.total_coupon_krw, 0) / 100000000 * 100) / 100}
              unit="억"
            />
            <PnlCard label="YTD Carry PnL" value={pnlCards.ytdCarryPnl} unit="억" />
            <PnlCard
              label="YTD MTM 괴리"
              value={Math.round(ytdMtmGap * 100) / 100}
              unit="억"
              gapCard
            />
          </div>

          {/* 우측: 1주일 struct_type별 PnL Stacked Bar */}
          <div className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              종목유형별 Daily PnL (최근 1주)
            </p>
            <WeeklyTypePnlChart data={weeklyData} height={180} />
          </div>
        </div>

        {/* 하단: 종목유형별 통합 테이블 (인라인 바 포함) */}
        {(() => {
          const maxAbsPnl = Math.max(...sortedPnlByType.map((r) => Math.abs(r.total_pnl_krw)), 1);
          return (
            <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                    <th className="pb-2 text-left font-medium">유형</th>
                    <th className="pb-2 text-left font-medium">통화</th>
                    <th className="pb-2 text-right font-medium">건수</th>
                    <th className="pb-2 text-right font-medium">Notional</th>
                    <th className="pb-2 text-right font-medium pl-3" style={{ minWidth: '80px' }}>Daily PnL</th>
                    <th className="pb-2 font-medium pl-2" style={{ minWidth: '160px' }}></th>
                    <th className="pb-2 text-right font-medium">Coupon</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPnlByType.map((row, i) => {
                    const pnlVal = row.total_pnl_krw;
                    const cpnVal = row.total_coupon_krw;
                    const st = row.struct_type || row.type1 || '-';
                    const barPct = Math.abs(pnlVal) / maxAbsPnl * 100;
                    const isPos = pnlVal >= 0;
                    return (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-1.5 font-medium text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                          {st}
                        </td>
                        <td className="py-1.5">
                          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            row.curr === 'KRW'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                          }`}>
                            {row.curr}
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-mono text-gray-600 dark:text-gray-400">
                          {row.asset_count}
                        </td>
                        <td className="py-1.5 text-right font-mono text-gray-600 dark:text-gray-400">
                          {row.curr === 'KRW' ? fmtEok(row.total_notional) : `$${(row.total_notional / 1000000).toFixed(1)}M`}
                        </td>
                        <td className={`py-1.5 text-right font-mono font-semibold pl-3 whitespace-nowrap ${pnlColor(pnlVal)}`}>
                          {pnlSign(pnlVal)}{fmtEok(pnlVal)}
                        </td>
                        <td className="py-1.5 pl-2">
                          <div className="relative h-4 w-full">
                            {/* 중심선 */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600" />
                            <div
                              className={`absolute top-0.5 h-3 rounded-sm ${
                                isPos
                                  ? 'bg-emerald-500/60 dark:bg-emerald-400/50'
                                  : 'bg-rose-500/60 dark:bg-rose-400/50'
                              }`}
                              style={isPos ? {
                                left: '50%',
                                width: `${Math.max(barPct / 2, 0.5)}%`,
                              } : {
                                right: '50%',
                                width: `${Math.max(barPct / 2, 0.5)}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className={`py-1.5 text-right font-mono ${pnlColor(cpnVal)}`}>
                          {cpnVal !== 0 ? `${pnlSign(cpnVal)}${fmtEok(cpnVal)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                    <td className="pt-2 text-gray-800 dark:text-gray-200" colSpan={2}>합계</td>
                    <td className="pt-2 text-right font-mono text-gray-800 dark:text-gray-200">
                      {pnlByType.reduce((s, r) => s + r.asset_count, 0)}
                    </td>
                    <td className="pt-2 text-right font-mono text-gray-800 dark:text-gray-200">
                      {fmtEok(pnlByType.reduce((s, r) => s + (r.curr === 'KRW' ? r.total_notional : r.total_notional * carry.usdKrwRate), 0))}
                    </td>
                    {(() => {
                      const totalPnl = pnlByType.reduce((s, r) => s + r.total_pnl_krw, 0);
                      const totalCpn = pnlByType.reduce((s, r) => s + r.total_coupon_krw, 0);
                      return (
                        <>
                          <td className={`pt-2 text-right font-mono pl-3 ${pnlColor(totalPnl)}`}>
                            {pnlSign(totalPnl)}{fmtEok(totalPnl)}
                          </td>
                          <td className="pt-2" />
                          <td className={`pt-2 text-right font-mono ${pnlColor(totalCpn)}`}>
                            {totalCpn !== 0 ? `${pnlSign(totalCpn)}${fmtEok(totalCpn)}` : '-'}
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}
      </section>

      {/* ===== 3. 괴리(자산+MTM) 버블 차트 ===== */}
      {gapAnalysis.data.length > 0 && (
        <section className="mb-6">
          <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-700 dark:text-gray-200">
                  괴리 분석 (자산 + MTM)
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  유형별 괴리 절대값과 변동 방향 · 버블 클릭 시 추이 확인
                </p>
              </div>
              {gapAnalysis.stdDt && (
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                  {gapAnalysis.stdDt.slice(0, 4)}-{gapAnalysis.stdDt.slice(4, 6)}-{gapAnalysis.stdDt.slice(6, 8)}
                </span>
              )}
            </div>
            <GapBubbleChart data={gapAnalysis.data} trend={gapAnalysis.trend} />
          </div>
        </section>
      )}

      {/* ===== 4. Risk Delta ===== */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Risk — Hedge Net Delta · PnL
        </h2>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* 좌: Delta 카드 그리드 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <DeltaCard label="KRW Hedge" value={curves.krw} />
              <DeltaCard label="KTB Hedge" value={curves.ktb} />
              <DeltaCard label="USD Hedge" value={curves.usd} />
              <DeltaCard label="UST Hedge" value={curves.ust} />
            </div>
            <DeltaCard
              label="Total Net Delta"
              value={curves.krw + curves.ktb + curves.usd + curves.ust}
              isTotal
            />
            {/* 시장 금리 */}
            {latestDelta && (latestDelta.ktb10y !== null || latestDelta.ust10y !== null) && (
              <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400 pl-1">
                {latestDelta.ktb10y !== null && (
                  <span>KTB 10Y: <span className="font-mono font-semibold text-amber-500">{latestDelta.ktb10y.toFixed(3)}%</span></span>
                )}
                {latestDelta.ust10y !== null && (
                  <span>UST 10Y: <span className="font-mono font-semibold text-red-500">{latestDelta.ust10y.toFixed(3)}%</span></span>
                )}
              </div>
            )}
          </div>

          {/* 우: Delta + PnL 게이지 바 시각화 */}
          <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              커브별 Hedge Net Delta · Daily PnL
            </p>
            <DeltaGaugeBar curves={deltaCurves} dailyPnl={pnlCards.dailyPnl} height={200} />
          </div>
        </div>
      </section>
    </main>
  );
}

// ——— 서브 컴포넌트 ———

function SummaryCard({
  label,
  value,
  sub,
  badge,
  badgeColor,
}: {
  label: string;
  value: string;
  sub?: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
          {badge}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className={`${lusitana.className} text-xl font-bold text-gray-800 dark:text-gray-100`}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{sub}</p>
      )}
    </div>
  );
}

function PnlCard({
  label,
  value,
  unit,
  highlight = false,
  gapCard = false,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
  gapCard?: boolean;
}) {
  const color = gapCard
    ? (value > 0
      ? 'text-amber-600 dark:text-amber-400'
      : value < 0
        ? 'text-sky-600 dark:text-sky-400'
        : 'text-gray-500')
    : pnlColor(value * 100000000);
  const sign = value > 0 ? '+' : value < 0 ? '' : '';
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${
      gapCard
        ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 col-span-2'
        : highlight
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
    }`}>
      <p className={`text-[10px] mb-0.5 ${
        gapCard ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-500 dark:text-gray-400'
      }`}>{label}</p>
      <p className={`${lusitana.className} text-lg font-bold ${color}`}>
        {sign}{value.toFixed(2)}{unit}
      </p>
    </div>
  );
}

function DeltaCard({
  label,
  value,
  isTotal = false,
}: {
  label: string;
  value: number;
  isTotal?: boolean;
}) {
  const isNeg = value < 0;
  const sign = isNeg ? '−' : '+';
  const color = isNeg
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const abs = Math.abs(value);
  let display: string;
  const eok = abs / 100000000;
  if (eok >= 1) {
    display = `₩${eok.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  } else {
    const man = abs / 10000;
    if (man >= 1) {
      display = `₩${man.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
    } else {
      display = `₩${abs.toLocaleString('ko-KR')}`;
    }
  }

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${
      isTotal
        ? 'bg-gray-900 dark:bg-gray-100 border-gray-700 dark:border-gray-300'
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
    }`}>
      <p className={`text-xs mb-1 ${isTotal ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
      </p>
      <p className={`${lusitana.className} text-lg font-bold ${color}`}>
        {sign}{display}
      </p>
      <p className={`font-mono text-[9px] ${isTotal ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
        {sign}{abs.toLocaleString()}
      </p>
    </div>
  );
}
