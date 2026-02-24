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
};

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
    return data.rows.map((r: { base_date: Date | string }) => {
      const d = r.base_date;
      if (d instanceof Date) {
        return d.toISOString().split('T')[0];
      }
      return String(d);
    });
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
      const d = latest.rows[0].max_date;
      baseDate = d instanceof Date ? d.toISOString().split('T')[0] : String(d);
    }

    // 요일 계산
    const dateObj = new Date(baseDate + 'T00:00:00');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[dateObj.getDay()] || '';

    // 병렬로 모든 테이블 조회
    const [
      macroResult,
      domesticResult,
      yieldCurveResult,
      ktbResult,
      lendingResult,
    ] = await Promise.all([
      sql`SELECT * FROM tb_macro_index WHERE base_date = ${baseDate}`,
      sql`SELECT * FROM tb_domestic_rate WHERE base_date = ${baseDate}`,
      sql`SELECT * FROM tb_yield_curve_matrix WHERE base_date = ${baseDate}`,
      sql`SELECT * FROM tb_ktb_futures WHERE base_date = ${baseDate}`,
      sql`SELECT * FROM tb_bond_lending WHERE base_date = ${baseDate}`,
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Row = Record<string, any>;

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

    // --- 미국채 금리 ---
    const usBondRows = macroResult.rows.filter(
      (r: Row) => r.asset_class === 'US_BOND',
    );
    const tenorOrder = ['US 2Y', 'US 5Y', 'US 10Y', 'US 30Y'];
    const usTreasury: USTreasury[] = tenorOrder
      .map((name) => {
        const row = usBondRows.find((r: Row) => r.ticker === name);
        if (!row) return null;
        return {
          tenor: name.replace('US ', ''),
          level: Number(row.close_value) || 0,
          change: Number(row.change_val) || 0,
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

    // --- CD/통안/국고/회사채 ---
    const cashRows = domesticResult.rows.filter(
      (r: Row) => r.rate_type === 'CASH',
    );
    const bonds: BondYield[] = cashRows.map((r: Row) => ({
      name: r.maturity || r.ticker_name || '',
      level: Number(r.yield_val) || 0,
      change: Number(r.change_bp) || 0,
    }));

    // --- Bond-Swap Spread (IRS - CASH 계산) ---
    const spreadPairs = [
      { name: '통안1Y-IRS1Y', cashKey: 'CD 91일', irsKey: '1Y' },
      { name: '통안2Y-IRS2Y', cashKey: '통안 2년', irsKey: '2Y' },
      { name: '국고3Y-IRS3Y', cashKey: '국고 3년', irsKey: '3Y' },
      { name: '국고5Y-IRS5Y', cashKey: '국고 5년', irsKey: '5Y' },
      { name: '국고10Y-IRS10Y', cashKey: '국고 10년', irsKey: '10Y' },
    ];
    const spreads: BondSpread[] = spreadPairs.map((p) => {
      const irsRow = irsRows.find((r: Row) => r.maturity === p.irsKey);
      const cashRow = cashRows.find((r: Row) => r.maturity === p.cashKey);
      const irsVal = Number(irsRow?.yield_val) || 0;
      const cashVal = Number(cashRow?.yield_val) || 0;
      return {
        name: p.name,
        irs: irsVal,
        sp: cashVal && irsVal ? (cashVal - irsVal) * 100 : 0,
      };
    });

    // --- 크레딧 커브 ---
    const tenors = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y', '20Y'];
    const sectorGroups = new Map<string, Map<string, number>>();

    for (const row of yieldCurveResult.rows) {
      const key =
        row.credit_rating && row.credit_rating.trim()
          ? `${row.sector} ${row.credit_rating}`
          : row.sector;
      if (!sectorGroups.has(key)) {
        sectorGroups.set(key, new Map());
      }
      sectorGroups.get(key)!.set(row.tenor, Number(row.yield_rate) || 0);
    }

    // 정렬 순서 지정
    const creditOrder = [
      '국고',
      '국주',
      '특수 AAA',
      '특수 AA+',
      '은행 AAA',
      '은행 AA+',
      '카드 AA+',
      '카드 AA0',
      '회사 AAA',
      '회사 AA+',
      '회사 AA0',
      '회사 AA-',
    ];

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
    };
  } catch (error) {
    console.error('Market DB 조회 에러:', error);
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

    return (result?.rows || []).map((r: { base_date: Date | string; value: number }) => {
      const d = r.base_date;
      return {
        date:
          d instanceof Date ? d.toISOString().split('T')[0] : String(d),
        value: Number(r.value) || 0,
      };
    }).reverse();
  } catch (error) {
    console.error('fetchTimeSeries 에러:', error);
    return [];
  }
}
