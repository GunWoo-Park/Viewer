// app/lib/market-data.ts
// DB에서 시장 데이터 조회 (기존 엑셀 파싱 → PostgreSQL 전환)
import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';

// --- 타입 정의 ---

export type StockIndex = {
  name: string;
  level: number;
  change: number;
  changePercent: number;
};

export type USTreasury = {
  tenor: string;
  level: number;
  change: number;
};

export type IRSRate = {
  tenor: string;
  rate: number;
  change: number;
};

export type CRSRate = {
  tenor: string;
  rate: number;
  change: number;
};

export type BondYield = {
  name: string;
  level: number;
  change: number;
};

export type BondSpread = {
  name: string;
  irs: number;
  sp: number;
};

export type CreditSpread = {
  name: string;
  y3M: number;
  y6M: number;
  y1Y: number;
  y2Y: number;
  y3Y: number;
  y5Y: number;
  y10Y: number;
  y20Y: number;
};

export type KTBFutures = {
  ticker: string;
  price: number;
  volume: number;
  netForeign: number;
  netFinInvest: number;
  netBank: number;
};

export type BondLending = {
  ticker: string;
  borrowAmt: number;
  repayAmt: number;
  netChange: number;
  balance: number;
};

export type EconomicEvent = {
  date: string;
  event: string;
};

export type MarketDailyData = {
  date: string;
  dayOfWeek: string;
  stocks: StockIndex[];
  usTreasury: USTreasury[];
  irs: IRSRate[];
  crs: CRSRate[];
  bonds: BondYield[];
  spreads: BondSpread[];
  creditSpreads: CreditSpread[];
  ktbFutures: KTBFutures[];
  bondLending: BondLending[];
  events: EconomicEvent[];
};

// --- 날짜 헬퍼 (타임존 안전) ---
// Date.toISOString()은 UTC 기준이라 KST에서 하루가 밀릴 수 있음
function formatDateSafe(d: Date | string): string {
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(d).split('T')[0];
}

// --- 사용 가능한 날짜 목록 조회 ---

export async function fetchAvailableDates(): Promise<string[]> {
  noStore();
  try {
    const data = await sql`
      SELECT DISTINCT base_date
      FROM tb_macro_index
      ORDER BY base_date DESC
      LIMIT 365
    `;
    return data.rows.map((r) =>
      formatDateSafe(r.base_date as Date | string),
    );
  } catch (error) {
    console.error('fetchAvailableDates 에러:', error);
    return [];
  }
}

// --- 특정 날짜의 시장 데이터 조회 ---

export async function getMarketDailyData(
  targetDate?: string,
): Promise<MarketDailyData | null> {
  noStore();

  try {
    // 날짜 결정: 지정 없으면 가장 최신 날짜 사용
    let baseDate: string;
    if (targetDate) {
      baseDate = targetDate;
    } else {
      const latest = await sql`
        SELECT MAX(base_date) as max_date FROM tb_macro_index
      `;
      if (!latest.rows[0]?.max_date) return null;
      baseDate = formatDateSafe(latest.rows[0].max_date);
    }

    // 요일 계산 (로컬 타임존 기준)
    const [yyyy, mm, dd] = baseDate.split('-').map(Number);
    const dateObj = new Date(yyyy, mm - 1, dd);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[dateObj.getDay()] || '';

    // 병렬로 모든 테이블 조회
    const [
      macroResult,
      domesticResult,
      yieldCurveResult,
      ktbResult,
      lendingResult,
      calendarResult,
    ] = await Promise.all([
      sql`SELECT * FROM tb_macro_index WHERE base_date = ${baseDate}`,
      sql`SELECT * FROM tb_domestic_rate WHERE base_date = ${baseDate}`,
      sql`SELECT * FROM tb_yield_curve_matrix WHERE base_date = ${baseDate}`,
      sql`SELECT * FROM tb_ktb_futures WHERE base_date = ${baseDate}`,
      sql`SELECT * FROM tb_bond_lending WHERE base_date = ${baseDate}`,
      sql`SELECT event_date, seq, event_desc FROM tb_economic_calendar WHERE event_date = ${baseDate} ORDER BY seq`,
    ]);

    type Row = Record<string, any>; // eslint-disable-line

    // --- 주요 증시 / FX ---
    const equityRows = macroResult.rows.filter(
      (r: Row) => r.asset_class === 'EQUITY' || r.asset_class === 'FX',
    );
    const stocks: StockIndex[] = equityRows.map((r: Row) => ({
      name: r.ticker,
      level: Number(r.close_value) || 0,
      change: Number(r.change_val) || 0,
      changePercent: Number(r.change_pct) || 0,
    }));

    // --- 미국채 금리 (tb_domestic_rate의 rate_type='UST') ---
    const ustRows = domesticResult.rows.filter(
      (r: Row) => r.rate_type === 'UST',
    );
    const ustTenorOrder = ['2Y', '5Y', '10Y', '30Y'];
    const usTreasury: USTreasury[] = ustTenorOrder
      .map((tenor) => {
        const row = ustRows.find((r: Row) => r.maturity === tenor);
        if (!row) return null;
        return {
          tenor,
          level: Number(row.yield_val) || 0,
          change: Number(row.change_bp) || 0,
        };
      })
      .filter(Boolean) as USTreasury[];

    // --- IRS ---
    const irsRows = domesticResult.rows.filter(
      (r: Row) => r.rate_type === 'IRS',
    );
    const irsTenorOrder = ['1Y', '2Y', '3Y', '5Y', '10Y'];
    const irs: IRSRate[] = irsTenorOrder
      .map((tenor) => {
        const row = irsRows.find((r: Row) => r.maturity === tenor);
        if (!row) return null;
        return {
          tenor,
          rate: Number(row.yield_val) || 0,
          change: Number(row.change_bp) || 0,
        };
      })
      .filter(Boolean) as IRSRate[];

    // --- CRS ---
    const crsRows = domesticResult.rows.filter(
      (r: Row) => r.rate_type === 'CRS',
    );
    const crs: CRSRate[] = irsTenorOrder
      .map((tenor) => {
        const row = crsRows.find((r: Row) => r.maturity === tenor);
        if (!row) return null;
        return {
          tenor,
          rate: Number(row.yield_val) || 0,
          change: Number(row.change_bp) || 0,
        };
      })
      .filter(Boolean) as CRSRate[];

    // --- CD/통안/국고/회사채 (IRS, CRS, UST 제외한 국내 금리) ---
    const bondRateTypes = ['CD', '통안', '국고채', '회사채', '기타'];
    const cashRows = domesticResult.rows.filter(
      (r: Row) => bondRateTypes.includes(r.rate_type),
    );
    const bonds: BondYield[] = cashRows.map((r: Row) => ({
      name: r.ticker_name || r.maturity || '',
      level: Number(r.yield_val) || 0,
      change: Number(r.change_bp) || 0,
    }));

    // --- Bond-Swap Spread (현물 - IRS 계산) ---
    // cashKey: tb_domestic_rate의 ticker_name 또는 maturity
    // ycFallback: tb_domestic_rate에 없을 경우 yield_curve_matrix에서 조회 (sector, tenor)
    const spreadPairs = [
      { name: '통안1Y-IRS1Y', cashKey: '통안1년', irsKey: '1Y', ycFallback: { sector: '통안', tenor: '1Y' } },
      { name: '통안2Y-IRS2Y', cashKey: '통안2년', irsKey: '2Y', ycFallback: { sector: '통안', tenor: '2Y' } },
      { name: '국고3Y-IRS3Y', cashKey: '국고채 3년', irsKey: '3Y', ycFallback: { sector: '국고', tenor: '3Y' } },
      { name: '국고5Y-IRS5Y', cashKey: '국고채 5년', irsKey: '5Y', ycFallback: { sector: '국고', tenor: '5Y' } },
      { name: '국고10Y-IRS10Y', cashKey: '국고채 10년', irsKey: '10Y', ycFallback: { sector: '국고', tenor: '10Y' } },
    ];
    const spreads: BondSpread[] = spreadPairs.map((p) => {
      const irsRow = irsRows.find((r: Row) => r.maturity === p.irsKey);
      const cashRow = cashRows.find(
        (r: Row) => r.ticker_name === p.cashKey || r.maturity === p.cashKey,
      );
      const irsVal = Number(irsRow?.yield_val) || 0;
      let cashVal = Number(cashRow?.yield_val) || 0;
      // tb_domestic_rate에 없으면 yield_curve_matrix에서 폴백 조회
      if (!cashVal && p.ycFallback) {
        const ycRow = yieldCurveResult.rows.find(
          (r: Row) => r.sector === p.ycFallback!.sector && r.tenor === p.ycFallback!.tenor,
        );
        cashVal = Number(ycRow?.yield_rate) || 0;
      }
      const sp = cashVal && irsVal ? (cashVal - irsVal) * 100 : 0;
      return { name: p.name, irs: irsVal, sp };
    });

    // 디버그 로그
    console.log('[Market] spreads:', JSON.stringify(spreads));

    // --- 크레딧 커브 ---
    // 섹터별 그룹핑: credit_rating 무시하고 sector 이름만 사용
    // (이전 데이터는 '은행 AAA', '은행 AA+' 등으로 분리, 최신 데이터는 credit_rating 없음)
    // 특수채만 '특수채 AAA'로 표시 (creditOrder와 매칭)
    const tenors = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y', '20Y'];
    const sectorGroups = new Map<string, Map<string, number>>();

    for (const row of yieldCurveResult.rows) {
      // 특수채 섹터만 'AAA' 표기 유지, 나머지는 sector명만 사용
      const key =
        row.sector === '특수채' ? '특수채 AAA' : String(row.sector);
      if (!sectorGroups.has(key)) {
        sectorGroups.set(key, new Map());
      }
      const tenorMap = sectorGroups.get(key)!;
      const tenor = String(row.tenor);
      const rate = Number(row.yield_rate) || 0;
      // 동일 sector/tenor에 복수 credit_rating이 있으면 AAA 또는 빈 값 우선
      const cr = String(row.credit_rating || '').trim();
      if (!tenorMap.has(tenor) || cr === '' || cr === 'AAA') {
        tenorMap.set(tenor, rate);
      }
    }

    // 정렬 순서 지정 (DB의 실제 sector+credit_rating 조합)
    const creditOrder = [
      '국고',
      '통안',
      '특수채 AAA',
      '특수',
      '은행',
      '중금',
      '카드',
      '회사',
      '지역개발',
      '도철',
    ];

    // 디버그: sectorGroups 키 확인
    console.log('[Market] sectorGroups keys:', Array.from(sectorGroups.keys()));
    console.log('[Market] creditOrder match:', creditOrder.filter((n) => sectorGroups.has(n)));

    const creditSpreads: CreditSpread[] = creditOrder
      .filter((name) => sectorGroups.has(name))
      .map((name) => {
        const tenorMap = sectorGroups.get(name)!;
        return {
          name,
          y3M: tenorMap.get('3M') || 0,
          y6M: tenorMap.get('6M') || 0,
          y1Y: tenorMap.get('1Y') || 0,
          y2Y: tenorMap.get('2Y') || 0,
          y3Y: tenorMap.get('3Y') || 0,
          y5Y: tenorMap.get('5Y') || 0,
          y10Y: tenorMap.get('10Y') || 0,
          y20Y: tenorMap.get('20Y') || 0,
        };
      });

    // --- KTB 선물 ---
    const ktbFutures: KTBFutures[] = ktbResult.rows.map((r: Row) => ({
      ticker: r.ticker,
      price: Number(r.close_price) || 0,
      volume: Number(r.volume) || 0,
      netForeign: Number(r.net_foreign) || 0,
      netFinInvest: Number(r.net_fin_invest) || 0,
      netBank: Number(r.net_bank) || 0,
    }));

    // --- 채권 대차 ---
    const bondLending: BondLending[] = lendingResult.rows.map((r: Row) => ({
      ticker: r.bond_ticker,
      borrowAmt: Number(r.borrow_amt) || 0,
      repayAmt: Number(r.repay_amt) || 0,
      netChange: Number(r.net_change) || 0,
      balance: Number(r.balance) || 0,
    }));

    // --- 경제 일정 ---
    const events: EconomicEvent[] = calendarResult.rows
      .filter((r: Row) => {
        const desc = String(r.event_desc || '').trim();
        // 의미 없는 값 ('0', '-', 저작권 문구 등) 필터링
        return desc && desc !== '0' && desc !== '-' && !desc.startsWith('-본 자료는');
      })
      .map((r: Row) => ({
        date: formatDateSafe(r.event_date as Date | string),
        event: String(r.event_desc).trim(),
      }));

    return {
      date: baseDate,
      dayOfWeek,
      stocks,
      usTreasury,
      irs,
      crs,
      bonds,
      spreads,
      creditSpreads,
      ktbFutures,
      bondLending,
      events,
    };
  } catch (error) {
    console.error('=== Market DB 조회 에러 ===');
    console.error('targetDate:', targetDate);
    console.error('에러 상세:', error);
    return null;
  }
}

// --- 시계열 데이터 조회 (특정 지표의 일별 추이) ---

export type TimeSeriesPoint = {
  date: string;
  value: number;
};

export async function fetchTimeSeries(
  table: 'macro' | 'domestic' | 'credit',
  ticker: string,
  days: number = 30,
): Promise<TimeSeriesPoint[]> {
  noStore();
  try {
    let result;
    switch (table) {
      case 'macro':
        result = await sql`
          SELECT base_date, close_value as value
          FROM tb_macro_index
          WHERE ticker = ${ticker}
          ORDER BY base_date DESC
          LIMIT ${days}
        `;
        break;
      case 'domestic':
        result = await sql`
          SELECT base_date, yield_val as value
          FROM tb_domestic_rate
          WHERE maturity = ${ticker}
          ORDER BY base_date DESC
          LIMIT ${days}
        `;
        break;
      case 'credit':
        result = await sql`
          SELECT base_date, yield_rate as value
          FROM tb_yield_curve_matrix
          WHERE sector = ${ticker}
          ORDER BY base_date DESC
          LIMIT ${days}
        `;
        break;
    }

    return (result?.rows || []).map((r) => ({
      date: formatDateSafe(r.base_date as Date | string),
      value: Number(r.value) || 0,
    })).reverse();
  } catch (error) {
    console.error('fetchTimeSeries 에러:', error);
    return [];
  }
}
