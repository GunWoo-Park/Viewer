// app/lib/trading-utils.ts
// 트레이딩 터미널 공통 유틸리티

// 색상 모드별 변동 색상
// 한국: 상승=빨강, 하락=파랑 / 글로벌: 상승=초록, 하락=빨강
export function getChangeColor(val: number, isKorean: boolean): string {
  if (val === 0) return 'text-gray-400';
  if (isKorean) {
    return val > 0 ? 'text-red-400' : 'text-blue-400';
  }
  return val > 0 ? 'text-trading-green' : 'text-trading-red';
}

// 배경 색상 (테이블 셀 하이라이트)
export function getChangeBgColor(val: number, isKorean: boolean): string {
  if (val === 0) return '';
  if (isKorean) {
    return val > 0 ? 'bg-red-500/10' : 'bg-blue-500/10';
  }
  return val > 0 ? 'bg-trading-green/10' : 'bg-trading-red/10';
}

// 부호 표시
export function changeSign(val: number): string {
  return val > 0 ? '+' : '';
}

// bp 포맷
export function formatBp(val: number): string {
  if (val === 0) return '-';
  return `${changeSign(val)}${val.toFixed(1)}`;
}

// 숫자 포맷 (쉼표 구분)
export function formatNum(val: number, digits = 2): string {
  if (!val && val !== 0) return '-';
  if (val === 0) return '-';
  return val.toLocaleString(undefined, { maximumFractionDigits: digits });
}

// 금리 포맷 (소수점 3자리)
export function formatRate(val: number, digits = 3): string {
  if (!val) return '-';
  return val.toFixed(digits);
}

// 퍼센트 포맷
export function formatPercent(val: number): string {
  if (val === 0) return '0.00%';
  return `${changeSign(val)}${val.toFixed(2)}%`;
}

// 억 단위 포맷
export function formatBillion(val: number): string {
  if (!val) return '-';
  return `${(val / 1).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
