// app/lib/market-data.ts
// Market 폴더 내 DAILY.xlsx 엑셀 파일 파싱
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

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

export type MovingAverage = {
  period: string;
  tongAn1Y: number;
  tongAn2Y: number;
  gov3Y: number;
  gov5Y: number;
  gov10Y: number;
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

export type MarketDailyData = {
  date: string;
  dayOfWeek: string;
  stocks: StockIndex[];
  usTreasury: USTreasury[];
  irs: IRSRate[];
  crs: CRSRate[];
  bonds: BondYield[];
  spreads: BondSpread[];
  movingAverages: MovingAverage[];
  creditSpreads: CreditSpread[];
};

// --- 셀 값 헬퍼 ---

function num(val: any): number {
  if (val === undefined || val === null || val === '' || val === '-') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function str(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

// --- 엑셀 파싱 ---

export async function getMarketDailyData(): Promise<MarketDailyData | null> {
  // Market 폴더에서 가장 최신 _DAILY.xlsx 파일 찾기
  const marketDir = path.join(process.cwd(), 'Market');

  if (!fs.existsSync(marketDir)) {
    console.error('Market 디렉토리 없음');
    return null;
  }

  const files = fs.readdirSync(marketDir)
    .filter((f) => f.endsWith('_DAILY.xlsx') && !f.startsWith('~$'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('Market 폴더에 _DAILY.xlsx 파일 없음');
    return null;
  }

  const filePath = path.join(marketDir, files[0]);

  try {
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    // 날짜 파싱 (row 3, col 33: 요일/날짜)
    const dateVal = raw[3]?.[33];
    const dateStr = dateVal instanceof Date
      ? `${dateVal.getFullYear()}-${String(dateVal.getMonth() + 1).padStart(2, '0')}-${String(dateVal.getDate()).padStart(2, '0')}`
      : str(dateVal);
    const dayOfWeek = str(raw[1]?.[33]) || '';

    // --- 주요 증시 (rows 8~15) ---
    const stockRows = [
      { row: 8, name: 'DOW' },
      { row: 9, name: 'NASDAQ' },
      { row: 10, name: 'S&P 500' },
      { row: 11, name: 'NIKKEI' },
      { row: 12, name: 'KOSPI' },
      { row: 13, name: 'KOSDAQ' },
      { row: 14, name: 'USD/KRW' },
      { row: 15, name: 'JPY/USD' },
    ];
    const stocks: StockIndex[] = stockRows.map((s) => ({
      name: s.name,
      level: num(raw[s.row]?.[3]),
      change: num(raw[s.row]?.[4]),
      changePercent: num(raw[s.row]?.[6]),
    }));

    // --- 미국채 금리 (rows 8~11) ---
    const usRows = [
      { row: 8, tenor: '2Y' },
      { row: 9, tenor: '5Y' },
      { row: 10, tenor: '10Y' },
      { row: 11, tenor: '30Y' },
    ];
    const usTreasury: USTreasury[] = usRows.map((u) => ({
      tenor: u.tenor,
      level: num(raw[u.row]?.[9]),
      change: num(raw[u.row]?.[10]),
    }));

    // --- IRS (rows 8~12) ---
    const irsRows = [
      { row: 8, tenor: '1Y' },
      { row: 9, tenor: '2Y' },
      { row: 10, tenor: '3Y' },
      { row: 11, tenor: '5Y' },
      { row: 12, tenor: '10Y' },
    ];
    const irs: IRSRate[] = irsRows.map((i) => ({
      tenor: i.tenor,
      rate: num(raw[i.row]?.[15]),
      change: num(raw[i.row]?.[16]),
    }));

    // --- CRS (rows 8~12) ---
    const crsRows = [
      { row: 8, tenor: '1Y' },
      { row: 9, tenor: '2Y' },
      { row: 10, tenor: '3Y' },
      { row: 11, tenor: '5Y' },
      { row: 12, tenor: '10Y' },
    ];
    const crs: CRSRate[] = crsRows.map((c) => ({
      tenor: c.tenor,
      rate: num(raw[c.row]?.[18]),
      change: num(raw[c.row]?.[19]),
    }));

    // --- CD/통안/회사채 (rows 8~16) ---
    const bondRows = [
      { row: 8, name: 'CD 1M' },
      { row: 9, name: 'CD 91일' },
      { row: 10, name: '회3Y AA-' },
      { row: 11, name: '회3Y A+' },
      { row: 12, name: '회3Y BBB-' },
      { row: 13, name: '통안 2년' },
      { row: 14, name: '국고 3년' },
      { row: 15, name: '국고 5년' },
      { row: 16, name: '국고 10년' },
    ];
    const bonds: BondYield[] = bondRows.map((b) => ({
      name: b.name,
      level: num(raw[b.row]?.[23]),
      change: num(raw[b.row]?.[24]),
    }));

    // --- Bond-Swap Spread (row 26) ---
    const spreads: BondSpread[] = [
      { name: '통안1Y-IRS1Y', irs: num(raw[26]?.[21]), sp: num(raw[26]?.[23]) },
      { name: '통안2Y-IRS2Y', irs: num(raw[26]?.[24]), sp: num(raw[26]?.[26]) },
      { name: '국고3Y-IRS3Y', irs: num(raw[26]?.[27]), sp: num(raw[26]?.[29]) },
      { name: '국고5Y-IRS5Y', irs: num(raw[26]?.[30]), sp: num(raw[26]?.[31]) },
      { name: '국고10Y-IRS10Y', irs: num(raw[26]?.[32]), sp: num(raw[26]?.[33]) },
    ];

    // --- 이동평균 (rows 30~34) ---
    const maRows = [
      { row: 30, period: '5MA' },
      { row: 31, period: '20MA' },
      { row: 32, period: '60MA' },
      { row: 33, period: '120MA' },
      { row: 34, period: '200MA' },
    ];
    const movingAverages: MovingAverage[] = maRows.map((m) => ({
      period: m.period,
      tongAn1Y: num(raw[m.row]?.[4]),
      tongAn2Y: num(raw[m.row]?.[6]),
      gov3Y: num(raw[m.row]?.[8]),
      gov5Y: num(raw[m.row]?.[10]),
      gov10Y: num(raw[m.row]?.[12]),
    }));

    // --- 신용 스프레드 (rows 78~95, 크레딧 커브) ---
    const creditRows = [
      { row: 79, name: '국고' },
      { row: 80, name: '국주' },
      { row: 83, name: '특수 AAA' },
      { row: 84, name: '특수 AA+' },
      { row: 88, name: '은행 AAA' },
      { row: 89, name: '은행 AA+' },
      { row: 92, name: '회사 AAA' },
      { row: 93, name: '회사 AA+' },
      { row: 94, name: '회사 AA0' },
      { row: 95, name: '회사 AA-' },
    ];
    const creditSpreads: CreditSpread[] = creditRows.map((c) => ({
      name: c.name,
      y3M: num(raw[c.row]?.[3]),
      y6M: num(raw[c.row]?.[4]),
      y1Y: num(raw[c.row]?.[6]),
      y2Y: num(raw[c.row]?.[7]),
      y3Y: num(raw[c.row]?.[8]),
      y5Y: num(raw[c.row]?.[9]),
      y10Y: num(raw[c.row]?.[10]),
      y20Y: num(raw[c.row]?.[11]),
    }));

    return {
      date: dateStr,
      dayOfWeek,
      stocks,
      usTreasury,
      irs,
      crs,
      bonds,
      spreads,
      movingAverages,
      creditSpreads,
    };
  } catch (error) {
    console.error('Market DAILY 파싱 에러:', error);
    return null;
  }
}
