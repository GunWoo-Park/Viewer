import { sql } from '@vercel/postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
  BTBDashboardData,
  PnlAttributionRow,
  Strucprdp,
  StrucprdpSummary,
  ProductDailyPnl,
  PnlSummaryByType,
} from './definitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore} from "next/cache";

// export const dynamic = "force-dynamic"; // https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config

export async function fetchRevenue() {
  noStore();

  try {
    const data = await sql<Revenue>`SELECT * FROM revenue`;

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();

  try {
    const data = await sql<LatestInvoiceRaw>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();

  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }

  // const dataPromise = sql`
  //     SELECT 
  //       (SELECT COUNT(*) FROM invoices) AS invoice_count,
  //       (SELECT COUNT(*) FROM customers) AS customer_count,
  //       (SELECT SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) FROM invoices) AS total_paid,
  //       (SELECT SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) FROM invoices) AS total_pending
  //   `;

  //   const data = await dataPromise;

  //   const numberOfInvoices = Number(data.rows[0].invoice_count ?? '0');
  //   const numberOfCustomers = Number(data.rows[0].customer_count ?? '0');
  //   const totalPaidInvoices = formatCurrency(data.rows[0].total_paid ?? '0');
  //   const totalPendingInvoices = formatCurrency(data.rows[0].total_pending ?? '0');

  //   return {
  //     numberOfCustomers,
  //     numberOfInvoices,
  //     totalPaidInvoices,
  //     totalPendingInvoices,
  //   };
  // } catch (error) {
  //   console.error('Database Error:', error);
  //   throw new Error('Failed to fetch card data.');
  // }
  
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore();

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql<InvoicesTable>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore();

  try {
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();

  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore();

  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore();

  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  noStore();

  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

// --- FICC 대시보드 데이터 조회 함수 ---

export async function fetchLatestFiccDate(): Promise<string> {
  noStore();

  try {
    const data = await sql`
      SELECT DISTINCT std_dt
      FROM book_pnl
      ORDER BY std_dt DESC
      LIMIT 1
    `;
    return data.rows[0]?.std_dt || '';
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch latest FICC date.');
  }
}

export async function fetchDashboardKPI(stdDt: string) {
  noStore();

  try {
    const [assetData, liabilityData, pnlData] = await Promise.all([
      sql`
        SELECT COALESCE(SUM(pstn), 0) AS total
        FROM asset_position
        WHERE asst_lblt = '자산' AND std_dt = ${stdDt}
      `,
      sql`
        SELECT COALESCE(SUM(pstn), 0) AS total
        FROM asset_position
        WHERE asst_lblt = '부채' AND std_dt = ${stdDt}
      `,
      sql`
        SELECT
          COALESCE(SUM(daily_pnl), 0) AS daily_pnl,
          COALESCE(SUM(monthly_pnl), 0) AS monthly_pnl,
          COALESCE(SUM(accmlt_pnl), 0) AS accmlt_pnl
        FROM book_pnl
        WHERE std_dt = ${stdDt}
      `,
    ]);

    return {
      totalAsset: Number(assetData.rows[0].total),
      totalLiability: Number(liabilityData.rows[0].total),
      dailyPnl: Number(pnlData.rows[0].daily_pnl),
      monthlyPnl: Number(pnlData.rows[0].monthly_pnl),
      accmltPnl: Number(pnlData.rows[0].accmlt_pnl),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch dashboard KPI data.');
  }
}

export async function fetchPnlAttribution(
  stdDt: string,
): Promise<PnlAttributionRow[]> {
  noStore();

  try {
    const data = await sql`
      SELECT
        fp.fnd_nm AS name,
        (COALESCE(fp.prc_pnl, 0) + COALESCE(fp.int_pnl, 0) + COALESCE(fp.trd_pnl, 0) + COALESCE(fp.mny_pnl, 0)) AS daily_pnl
      FROM fund_pnl fp
      INNER JOIN display_ordering d
        ON fp.fnd_nm = d.nm AND d.table_name = 'fndpnlp'
      WHERE fp.std_dt = ${stdDt}
      ORDER BY d.display_order ASC
    `;

    return data.rows.map((row) => ({
      name: row.name,
      daily_pnl: Number(row.daily_pnl),
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch PnL attribution data.');
  }
}

export async function fetchBTBDashboardData(): Promise<BTBDashboardData | null> {
  noStore();

  try {
    const latestDate = await fetchLatestFiccDate();
    if (!latestDate) return null;

    const [kpi, pnlAttribution] = await Promise.all([
      fetchDashboardKPI(latestDate),
      fetchPnlAttribution(latestDate),
    ]);

    // 날짜 포맷: YYYYMMDD → YYYY-MM-DD
    const formattedDate = latestDate.replace(
      /(\d{4})(\d{2})(\d{2})/,
      '$1-$2-$3',
    );

    return {
      latestDate: formattedDate,
      totalBalance: kpi.totalAsset + kpi.totalLiability,
      assetBalance: kpi.totalAsset,
      liabilityBalance: kpi.totalLiability,
      dailyPnl: kpi.dailyPnl,
      monthlyPnl: kpi.monthlyPnl,
      accmltPnl: kpi.accmltPnl,
      pnlAttribution,
    };
  } catch (error) {
    console.error('Database Error:', error);
    // 테이블 미존재 등의 에러 시 null 반환 → page.tsx에서 안내 메시지 표시
    return null;
  }
}

// --- 구조화 상품 (strucprdp) 데이터 조회 함수 ---

const STRUCPRDP_PER_PAGE = 15;

export async function fetchStrucprdpSummary(): Promise<StrucprdpSummary | null> {
  noStore();

  try {
    // Alive(call_yn='N') + 자산(asst_lblt='자산') 기준으로만 집계
    const [countData, typeData, cntrData, fxData] = await Promise.all([
      // 자산 + Alive 기준 KRW/USD 건수·명목금액
      sql`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE curr = 'KRW') AS krw_count,
          COUNT(*) FILTER (WHERE curr = 'USD') AS usd_count,
          COALESCE(SUM(notn) FILTER (WHERE curr = 'KRW'), 0) AS krw_asset_notional,
          COALESCE(SUM(notn) FILTER (WHERE curr = 'USD'), 0) AS usd_asset_notional
        FROM strucprdp
        WHERE asst_lblt = '자산'
          AND (call_yn = 'N' OR call_yn IS NULL)
          AND fnd_cd = '10206020'
          AND tp != '자체발행'
      `,
      // 구조 유형별 자산 명목금액 (Alive + 자산, type1/type2/type3 조합 + 통화별)
      sql`
        SELECT
          CONCAT_WS(' / ', NULLIF(type1,''), NULLIF(type2,''), NULLIF(type3,'')) AS struct_type,
          curr,
          COALESCE(SUM(notn), 0) AS notional
        FROM strucprdp
        WHERE type1 IS NOT NULL AND type1 != ''
          AND asst_lblt = '자산'
          AND (call_yn = 'N' OR call_yn IS NULL)
          AND fnd_cd = '10206020'
          AND tp != '자체발행'
        GROUP BY CONCAT_WS(' / ', NULLIF(type1,''), NULLIF(type2,''), NULLIF(type3,'')), curr
        ORDER BY COALESCE(SUM(notn), 0) DESC
        LIMIT 20
      `,
      // 거래상대방별 자산 명목금액 (Alive + 자산, 통화별)
      sql`
        SELECT
          cntr_nm,
          curr,
          COALESCE(SUM(notn), 0) AS notional
        FROM strucprdp
        WHERE cntr_nm IS NOT NULL AND cntr_nm != ''
          AND asst_lblt = '자산'
          AND (call_yn = 'N' OR call_yn IS NULL)
          AND fnd_cd = '10206020'
          AND tp != '자체발행'
        GROUP BY cntr_nm, curr
        ORDER BY COALESCE(SUM(notn), 0) DESC
        LIMIT 20
      `,
      // 최신 USD/KRW 환율 조회 (시장 데이터)
      sql`
        SELECT close_value
        FROM tb_macro_index
        WHERE ticker = 'USD/KRW' AND asset_class = 'FX'
        ORDER BY base_date DESC
        LIMIT 1
      `,
    ]);

    // USD/KRW 환율 (조회 실패 시 기본값 1450)
    const usdKrwRate = fxData.rows.length > 0
      ? Number(fxData.rows[0].close_value)
      : 1450;

    return {
      totalCount: Number(countData.rows[0].total),
      krwCount: Number(countData.rows[0].krw_count),
      usdCount: Number(countData.rows[0].usd_count),
      krwAssetCount: Number(countData.rows[0].krw_count),
      usdAssetCount: Number(countData.rows[0].usd_count),
      krwAssetNotional: Number(countData.rows[0].krw_asset_notional),
      usdAssetNotional: Number(countData.rows[0].usd_asset_notional),
      usdKrwRate,
      typeDistribution: typeData.rows.map((r) => ({
        struct_type: r.struct_type,
        curr: r.curr || 'KRW',
        notional: Number(r.notional),
      })),
      cntrDistribution: cntrData.rows.map((r) => ({
        cntr_nm: r.cntr_nm,
        curr: r.curr || 'KRW',
        notional: Number(r.notional),
      })),
    };
  } catch (error) {
    console.error('Database Error:', error);
    return null;
  }
}

export async function fetchFilteredStrucprdp(
  query: string,
  currentPage: number,
  callFilter: string = 'N',
): Promise<Strucprdp[]> {
  noStore();

  try {
    // callFilter: 'Y' = 콜된 종목만, 'N' = 미콜 종목만(기본), 'ALL' = 전체
    // 전 종목 한 페이지 출력 (페이지네이션 제거)
    const data = await sql<Strucprdp>`
      SELECT *
      FROM strucprdp
      WHERE
        (
          obj_cd ILIKE ${`%${query}%`} OR
          cntr_nm ILIKE ${`%${query}%`} OR
          fnd_nm ILIKE ${`%${query}%`} OR
          struct_cond ILIKE ${`%${query}%`} OR
          type1 ILIKE ${`%${query}%`} OR
          type2 ILIKE ${`%${query}%`} OR
          type3 ILIKE ${`%${query}%`} OR
          type4 ILIKE ${`%${query}%`} OR
          tp ILIKE ${`%${query}%`} OR
          curr ILIKE ${`%${query}%`} OR
          asst_lblt ILIKE ${`%${query}%`}
        )
        AND (
          ${callFilter} = 'ALL'
          OR call_yn = ${callFilter}
          OR (${callFilter} = 'N' AND call_yn IS NULL)
        )
        AND fnd_cd = '10206020'
        AND tp != '자체발행'
      ORDER BY no ASC
    `;

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch strucprdp data.');
  }
}

export async function fetchStrucprdpPages(
  query: string,
  callFilter: string = 'N',
): Promise<number> {
  noStore();

  try {
    const count = await sql`
      SELECT COUNT(*)
      FROM strucprdp
      WHERE
        (
          obj_cd ILIKE ${`%${query}%`} OR
          cntr_nm ILIKE ${`%${query}%`} OR
          fnd_nm ILIKE ${`%${query}%`} OR
          struct_cond ILIKE ${`%${query}%`} OR
          type1 ILIKE ${`%${query}%`} OR
          type2 ILIKE ${`%${query}%`} OR
          type3 ILIKE ${`%${query}%`} OR
          type4 ILIKE ${`%${query}%`} OR
          tp ILIKE ${`%${query}%`} OR
          curr ILIKE ${`%${query}%`} OR
          asst_lblt ILIKE ${`%${query}%`}
        )
        AND (
          ${callFilter} = 'ALL'
          OR call_yn = ${callFilter}
          OR (${callFilter} = 'N' AND call_yn IS NULL)
        )
        AND fnd_cd = '10206020'
        AND tp != '자체발행'
    `;

    return Math.ceil(Number(count.rows[0].count) / STRUCPRDP_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch strucprdp page count.');
  }
}

// OBJ_CD별 최신 쿠폰(Rcv) / 펀딩(Pay) 금리 조회
// strucfe_accint 테이블에서 각 OBJ_CD의 가장 최신 STD_DT 기준 RATE를 반환
export async function fetchLatestAccintRates(): Promise<
  Record<string, { couponRate: number | null; fundRate: number | null }>
> {
  noStore();

  try {
    const data = await sql`
      SELECT DISTINCT ON (obj_cd, leg_tp)
        obj_cd, leg_tp, rate
      FROM strucfe_accint
      WHERE eval_mdul_cd = '3'
      ORDER BY obj_cd, leg_tp, std_dt DESC
    `;

    const result: Record<string, { couponRate: number | null; fundRate: number | null }> = {};

    for (const row of data.rows) {
      const objCd = row.obj_cd;
      if (!result[objCd]) {
        result[objCd] = { couponRate: null, fundRate: null };
      }
      const rate = row.rate != null ? Number(row.rate) : null;
      if (row.leg_tp === 'Coupon') {
        result[objCd].couponRate = rate;
      } else if (row.leg_tp === 'Fund') {
        result[objCd].fundRate = rate;
      }
    }

    return result;
  } catch (error) {
    console.error('Database Error:', error);
    return {};
  }
}

// 통화별 자산-MTM-캐리 집계 타입
export type CurrencyCarrySummary = {
  curr: string;
  count: number;
  totalNotional: number;  // 원화: 원, USD: 달러
  totalMtm: number;       // 항상 원화(KRW)
  avgCarry: number | null; // 소수 (예: 0.0234 = 2.34%)
};

export type CarryAggregation = {
  byCurrency: CurrencyCarrySummary[];
  totalNotionalKrw: number;  // USD 환산 포함 전체 노셔널 (원화)
  totalMtm: number;          // 전체 MTM (원화)
  totalAvgCarry: number | null; // 전체 가중평균 캐리
  usdKrwRate: number;
};

// 노셔널 가중 평균 캐리 + 자산/MTM 집계 (원화/외화/전체)
export async function fetchWeightedAvgCarry(): Promise<CarryAggregation> {
  noStore();

  const emptyResult: CarryAggregation = {
    byCurrency: [],
    totalNotionalKrw: 0,
    totalMtm: 0,
    totalAvgCarry: null,
    usdKrwRate: 1450,
  };

  try {
    // 자산 종목별 노셔널, MTM(avg_prc), 캐리를 조인
    const [data, fxResult] = await Promise.all([
      sql`
        WITH latest_swap AS (
          SELECT DISTINCT ON (obj_cd)
            obj_cd, avg_prc
          FROM swap_prc
          WHERE fnd_cd = '10206020'
          ORDER BY obj_cd, std_dt DESC
        ),
        latest_rates AS (
          SELECT DISTINCT ON (obj_cd, leg_tp)
            obj_cd, leg_tp, rate
          FROM strucfe_accint
          WHERE eval_mdul_cd = '3'
          ORDER BY obj_cd, leg_tp, std_dt DESC
        )
        SELECT
          p.curr,
          COUNT(*) AS cnt,
          SUM(p.notn) AS total_notional,
          SUM(s.avg_prc) AS total_mtm,
          SUM(p.notn * (COALESCE(c.rate, 0) - COALESCE(f.rate, 0))) AS weighted_carry
        FROM strucprdp p
        LEFT JOIN latest_swap s ON s.obj_cd = p.obj_cd
        LEFT JOIN latest_rates c ON c.obj_cd = p.obj_cd AND c.leg_tp = 'Coupon'
        LEFT JOIN latest_rates f ON f.obj_cd = p.obj_cd AND f.leg_tp = 'Fund'
        WHERE p.asst_lblt = '자산'
          AND (p.call_yn = 'N' OR p.call_yn IS NULL)
          AND p.fnd_cd = '10206020'
        GROUP BY p.curr
        ORDER BY p.curr
      `,
      // USD/KRW 환율
      sql`
        SELECT close_value FROM tb_macro_index
        WHERE ticker = 'USD/KRW' AND asset_class = 'FX'
        ORDER BY base_date DESC LIMIT 1
      `,
    ]);

    const usdKrwRate = fxResult.rows.length > 0
      ? Number(fxResult.rows[0].close_value) : 1450;

    const byCurrency: CurrencyCarrySummary[] = [];
    let totalNotionalKrw = 0;
    let totalMtm = 0;
    let totalWeightedCarryKrw = 0;

    for (const row of data.rows) {
      const curr = row.curr as string;
      const count = Number(row.cnt);
      const notional = Number(row.total_notional);
      const mtm = Number(row.total_mtm) || 0;
      const weightedCarry = Number(row.weighted_carry) || 0;
      const avgCarry = notional > 0 ? weightedCarry / notional : null;

      byCurrency.push({ curr, count, totalNotional: notional, totalMtm: mtm, avgCarry });

      // 전체 합산 (원화 기준)
      // MTM은 이미 원화 (USD 종목도 swap_prc에서 원화 환산)
      totalMtm += mtm;
      if (curr === 'KRW') {
        totalNotionalKrw += notional;
        totalWeightedCarryKrw += weightedCarry;
      } else if (curr === 'USD') {
        totalNotionalKrw += notional * usdKrwRate;
        totalWeightedCarryKrw += weightedCarry * usdKrwRate;
      }
    }

    const totalAvgCarry = totalNotionalKrw > 0
      ? totalWeightedCarryKrw / totalNotionalKrw : null;

    return { byCurrency, totalNotionalKrw, totalMtm, totalAvgCarry, usdKrwRate };
  } catch (error) {
    console.error('Database Error:', error);
    return emptyResult;
  }
}

// 캐리스왑 매칭 (자산→MTM→캐리 full set) 기준 통화별 집계
export type TpSetRow = {
  curr: string;
  assetCount: number;      // 자산 건수
  assetNotional: number;   // 자산 노셔널 (KRW→원, USD→달러)
  totalMtm: number;        // 최근일 MTM 합계 (원화)
  prevMtm: number;         // 전영업일 MTM 합계 (원화)
  mtmChange: number;       // 전체 set 가격변동 (최근일 - 전영업일)
  carryMtmChange: number;  // 캐리 전용 가격변동 (최근일 - 전영업일)
  avgCarry: number | null; // 자산 기준 가중평균 캐리
};

export type TpAggregation = {
  rows: TpSetRow[];
  usdKrwRate: number;
  latestDate: string;      // 최근 기준일
  prevDate: string;        // 전영업일
};

export async function fetchTpAggregation(): Promise<TpAggregation> {
  noStore();

  try {
    const [data, fxResult, datesResult] = await Promise.all([
      sql`
        WITH full_sets AS (
          SELECT eff_dt, curr
          FROM strucprdp
          WHERE fnd_cd = '10206020'
            AND tp IN ('자산','MTM','캐리')
            AND (call_yn = 'N' OR call_yn IS NULL)
          GROUP BY eff_dt, curr
          HAVING COUNT(DISTINCT tp) FILTER (WHERE tp IN ('자산','MTM','캐리')) = 3
        ),
        latest_rates AS (
          SELECT DISTINCT ON (obj_cd, leg_tp)
            obj_cd, leg_tp, rate
          FROM strucfe_accint
          WHERE eval_mdul_cd = '3'
          ORDER BY obj_cd, leg_tp, std_dt DESC
        ),
        top2dates AS (
          SELECT DISTINCT std_dt FROM swap_prc
          WHERE fnd_cd = '10206020'
          ORDER BY std_dt DESC LIMIT 2
        ),
        swap_latest AS (
          SELECT obj_cd, avg_prc
          FROM swap_prc
          WHERE fnd_cd = '10206020'
            AND std_dt = (SELECT MAX(std_dt) FROM top2dates)
        ),
        swap_prev AS (
          SELECT obj_cd, avg_prc
          FROM swap_prc
          WHERE fnd_cd = '10206020'
            AND std_dt = (SELECT MIN(std_dt) FROM top2dates)
        )
        SELECT
          p.curr,
          COUNT(*) FILTER (WHERE p.tp = '자산') AS asset_cnt,
          SUM(p.notn) FILTER (WHERE p.tp = '자산') AS asset_notn,
          SUM(COALESCE(sl.avg_prc, 0)) AS total_mtm,
          SUM(COALESCE(sp.avg_prc, 0)) AS prev_mtm,
          SUM(COALESCE(sl.avg_prc, 0)) FILTER (WHERE p.tp = '캐리') AS carry_mtm_latest,
          SUM(COALESCE(sp.avg_prc, 0)) FILTER (WHERE p.tp = '캐리') AS carry_mtm_prev,
          CASE WHEN SUM(p.notn) FILTER (WHERE p.tp = '자산') > 0
            THEN SUM(p.notn * (COALESCE(c.rate, 0) - COALESCE(f.rate, 0)))
                 FILTER (WHERE p.tp = '자산')
                 / SUM(p.notn) FILTER (WHERE p.tp = '자산')
            ELSE NULL
          END AS avg_carry
        FROM strucprdp p
        INNER JOIN full_sets fs ON fs.eff_dt = p.eff_dt AND fs.curr = p.curr
        LEFT JOIN latest_rates c ON c.obj_cd = p.obj_cd AND c.leg_tp = 'Coupon'
        LEFT JOIN latest_rates f ON f.obj_cd = p.obj_cd AND f.leg_tp = 'Fund'
        LEFT JOIN swap_latest sl ON sl.obj_cd = p.obj_cd
        LEFT JOIN swap_prev sp ON sp.obj_cd = p.obj_cd
        WHERE p.fnd_cd = '10206020'
          AND p.tp IN ('자산','MTM','캐리')
          AND (p.call_yn = 'N' OR p.call_yn IS NULL)
        GROUP BY p.curr
        ORDER BY p.curr
      `,
      sql`
        SELECT close_value FROM tb_macro_index
        WHERE ticker = 'USD/KRW' AND asset_class = 'FX'
        ORDER BY base_date DESC LIMIT 1
      `,
      sql`
        SELECT DISTINCT std_dt FROM swap_prc
        WHERE fnd_cd = '10206020'
        ORDER BY std_dt DESC LIMIT 2
      `,
    ]);

    const usdKrwRate = fxResult.rows.length > 0
      ? Number(fxResult.rows[0].close_value) : 1450;

    // 최근 2영업일 날짜
    const dates = datesResult.rows.map((r) => r.std_dt as string).sort();
    const latestDate = dates.length > 0 ? dates[dates.length - 1] : '';
    const prevDate = dates.length > 1 ? dates[0] : '';

    const rows: TpSetRow[] = data.rows.map((row) => {
      const mtm = Number(row.total_mtm) || 0;
      const prev = Number(row.prev_mtm) || 0;
      const carryLatest = Number(row.carry_mtm_latest) || 0;
      const carryPrev = Number(row.carry_mtm_prev) || 0;
      return {
        curr: row.curr as string,
        assetCount: Number(row.asset_cnt),
        assetNotional: Number(row.asset_notn),
        totalMtm: mtm,
        prevMtm: prev,
        mtmChange: mtm - prev,
        carryMtmChange: carryLatest - carryPrev,
        avgCarry: row.avg_carry != null ? Number(row.avg_carry) : null,
      };
    });

    return { rows, usdKrwRate, latestDate, prevDate };
  } catch (error) {
    console.error('Database Error:', error);
    return { rows: [], usdKrwRate: 1450, latestDate: '', prevDate: '' };
  }
}

export async function fetchStrucprdpById(objCd: string): Promise<Strucprdp | null> {
  noStore();

  try {
    const data = await sql<Strucprdp>`
      SELECT * FROM strucprdp WHERE obj_cd = ${objCd}
    `;
    return data.rows[0] || null;
  } catch (error) {
    console.error('Database Error:', error);
    return null;
  }
}

// --- Gapping BTB Delta ---
// 자산(tp='자산')의 잔존만기별 Delta = Notional × 0.0001 (1bp)
export type GappingDeltaItem = {
  tenor: string;       // 테너 라벨 (예: "5Y", "10Y", "15Y")
  tenorYears: number;  // 정렬용 연 수
  krwDelta: number;    // KRW 델타 합계
  usdDelta: number;    // USD 델타 합계
};

export type GappingDeltaSummary = {
  items: GappingDeltaItem[];
  totalKrw: number;
  totalUsd: number;
  usdKrwRate: number;  // 최신 USD/KRW 환율
};

export async function fetchGappingBtbDelta(): Promise<GappingDeltaSummary> {
  noStore();

  try {
    const [data, fxResult] = await Promise.all([
      sql`
        SELECT obj_cd, curr, notn, mat_dt
        FROM strucprdp
        WHERE tp = '자산'
          AND (call_yn = 'N' OR call_yn IS NULL)
          AND fnd_cd = '10206020'
          AND mat_dt IS NOT NULL
        ORDER BY mat_dt
      `,
      sql`
        SELECT close_value FROM tb_macro_index
        WHERE ticker = 'USD/KRW' AND asset_class = 'FX'
        ORDER BY base_date DESC LIMIT 1
      `,
    ]);

    const usdKrwRate = fxResult.rows.length > 0
      ? Number(fxResult.rows[0].close_value) : 1450;

    const today = new Date();
    const todayMs = today.getTime();

    // 테너 버킷: 1Y 단위 (예: 5Y, 6Y, ... 20Y, 21Y)
    const buckets = new Map<number, { krw: number; usd: number }>();
    let totalKrw = 0;
    let totalUsd = 0;

    for (const row of data.rows) {
      const notn = Number(row.notn) || 0;
      if (notn === 0) continue;

      // 만기일 파싱 (YYYYMMDD 형식)
      const matStr = String(row.mat_dt).replace(/-/g, '');
      if (matStr.length !== 8) continue;
      const matDate = new Date(
        Number(matStr.slice(0, 4)),
        Number(matStr.slice(4, 6)) - 1,
        Number(matStr.slice(6, 8)),
      );
      const remainingDays = (matDate.getTime() - todayMs) / (1000 * 60 * 60 * 24);
      if (remainingDays <= 0) continue;

      const remainingYears = remainingDays / 365.25;
      // 1Y 단위 버킷으로 반올림 (예: 5.3Y → 5Y, 5.7Y → 6Y)
      const bucket = Math.round(remainingYears);

      // DV01 ≈ Notional × 0.0001 × 잔존만기(년)
      const delta = notn * 0.0001 * remainingYears;
      const curr = String(row.curr).toUpperCase();

      if (!buckets.has(bucket)) {
        buckets.set(bucket, { krw: 0, usd: 0 });
      }
      const b = buckets.get(bucket)!;
      if (curr === 'USD') {
        b.usd += delta;
        totalUsd += delta;
      } else {
        b.krw += delta;
        totalKrw += delta;
      }
    }

    // 정렬된 배열로 변환
    const items: GappingDeltaItem[] = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, val]) => ({
        tenor: `${year}Y`,
        tenorYears: year,
        krwDelta: Math.round(val.krw),
        usdDelta: Math.round(val.usd),
      }));

    return { items, totalKrw: Math.round(totalKrw), totalUsd: Math.round(totalUsd), usdKrwRate };
  } catch (error) {
    console.error('fetchGappingBtbDelta Error:', error);
    return { items: [], totalKrw: 0, totalUsd: 0, usdKrwRate: 1450 };
  }
}

/**
 * USD 종목별 발행일(eff_dt) -1 영업일의 USD/KRW MAR 환율 조회
 * eq_unasp 테이블에서 unas_id='USD/KRW_MAR' 기준
 * 반환: { obj_cd → mar_rate }
 */
export async function fetchUsdMarRates(): Promise<Record<string, number>> {
  noStore();

  try {
    // USD 종목의 eff_dt 목록
    const products = await sql`
      SELECT obj_cd, eff_dt FROM strucprdp
      WHERE curr = 'USD' AND fnd_cd = '10206020' AND tp != '자체발행'
    `;

    if (products.rows.length === 0) return {};

    // 모든 USD/KRW_MAR 데이터 가져오기 (eff_dt -1 영업일 매칭용)
    const marData = await sql`
      SELECT std_dt, clprc_val FROM eq_unasp
      WHERE unas_id = 'USD/KRW_MAR'
      ORDER BY std_dt ASC
    `;

    // std_dt 배열로 변환 (영업일 목록)
    const marMap: Record<string, number> = {};
    const dates: string[] = [];
    for (const r of marData.rows) {
      const dt = String(r.std_dt);
      marMap[dt] = Number(r.clprc_val);
      dates.push(dt);
    }

    // 각 종목의 eff_dt -1 영업일 MAR 찾기
    const result: Record<string, number> = {};
    for (const p of products.rows) {
      const objCd = String(p.obj_cd);
      const effDt = String(p.eff_dt);

      // eff_dt보다 작은 가장 큰 날짜 = -1 영업일
      let prevBizDay: string | null = null;
      for (let i = dates.length - 1; i >= 0; i--) {
        if (dates[i] < effDt) {
          prevBizDay = dates[i];
          break;
        }
      }

      if (prevBizDay && marMap[prevBizDay]) {
        result[objCd] = marMap[prevBizDay];
      }
    }

    return result;
  } catch (error) {
    console.error('fetchUsdMarRates Error:', error);
    return {};
  }
}

// =============================================
// PnL 관련 함수 (breakdownprc + excpnp)
// =============================================

/**
 * 종목별 Daily PnL 조회
 * 전체 TP(자산/MTM/캐리) 합산: breakdownprc 최근일 - 전일 avg_prc
 * 쿠폰: excpnp에서 최근일 pay_dt에 해당하는 amt 합계
 */
export async function fetchProductDailyPnl(): Promise<{
  pnlMap: Record<string, ProductDailyPnl>;
  latestDate: string;
  prevDate: string;
  usdMarRate: number;
}> {
  noStore();

  try {
    // 최근 2영업일 조회
    const datesResult = await sql`
      SELECT DISTINCT std_dt FROM breakdownprc
      ORDER BY std_dt DESC LIMIT 2
    `;
    if (datesResult.rows.length < 2) {
      return { pnlMap: {}, latestDate: '', prevDate: '', usdMarRate: 0 };
    }
    const latestDate = String(datesResult.rows[0].std_dt);
    const prevDate = String(datesResult.rows[1].std_dt);

    // 기준일(latestDate) -1 영업일의 USD/KRW_MAR 환율 조회
    const marResult = await sql`
      SELECT clprc_val FROM eq_unasp
      WHERE unas_id = 'USD/KRW_MAR' AND std_dt < ${latestDate}
      ORDER BY std_dt DESC LIMIT 1
    `;
    const usdMarRate = marResult.rows.length > 0 ? Number(marResult.rows[0].clprc_val) : 0;

    // 종목별 가격 변동 + 통화 — 전체 TP(자산/MTM/캐리) 합산
    const mtmResult = await sql`
      SELECT
        b1.obj_cd,
        s.curr,
        SUM(b1.avg_prc) AS today_mtm,
        SUM(b2.avg_prc) AS prev_mtm,
        SUM(b1.avg_prc) - SUM(b2.avg_prc) AS daily_pnl
      FROM breakdownprc b1
      JOIN breakdownprc b2
        ON b1.obj_cd = b2.obj_cd
        AND b1.sp_num = b2.sp_num
        AND b1.tp = b2.tp
      JOIN strucprdp s ON s.obj_cd = b1.obj_cd
      WHERE b1.std_dt = ${latestDate}
        AND b2.std_dt = ${prevDate}
      GROUP BY b1.obj_cd, s.curr
    `;

    // 최근일 쿠폰 유출입 (excpnp)
    const couponResult = await sql`
      SELECT obj_cd, SUM(amt) AS coupon_amt
      FROM excpnp
      WHERE pay_dt = ${latestDate}
      GROUP BY obj_cd
    `;

    const couponMap: Record<string, number> = {};
    for (const r of couponResult.rows) {
      couponMap[String(r.obj_cd)] = Number(r.coupon_amt);
    }

    const pnlMap: Record<string, ProductDailyPnl> = {};
    for (const r of mtmResult.rows) {
      const objCd = String(r.obj_cd);
      const curr = String(r.curr);
      let dailyPnl = Number(r.daily_pnl);
      let couponAmt = couponMap[objCd] || 0;
      let todayMtm = Number(r.today_mtm);
      let prevMtm = Number(r.prev_mtm);

      // USD 종목: MAR 환율로 나눠서 달러 기준 PnL
      if (curr === 'USD' && usdMarRate > 0) {
        dailyPnl = dailyPnl / usdMarRate;
        couponAmt = couponAmt / usdMarRate;
        todayMtm = todayMtm / usdMarRate;
        prevMtm = prevMtm / usdMarRate;
      }

      pnlMap[objCd] = {
        obj_cd: objCd,
        curr,
        today_mtm: todayMtm,
        prev_mtm: prevMtm,
        daily_pnl: dailyPnl,
        coupon_amt: couponAmt,
        total_pnl: dailyPnl + couponAmt,
      };
    }

    return { pnlMap, latestDate, prevDate, usdMarRate };
  } catch (error) {
    console.error('fetchProductDailyPnl Error:', error);
    return { pnlMap: {}, latestDate: '', prevDate: '', usdMarRate: 0 };
  }
}

/**
 * 통화 × 유형(type1)별 Daily PnL 요약
 */
export async function fetchPnlSummaryByType(): Promise<PnlSummaryByType[]> {
  noStore();

  try {
    const datesResult = await sql`
      SELECT DISTINCT std_dt FROM breakdownprc
      ORDER BY std_dt DESC LIMIT 2
    `;
    if (datesResult.rows.length < 2) return [];
    const latestDate = String(datesResult.rows[0].std_dt);
    const prevDate = String(datesResult.rows[1].std_dt);

    // 기준일 -1 영업일의 USD/KRW_MAR 환율
    const marResult = await sql`
      SELECT clprc_val FROM eq_unasp
      WHERE unas_id = 'USD/KRW_MAR' AND std_dt < ${latestDate}
      ORDER BY std_dt DESC LIMIT 1
    `;
    const usdMarRate = marResult.rows.length > 0 ? Number(marResult.rows[0].clprc_val) : 0;

    const result = await sql`
      SELECT
        s.curr,
        COALESCE(NULLIF(s.type1, ''), '기타') AS type1,
        COUNT(DISTINCT b1.obj_cd) AS count,
        SUM(b1.avg_prc - b2.avg_prc) AS total_daily_pnl,
        COALESCE(SUM(e.coupon_amt), 0) AS total_coupon
      FROM breakdownprc b1
      JOIN breakdownprc b2
        ON b1.obj_cd = b2.obj_cd
        AND b1.sp_num = b2.sp_num
        AND b1.tp = b2.tp
      JOIN strucprdp s ON s.obj_cd = b1.obj_cd
      LEFT JOIN (
        SELECT obj_cd, SUM(amt) AS coupon_amt
        FROM excpnp WHERE pay_dt = ${latestDate}
        GROUP BY obj_cd
      ) e ON e.obj_cd = b1.obj_cd
      WHERE b1.std_dt = ${latestDate}
        AND b2.std_dt = ${prevDate}
        AND s.fnd_cd = '10206020'
        AND s.tp != '자체발행'
      GROUP BY s.curr, COALESCE(NULLIF(s.type1, ''), '기타')
      ORDER BY s.curr, ABS(SUM(b1.avg_prc - b2.avg_prc)) DESC
    `;

    return result.rows.map((r) => {
      const curr = String(r.curr);
      let totalDailyPnl = Number(r.total_daily_pnl);
      let totalCoupon = Number(r.total_coupon);

      // USD 통화: MAR 환율로 나눠서 달러 기준
      if (curr === 'USD' && usdMarRate > 0) {
        totalDailyPnl = totalDailyPnl / usdMarRate;
        totalCoupon = totalCoupon / usdMarRate;
      }

      return {
        curr,
        type1: String(r.type1),
        count: Number(r.count),
        total_daily_pnl: totalDailyPnl,
        total_coupon: totalCoupon,
        total_pnl: totalDailyPnl + totalCoupon,
      };
    });
  } catch (error) {
    console.error('fetchPnlSummaryByType Error:', error);
    return [];
  }
}
