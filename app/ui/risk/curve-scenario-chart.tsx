'use client';

import { useState, useMemo } from 'react';

type CurveDelta = Record<string, number>; // curveCd → 1bp당 총 delta (원)

interface CurveScenarioChartProps {
  currentMtmEok: number;          // 현재 부채MTM (억, 예: -218)
  selfIssuedEok: number;          // 자체발행 평가액 (억, 예: +410)
  mtmHedgeEok: number;            // MTM헤지 평가액 (억, 예: -628)
  limitEok: number;               // 한도 (억, 예: +300) — 양수 방향 한도
  selfDelta: CurveDelta;          // 자체발행 커브별 Total delta (원)
  mtmDelta: CurveDelta;           // MTM헤지 커브별 Total delta (원)
}

// 커브 설정
const CURVE_CONFIG: { key: string; label: string; color: string; bgColor: string }[] = [
  { key: 'KRW', label: 'KRW', color: '#10b981', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { key: 'KTB', label: 'KTB', color: '#0ea5e9', bgColor: 'bg-sky-100 dark:bg-sky-900/40' },
  { key: 'USD', label: 'USD', color: '#8b5cf6', bgColor: 'bg-violet-100 dark:bg-violet-900/40' },
];

export default function CurveScenarioChart({
  currentMtmEok,
  selfIssuedEok,
  mtmHedgeEok,
  limitEok,
  selfDelta,
  mtmDelta,
}: CurveScenarioChartProps) {
  // 각 커브별 시나리오 bp (슬라이더)
  const [bpShifts, setBpShifts] = useState<Record<string, number>>({
    KRW: 0, KTB: 0, USD: 0,
  });

  // 시나리오 계산 — 부호 그대로 유지
  const scenario = useMemo(() => {
    let selfImpact = 0;
    let mtmImpact = 0;

    for (const curve of CURVE_CONFIG) {
      const bp = bpShifts[curve.key] || 0;
      selfImpact += ((selfDelta[curve.key] || 0) * bp) / 1e8;
      mtmImpact += ((mtmDelta[curve.key] || 0) * bp) / 1e8;
    }

    const newSelf = selfIssuedEok + selfImpact;
    const newMtm = mtmHedgeEok + mtmImpact;
    const newTotal = newSelf + newMtm;
    // 한도 초과 = 부채MTM이 +limitEok를 초과할 때
    const overLimit = newTotal > limitEok;

    return { selfImpact, mtmImpact, newSelf, newMtm, newTotal, overLimit };
  }, [bpShifts, selfDelta, mtmDelta, selfIssuedEok, mtmHedgeEok, limitEok]);

  // 게이지 수직선 범위 계산
  // 왼쪽 끝(음수) ~ 오른쪽 끝(양수), 한도와 현재값·시나리오값을 모두 포함
  const allValues = [currentMtmEok, scenario.newTotal, limitEok, 0];
  const rangeMin = Math.min(...allValues) - 50;
  const rangeMax = Math.max(...allValues) + 100;
  const rangeSpan = rangeMax - rangeMin;
  const toPercent = (v: number) => ((v - rangeMin) / rangeSpan) * 100;

  const fmtEok = (v: number) => {
    const sign = v >= 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}억`;
  };

  const resetAll = () => setBpShifts({ KRW: 0, KTB: 0, USD: 0 });

  return (
    <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-0.5 text-xs font-bold">
            시나리오
          </span>
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">
            커브 시나리오 · 부채MTM 한도 시뮬레이션
          </h2>
        </div>
        <button
          onClick={resetAll}
          className="text-xs text-gray-400 hover:text-gray-200 border border-gray-600 rounded px-2 py-0.5 transition-colors"
        >
          초기화
        </button>
      </div>

      {/* 슬라이더 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {CURVE_CONFIG.map((curve) => {
          const bp = bpShifts[curve.key] || 0;
          const selfD = (selfDelta[curve.key] || 0) / 1e8;
          const mtmD = (mtmDelta[curve.key] || 0) / 1e8;
          const totalD = selfD + mtmD;
          const impact = totalD * bp;

          return (
            <div key={curve.key} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${curve.bgColor}`}
                  style={{ color: curve.color }}>
                  {curve.label}
                </span>
                <span className="font-mono text-sm font-bold" style={{ color: curve.color }}>
                  {bp > 0 ? '+' : ''}{bp}bp
                </span>
              </div>
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={bp}
                onChange={(e) => setBpShifts((prev) => ({ ...prev, [curve.key]: Number(e.target.value) }))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${curve.color}33 0%, ${curve.color} 50%, ${curve.color}33 100%)`,
                  accentColor: curve.color,
                }}
              />
              <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                <span>-20bp</span>
                <span>0</span>
                <span>+20bp</span>
              </div>
              <div className="mt-2 text-[10px] text-gray-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>자체발행 delta/bp</span>
                  <span className="font-mono">{selfD.toFixed(2)}억</span>
                </div>
                <div className="flex justify-between">
                  <span>MTM헤지 delta/bp</span>
                  <span className="font-mono">{mtmD.toFixed(2)}억</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-300">
                  <span>영향</span>
                  <span className={`font-mono ${impact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fmtEok(impact)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 수직선 게이지 — 부호 기반 */}
      <div className="space-y-3">
        <div className="text-xs text-gray-400 mb-1">부채MTM 수직선 (한도 초과 = +{limitEok}억 이상)</div>

        <div className="relative h-14 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-visible px-2">
          {/* 0 기준선 */}
          <div
            className="absolute top-0 bottom-0 w-px bg-gray-500/50 z-10"
            style={{ left: `${toPercent(0)}%` }}
          />
          <div
            className="absolute bottom-0 text-[8px] text-gray-500 z-10"
            style={{ left: `${toPercent(0)}%`, transform: 'translateX(-50%)' }}
          >
            0
          </div>

          {/* 한도선 (+300억) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{ left: `${toPercent(limitEok)}%` }}
          />
          <div
            className="absolute -top-1 text-[9px] font-bold text-red-400 z-20 whitespace-nowrap"
            style={{ left: `${toPercent(limitEok)}%`, transform: 'translateX(-50%)' }}
          >
            한도 +{limitEok}억
          </div>

          {/* 한도 초과 영역 (빨간 배경) */}
          <div
            className="absolute top-0 bottom-0 bg-red-500/10 z-0"
            style={{ left: `${toPercent(limitEok)}%`, right: 0 }}
          />

          {/* 현재 값 마커 */}
          <div
            className="absolute top-1 h-5 flex items-center z-10"
            style={{ left: `${toPercent(currentMtmEok)}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-gray-600 -ml-1" />
            <span className="ml-1 text-[9px] font-mono text-gray-400 whitespace-nowrap">
              현재 {currentMtmEok.toFixed(0)}억
            </span>
          </div>

          {/* 시나리오 값 마커 */}
          <div
            className="absolute bottom-1 h-5 flex items-center z-10"
            style={{ left: `${toPercent(scenario.newTotal)}%` }}
          >
            <div className={`w-2.5 h-2.5 rounded-full border-2 -ml-1 ${
              scenario.overLimit
                ? 'bg-red-400 border-red-600'
                : 'bg-emerald-400 border-emerald-600'
            }`} />
            <span className={`ml-1 text-[9px] font-mono font-bold whitespace-nowrap ${
              scenario.overLimit ? 'text-red-300' : 'text-emerald-300'
            }`}>
              시나리오 {scenario.newTotal.toFixed(0)}억
              {scenario.overLimit && ' ⚠ 한도초과'}
            </span>
          </div>

          {/* 현재→시나리오 연결 바 */}
          {(() => {
            const leftPct = Math.min(toPercent(currentMtmEok), toPercent(scenario.newTotal));
            const rightPct = Math.max(toPercent(currentMtmEok), toPercent(scenario.newTotal));
            const isGrowing = scenario.newTotal > currentMtmEok; // 양수 방향으로 이동 = 위험
            return (
              <div
                className={`absolute top-[45%] h-1.5 rounded transition-all duration-300 ${
                  isGrowing ? 'bg-amber-500/40' : 'bg-sky-500/30'
                }`}
                style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
              />
            );
          })()}
        </div>

        {/* 상세 수치 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <ScenarioCard
            label="자체발행"
            current={selfIssuedEok}
            after={scenario.newSelf}
            impact={scenario.selfImpact}
          />
          <ScenarioCard
            label="MTM헤지"
            current={mtmHedgeEok}
            after={scenario.newMtm}
            impact={scenario.mtmImpact}
          />
          <ScenarioCard
            label="부채MTM 합계"
            current={currentMtmEok}
            after={scenario.newTotal}
            impact={scenario.selfImpact + scenario.mtmImpact}
            highlight
          />
          <div className={`rounded-lg border p-3 ${
            scenario.overLimit
              ? 'border-red-500/50 bg-red-950/30'
              : 'border-emerald-500/30 bg-emerald-950/20'
          }`}>
            <div className="text-[10px] text-gray-400 mb-1">잔여 여력</div>
            <div className={`font-mono text-lg font-bold ${
              scenario.overLimit ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {(limitEok - scenario.newTotal).toFixed(1)}억
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              한도 +{limitEok}억 기준
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({
  label,
  current,
  after,
  impact,
  highlight = false,
}: {
  label: string;
  current: number;
  after: number;
  impact: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${highlight ? 'ring-1 ring-amber-500/30' : ''}`}>
      <div className="text-[10px] text-gray-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-xs text-gray-500">{current >= 0 ? '+' : ''}{current.toFixed(1)}억</span>
        <span className="text-gray-600">→</span>
        <span className={`font-mono text-sm font-bold ${after >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {after >= 0 ? '+' : ''}{after.toFixed(1)}억
        </span>
      </div>
      {impact !== 0 && (
        <div className={`text-[10px] font-mono mt-0.5 ${impact >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {impact > 0 ? '▲' : '▼'} {impact > 0 ? '+' : ''}{impact.toFixed(1)}억
        </div>
      )}
    </div>
  );
}
