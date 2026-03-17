import { Strucprdp, ProductDailyPnl } from '@/app/lib/definitions';
import StructCondTooltip from './struct-cond-tooltip';

// 날짜 포맷: YYYYMMDD → YYYY-MM-DD
function formatDate(dt: string): string {
  if (!dt || dt.length !== 8) return dt || '-';
  return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
}

// 명목금액 포맷 (원화 기준)
function formatKRW(amount: number): string {
  const billions = amount / 100000000;
  return `${billions.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억`;
}

function formatUSD(amount: number): string {
  const millions = amount / 1000000;
  if (millions >= 1)
    return `$${millions.toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  return `$${amount.toLocaleString('en-US')}`;
}

// 명목금액 표시 컴포넌트: USD는 MAR 환율 기준 원화환산 + (달러) 작게 표시
function NotionalDisplay({
  notn,
  curr,
  usdKrwRate,
  marRate,
}: {
  notn: number;
  curr: string;
  usdKrwRate: number;
  marRate?: number;
}) {
  if (curr === 'USD') {
    const rate = marRate || usdKrwRate;
    const krwConverted = notn * rate;
    return (
      <div className="text-right">
        <span className="font-medium">{formatKRW(krwConverted)}</span>
        <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
          ({formatUSD(notn)})
        </span>
        {marRate && (
          <div className="text-[9px] text-gray-400 dark:text-gray-500">
            MAR {marRate.toFixed(1)}
          </div>
        )}
      </div>
    );
  }
  return <span className="font-medium">{formatKRW(notn)}</span>;
}

// 수수료(UPFRNT) 포맷: bp 단위는 그대로, 금액은 원화 기준 포맷
function formatUpfrnt(upfrnt: string): { text: string; color: string } {
  if (!upfrnt || upfrnt.trim() === '') return { text: '-', color: 'text-gray-400 dark:text-gray-500' };

  const val = upfrnt.trim();

  // bp 단위 (예: +100bp, +70bp)
  if (val.toLowerCase().endsWith('bp')) {
    return { text: val, color: 'text-indigo-600 dark:text-indigo-400' };
  }

  // 금액 단위 (숫자) — 수수료는 모두 원화 기준
  const num = Number(val);
  if (!isNaN(num)) {
    const isNegative = num < 0;
    const abs = Math.abs(num);
    let formatted: string;

    if (abs >= 100000000) {
      formatted = `${(abs / 100000000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
    } else if (abs >= 10000) {
      formatted = `${(abs / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
    } else {
      formatted = abs.toLocaleString('ko-KR');
    }
    formatted = `₩${formatted}`;

    const sign = isNegative ? '−' : '+';
    const color = isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
    return { text: `${sign}${formatted}`, color };
  }

  // 기타: 그대로 표시
  return { text: val, color: 'text-gray-600 dark:text-gray-400' };
}

// type1~type4를 통합하여 구조 유형 문자열 생성 (백슬래시 → ₩ 치환)
function buildStructType(p: Strucprdp): string {
  return [p.type1, p.type2, p.type3, p.type4]
    .filter((v) => v && v !== '')
    .map((v) => v.replace(/\\/g, '₩'))
    .join(' / ');
}

// KRW 금액 포맷 (억/만)
function fmtKrw(v: number): string {
  const b = v / 100000000;
  if (Math.abs(b) >= 1) {
    return `${b >= 0 ? '+' : ''}${b.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  }
  const m = v / 10000;
  return `${m >= 0 ? '+' : ''}${m.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`;
}

// USD 금액 포맷 ($M / $K)
function fmtUsd(v: number): string {
  const m = v / 1000000;
  if (Math.abs(m) >= 0.1) {
    return `${v >= 0 ? '+' : '-'}$${Math.abs(m).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  }
  const k = v / 1000;
  return `${v >= 0 ? '+' : '-'}$${Math.abs(k).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
}

// PnL 포맷: 원화가 메인, USD는 원화(달러) 형식
function fmtPnl(krwVal: number, usdVal?: number): string {
  const main = fmtKrw(krwVal);
  if (usdVal !== undefined) {
    return `${main} (${fmtUsd(usdVal)})`;
  }
  return main;
}

function pnlColor(v: number): string {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-gray-500 dark:text-gray-400';
}

// 금리 포맷: 소수 → 퍼센트 (예: 0.035 → 3.50%)
function formatRate(rate: number | null): string {
  if (rate == null) return '-';
  return `${(rate * 100).toFixed(2)}%`;
}

// Rcv/Pay Rate 표시 컴포넌트
function RateCell({
  rate,
  type,
}: {
  rate: number | null;
  type: 'rcv' | 'pay';
}) {
  if (rate == null) return <span className="text-gray-300 dark:text-gray-600">-</span>;
  const color =
    type === 'rcv'
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-rose-600 dark:text-rose-400';
  return (
    <span className={`font-mono text-xs font-medium ${color}`}>
      {formatRate(rate)}
    </span>
  );
}

export default function StrucprdpTable({
  products,
  usdKrwRate = 1450,
  accintRates = {},
  pnlMap = {},
  marRates = {},
  onRowClick,
  onPnlClick,
}: {
  products: Strucprdp[];
  usdKrwRate?: number;
  accintRates?: Record<string, { couponRate: number | null; fundRate: number | null }>;
  pnlMap?: Record<string, ProductDailyPnl>;
  marRates?: Record<string, number>;
  onRowClick?: (eff_dt: string, curr: string) => void;
  onPnlClick?: (objCd: string) => void;
}) {

  return (
    <div className="mt-6 flow-root">
      {/* 모바일 카드 뷰 */}
      <div className="md:hidden">
        {products.map((p) => (
          <div
            key={p.obj_cd}
            className={`mb-3 rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm ${onRowClick ? 'cursor-pointer' : ''}`}
            onClick={() => onRowClick?.(p.eff_dt, p.curr)}
          >
            <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.obj_cd}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{p.cntr_nm}</p>
              </div>
              <div className="flex gap-1">
                <AssetBadge value={p.asst_lblt} />
                <TpBadge value={p.tp} />
                <CurrBadge value={p.curr} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-3 text-sm">
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs">구조 유형</p>
                <p className="font-medium text-xs">{buildStructType(p) || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs">명목금액</p>
                <NotionalDisplay notn={p.notn} curr={p.curr} usdKrwRate={usdKrwRate} marRate={marRates[p.obj_cd]} />
              </div>
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs">수수료</p>
                <p className="font-medium text-xs">
                  {(() => {
                    const { text, color } = formatUpfrnt(p.upfrnt);
                    return <span className={color}>{text}</span>;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs">유효일 / 만기일</p>
                <p>{formatDate(p.eff_dt)} / {formatDate(p.mat_dt)}</p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs">Daily PnL</p>
                <p className={`font-mono text-xs font-semibold ${pnlMap[p.obj_cd] ? pnlColor(pnlMap[p.obj_cd].total_pnl_krw) : 'text-gray-400'}`}>
                  {pnlMap[p.obj_cd] ? fmtPnl(pnlMap[p.obj_cd].total_pnl_krw, pnlMap[p.obj_cd].curr === 'USD' ? pnlMap[p.obj_cd].total_pnl : undefined) : '-'}
                </p>
              </div>
            </div>
            {p.asst_lblt === '자산' && accintRates[p.obj_cd] && (
              <div className="mt-2 pt-2 border-t dark:border-gray-700 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Pay Rate (Fund)</p>
                  <RateCell rate={accintRates[p.obj_cd].fundRate} type="pay" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Rcv Rate (Coupon)</p>
                  <RateCell rate={accintRates[p.obj_cd].couponRate} type="rcv" />
                </div>
              </div>
            )}
            {(p.pay_cond || p.struct_cond) && (
              <div className="mt-2 pt-2 border-t dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500">Pay 구조</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{p.pay_cond || p.struct_cond}</p>
              </div>
            )}
            {(p.rcv_cond || p.struct_cond) && (
              <div className="mt-1">
                <p className="text-xs text-gray-400 dark:text-gray-500">Rcv 구조</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{p.rcv_cond || p.struct_cond}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 데스크탑 테이블 뷰 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-3 whitespace-nowrap">OBJ_CD</th>
              <th className="px-3 py-3 whitespace-nowrap">거래상대방</th>
              <th className="px-3 py-3 whitespace-nowrap">자산/부채</th>
              <th className="px-3 py-3 whitespace-nowrap">스왑 유형</th>
              <th className="px-3 py-3 whitespace-nowrap">통화</th>
              <th className="px-3 py-3 whitespace-nowrap text-right">명목금액</th>
              <th className="px-3 py-3 whitespace-nowrap">수수료</th>
              <th className="px-3 py-3 whitespace-nowrap">유효일</th>
              <th className="px-3 py-3 whitespace-nowrap">만기일</th>
              <th className="px-3 py-3 whitespace-nowrap">구조 유형</th>
              <th className="px-2 py-3 text-center"><div className="leading-tight">Call<br/>여부</div></th>
              <th className="px-2 py-3 text-center"><div className="leading-tight">Carry<br/>Rate</div></th>
              <th className="px-2 py-3 text-center"><div className="leading-tight">Pay<br/>Rate</div></th>
              <th className="px-3 py-3">Pay 구조</th>
              <th className="px-2 py-3 text-center"><div className="leading-tight">Rcv<br/>Rate</div></th>
              <th className="px-3 py-3">Rcv 구조</th>
              <th className="px-3 py-3 text-right whitespace-nowrap"><div className="leading-tight">Daily<br/>PnL</div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {products.map((p) => (
              <tr
                key={p.obj_cd}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(p.eff_dt, p.curr)}
              >
                <td className="px-3 py-3 whitespace-nowrap font-mono text-xs font-medium text-blue-700 dark:text-blue-400">
                  {p.obj_cd}
                </td>
                <td className="px-3 py-3 whitespace-nowrap max-w-[180px] truncate text-gray-700 dark:text-gray-300" title={p.cntr_nm}>
                  {p.cntr_nm}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <AssetBadge value={p.asst_lblt} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <TpBadge value={p.tp} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <CurrBadge value={p.curr} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right">
                  <NotionalDisplay notn={p.notn} curr={p.curr} usdKrwRate={usdKrwRate} marRate={marRates[p.obj_cd]} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                  {(() => {
                    const { text, color } = formatUpfrnt(p.upfrnt);
                    return <span className={color}>{text}</span>;
                  })()}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {formatDate(p.eff_dt)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {formatDate(p.mat_dt)}
                </td>
                <td className="px-3 py-3 max-w-[180px]">
                  <StructTypeBadgesCompact type1={p.type1} type2={p.type2} type3={p.type3} type4={p.type4} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  {p.call_yn === 'Y' ? (
                    <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 text-xs text-orange-700 dark:text-orange-400">Y</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  {(() => {
                    const rates = accintRates[p.obj_cd];
                    if (p.asst_lblt !== '자산' || !rates || rates.couponRate == null || rates.fundRate == null) {
                      return <span className="text-gray-300 dark:text-gray-600">-</span>;
                    }
                    const carry = rates.couponRate - rates.fundRate;
                    const color = carry > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : carry < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-gray-500 dark:text-gray-400';
                    const sign = carry > 0 ? '+' : '';
                    return (
                      <span className={`font-mono text-xs font-semibold ${color}`}>
                        {sign}{(carry * 100).toFixed(2)}%
                      </span>
                    );
                  })()}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  {p.asst_lblt === '자산' && accintRates[p.obj_cd] ? (
                    <RateCell rate={accintRates[p.obj_cd].fundRate} type="pay" />
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                  )}
                </td>
                <td className="px-3 py-3 max-w-[300px]">
                  <StructCondTooltip condition={p.pay_cond || p.struct_cond} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  {p.asst_lblt === '자산' && accintRates[p.obj_cd] ? (
                    <RateCell rate={accintRates[p.obj_cd].couponRate} type="rcv" />
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                  )}
                </td>
                <td className="px-3 py-3 max-w-[300px]">
                  <StructCondTooltip condition={p.rcv_cond || p.struct_cond} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right">
                  {(() => {
                    const pnl = pnlMap[p.obj_cd];
                    if (!pnl) return <span className="text-gray-300 dark:text-gray-600">-</span>;
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPnlClick?.(p.obj_cd);
                        }}
                        className={`font-mono text-xs font-semibold ${pnlColor(pnl.total_pnl_krw)} hover:underline cursor-pointer`}
                        title={`MTM: ${fmtPnl(pnl.daily_pnl_krw, pnl.curr === 'USD' ? pnl.daily_pnl : undefined)}${pnl.coupon_amt ? ` / 쿠폰: ${fmtPnl(pnl.coupon_amt_krw, pnl.curr === 'USD' ? pnl.coupon_amt : undefined)}` : ''}`}
                      >
                        {fmtPnl(pnl.total_pnl_krw, pnl.curr === 'USD' ? pnl.total_pnl : undefined)}
                      </button>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {products.length === 0 && (
        <div className="mt-10 text-center">
          <p className="text-gray-400 dark:text-gray-500">검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}

// 자산/부채 뱃지
function AssetBadge({ value }: { value: string }) {
  const isAsset = value === '자산';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isAsset
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
      }`}
    >
      {value}
    </span>
  );
}

// 스왑 유형 뱃지 — DB tp 값을 직관적 라벨로 매핑
// 자산: 실질 수익 포지션(원천), MTM: 자산스왑 MTM 변동성 헤지, 캐리: 자산스왑 캐리의 연속 PnL 인식
const TP_DISPLAY: Record<string, string> = {
  자산: '자산(원천)',
  MTM: 'MTM헤지',
  캐리: '캐리연속',
  자체발행: '자체발행',
};

function TpBadge({ value }: { value: string }) {
  if (!value) return <span className="text-gray-300 dark:text-gray-600">-</span>;

  const colorMap: Record<string, string> = {
    자산: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    MTM: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    자체발행: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
    캐리: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  };

  const color = colorMap[value] || 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  const label = TP_DISPLAY[value] || value;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// 통화 뱃지
function CurrBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        value === 'KRW'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          : 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
      }`}
    >
      {value}
    </span>
  );
}

// 구조 유형 뱃지 — 2줄 컴팩트 (type1 위, type2~4 아래)
function StructTypeBadgesCompact({
  type1,
  type2,
  type3,
  type4,
}: {
  type1: string;
  type2: string;
  type3: string;
  type4: string;
}) {
  const fix = (s: string) => s.replace(/\\/g, '₩');

  if (!type1) return <span className="text-gray-300 dark:text-gray-600">-</span>;

  const type1ColorMap: Record<string, string> = {
    'Range Accrual': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    Spread: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    Floater: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    InvF: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    Power: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    'Zero Callable': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  };

  const mainColor = type1ColorMap[type1] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const subParts = [type2, type3, type4].filter((v) => v && v !== '').map(fix);

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold w-fit ${mainColor}`}>
        {fix(type1)}
      </span>
      {subParts.length > 0 && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[160px]" title={subParts.join(' / ')}>
          {subParts.join(' / ')}
        </span>
      )}
    </div>
  );
}

// 구조 유형 통합 뱃지 (type1 = 대분류, type2~4 = 세부 분류) — 모바일용
function StructTypeBadges({
  type1,
  type2,
  type3,
  type4,
}: {
  type1: string;
  type2: string;
  type3: string;
  type4: string;
}) {
  // 백슬래시(\)를 ₩로 치환 (예: \Zero → ₩Zero)
  const fix = (s: string) => s.replace(/\\/g, '₩');

  if (!type1) return <span className="text-gray-300 dark:text-gray-600">-</span>;

  const type1ColorMap: Record<string, string> = {
    'Range Accrual': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    Spread: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    Floater: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    InvF: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    Power: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    'Zero Callable': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  };

  const mainColor = type1ColorMap[type1] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const subParts = [type2, type3, type4].filter((v) => v && v !== '').map(fix);

  return (
    <div className="flex flex-wrap gap-1">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${mainColor}`}>
        {fix(type1)}
      </span>
      {subParts.map((sub, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-300"
        >
          {sub}
        </span>
      ))}
    </div>
  );
}
