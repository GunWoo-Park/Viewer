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

    // USD 자산 상품별 MAR 환율 기반 원화환산 합계
    const marRates = await fetchUsdMarRates();
    const usdProducts = await sql`
      SELECT obj_cd, notn FROM strucprdp
      WHERE curr = 'USD' AND asst_lblt = '자산'
        AND (call_yn = 'N' OR call_yn IS NULL)
        AND fnd_cd = '10206020' AND tp != '자체발행'
    `;
    let usdAssetNotionalMarKrw = 0;
    let usdNotnForWeighted = 0;
    for (const p of usdProducts.rows) {
      const objCd = String(p.obj_cd);
      const notn = Number(p.notn);
      const mar = marRates[objCd] || usdKrwRate;
      usdAssetNotionalMarKrw += notn * mar;
      usdNotnForWeighted += notn;
    }
    const usdMarWeightedRate = usdNotnForWeighted > 0
      ? usdAssetNotionalMarKrw / usdNotnForWeighted
      : usdKrwRate;

    return {
      totalCount: Number(countData.rows[0].total),
      krwCount: Number(countData.rows[0].krw_count),
      usdCount: Number(countData.rows[0].usd_count),
      krwAssetCount: Number(countData.rows[0].krw_count),
      usdAssetCount: Number(countData.rows[0].usd_count),
      krwAssetNotional: Number(countData.rows[0].krw_asset_notional),
      usdAssetNotional: Number(countData.rows[0].usd_asset_notional),
      usdKrwRate,
      usdAssetNotionalMarKrw,
      usdMarWeightedRate,
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
  tpFilter: string = 'ASSET',
): Promise<Strucprdp[]> {
  noStore();

  try {
    // callFilter: 'Y' = 콜된 종목만, 'N' = 미콜 종목만(기본), 'ALL' = 전체
    // tpFilter: 'ASSET' = 자체발행 제외(기본), 'SELF' = 자체발행만, 'ALL' = 전체
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
        AND (
          ${tpFilter} = 'ALL'
          OR (${tpFilter} = 'ASSET' AND tp != '자체발행')
          OR (${tpFilter} = 'SELF' AND tp = '자체발행')
        )
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
  totalMtm: number;        // 최근일 MTM 합계 (USD는 달러 기준)
  prevMtm: number;         // 전영업일 MTM 합계 (USD는 달러 기준)
  mtmChange: number;       // 전체 set 가격변동 (USD는 달러 기준)
  carryMtmChange: number;  // 캐리 전용 가격변동 (USD는 달러 기준)
  couponAmt: number;       // 실현이자 (USD는 달러 기준)
  avgCarry: number | null; // 자산 기준 가중평균 캐리
  totalMtmKrw: number;     // 원화 환산 MTM 합계
  prevMtmKrw: number;      // 원화 환산 전일 MTM
  mtmChangeKrw: number;    // 원화 환산 일간 변동
  carryMtmChangeKrw: number;
  couponAmtKrw: number;
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
    // breakdownprc 기준 최근 2영업일
    const datesResult = await sql`
      SELECT DISTINCT std_dt FROM breakdownprc
      ORDER BY std_dt DESC LIMIT 2
    `;
    const dates = datesResult.rows.map((r) => String(r.std_dt)).sort();
    const latestDate = dates.length > 0 ? dates[dates.length - 1] : '';
    const prevDate = dates.length > 1 ? dates[0] : '';

    if (!latestDate || !prevDate) {
      return { rows: [], usdKrwRate: 1450, latestDate: '', prevDate: '' };
    }

    // dual MAR: 당일-1영업일, 전일-1영업일 각각 조회
    const [latestMar, prevMar] = await Promise.all([
      getMarRateBeforeDate(latestDate),
      getMarRateBeforeDate(prevDate),
    ]);

    const [data, fxResult] = await Promise.all([
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
        bprc_latest AS (
          SELECT obj_cd, SUM(avg_prc) AS avg_prc
          FROM breakdownprc
          WHERE std_dt = ${latestDate}
          GROUP BY obj_cd
        ),
        bprc_prev AS (
          SELECT obj_cd, SUM(avg_prc) AS avg_prc
          FROM breakdownprc
          WHERE std_dt = ${prevDate}
          GROUP BY obj_cd
        ),
        coupon_latest AS (
          SELECT obj_cd, SUM(amt) AS coupon_amt
          FROM excpnp
          WHERE pay_dt = ${latestDate}
          GROUP BY obj_cd
        )
        SELECT
          p.curr,
          COUNT(*) FILTER (WHERE p.tp = '자산') AS asset_cnt,
          SUM(p.notn) FILTER (WHERE p.tp = '자산') AS asset_notn,
          SUM(COALESCE(bl.avg_prc, 0)) AS total_mtm,
          SUM(COALESCE(bp.avg_prc, 0)) AS prev_mtm,
          SUM(COALESCE(bl.avg_prc, 0)) FILTER (WHERE p.tp = '캐리') AS carry_mtm_latest,
          SUM(COALESCE(bp.avg_prc, 0)) FILTER (WHERE p.tp = '캐리') AS carry_mtm_prev,
          COALESCE(SUM(cl.coupon_amt), 0) AS total_coupon,
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
        LEFT JOIN bprc_latest bl ON bl.obj_cd = p.obj_cd
        LEFT JOIN bprc_prev bp ON bp.obj_cd = p.obj_cd
        LEFT JOIN coupon_latest cl ON cl.obj_cd = p.obj_cd
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
    ]);

    const usdKrwRate = fxResult.rows.length > 0
      ? Number(fxResult.rows[0].close_value) : 1450;

    const rows: TpSetRow[] = data.rows.map((row) => {
      const curr = row.curr as string;
      let mtm = Number(row.total_mtm) || 0;
      let prev = Number(row.prev_mtm) || 0;
      let carryLatest = Number(row.carry_mtm_latest) || 0;
      let carryPrev = Number(row.carry_mtm_prev) || 0;
      let couponAmt = Number(row.total_coupon) || 0;

      // USD: 각 날짜별 MAR로 나눠서 달러 기준 변환
      if (curr === 'USD' && latestMar > 0 && prevMar > 0) {
        mtm = mtm / latestMar;
        prev = prev / prevMar;
        carryLatest = carryLatest / latestMar;
        carryPrev = carryPrev / prevMar;
        couponAmt = couponAmt / latestMar;
      }

      const mtmChange = mtm - prev;
      const carryMtmChange = carryLatest - carryPrev;

      // KRW 환산: USD는 달러 PnL × latestMar
      const krwMul = (curr === 'USD' && latestMar > 0) ? latestMar : 1;

      return {
        curr,
        assetCount: Number(row.asset_cnt),
        assetNotional: Number(row.asset_notn),
        totalMtm: mtm,
        prevMtm: prev,
        mtmChange,
        carryMtmChange,
        couponAmt,
        avgCarry: row.avg_carry != null ? Number(row.avg_carry) : null,
        totalMtmKrw: mtm * krwMul,
        prevMtmKrw: prev * krwMul,
        mtmChangeKrw: mtmChange * krwMul,
        carryMtmChangeKrw: carryMtmChange * krwMul,
        couponAmtKrw: couponAmt * krwMul,
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

/**
 * RISK 탭 상단 카드용: 스왑 유형별 평가금액 합계
 * - 자체발행 부채: asst_lblt='부채' AND tp='자체발행'
 * - MTM헤지: tp='MTM' (자산스왑 MTM 변동성 상쇄 목적)
 * swap_prc 최신 avg_prc 기준
 */
export type SwapTypeValuation = {
  totalPrc: number;
  count: number;
  stdDt: string;
};

export async function fetchRiskSwapValuations(stdDt?: string): Promise<{
  selfIssued: SwapTypeValuation;
  mtmHedge: SwapTypeValuation;
  availableDates: string[];
}> {
  noStore();
  try {
    // swap_prc에서 조회 가능한 날짜 목록
    const datesResult = await sql`
      SELECT DISTINCT std_dt FROM swap_prc
      WHERE fnd_cd = '10206020'
      ORDER BY std_dt DESC
    `;
    const availableDates = datesResult.rows.map((r) => String(r.std_dt));

    // 조회 대상 날짜 결정
    const targetDt = stdDt && availableDates.includes(stdDt) ? stdDt : availableDates[0] || '';

    const [selfResult, mtmResult] = await Promise.all([
      sql`
        SELECT COALESCE(SUM(s.avg_prc), 0) AS total_prc,
               COUNT(DISTINCT p.obj_cd) AS cnt,
               MAX(s.std_dt) AS latest_dt
        FROM strucprdp p
        JOIN swap_prc s ON s.obj_cd = p.obj_cd AND s.std_dt = ${targetDt}
        WHERE p.asst_lblt = '부채' AND p.tp = '자체발행' AND p.fnd_cd = '10206020'
          AND s.fnd_cd = '10206020'
          AND (p.type4 IS NULL OR p.type4 NOT IN ('Index', 'Floater'))
      `,
      sql`
        SELECT COALESCE(SUM(s.avg_prc), 0) AS total_prc,
               COUNT(DISTINCT p.obj_cd) AS cnt,
               MAX(s.std_dt) AS latest_dt
        FROM strucprdp p
        JOIN swap_prc s ON s.obj_cd = p.obj_cd AND s.std_dt = ${targetDt}
        WHERE p.tp = 'MTM' AND p.fnd_cd = '10206020'
          AND (p.call_yn = 'N' OR p.call_yn IS NULL)
          AND s.fnd_cd = '10206020'
      `,
    ]);

    const s = selfResult.rows[0];
    const m = mtmResult.rows[0];
    return {
      selfIssued: {
        totalPrc: Number(s?.total_prc || 0),
        count: Number(s?.cnt || 0),
        stdDt: String(s?.latest_dt || ''),
      },
      mtmHedge: {
        totalPrc: Number(m?.total_prc || 0),
        count: Number(m?.cnt || 0),
        stdDt: String(m?.latest_dt || ''),
      },
      availableDates,
    };
  } catch (error) {
    console.error('fetchRiskSwapValuations Error:', error);
    return {
      selfIssued: { totalPrc: 0, count: 0, stdDt: '' },
      mtmHedge: { totalPrc: 0, count: 0, stdDt: '' },
      availableDates: [],
    };
  }
}

/**
 * Wink(swap_prc) vs 보고손익(breakdownprc) 가격 차이 조회
 * 공통 std_dt 기준, 차이가 임계값 이상인 종목만 반환
 */
export type PriceDiffRow = {
  objCd: string;
  cntrNm: string;
  curr: string;
  tp: string;
  winkPrc: number;       // swap_prc avg_prc
  reportPrc: number;     // breakdownprc SUM(avg_prc)
  diff: number;          // wink - report
  diffEok: number;       // 차이 억 단위
};

export async function fetchPriceDiff(stdDt?: string): Promise<{
  rows: PriceDiffRow[];
  stdDt: string;
  totalDiff: number;
}> {
  noStore();
  try {
    // 공통 최신 날짜 결정
    let targetDt = stdDt;
    if (!targetDt) {
      const dtRes = await sql`
        SELECT MAX(s.std_dt) AS dt
        FROM (SELECT DISTINCT std_dt FROM swap_prc WHERE fnd_cd = '10206020') s
        JOIN (SELECT DISTINCT std_dt FROM breakdownprc) b ON b.std_dt = s.std_dt
      `;
      targetDt = String(dtRes.rows[0]?.dt || '');
    }
    if (!targetDt) return { rows: [], stdDt: '', totalDiff: 0 };

    const result = await sql`
      WITH swap AS (
        SELECT obj_cd, avg_prc FROM swap_prc
        WHERE std_dt = ${targetDt} AND fnd_cd = '10206020'
      ),
      bd AS (
        SELECT obj_cd, SUM(avg_prc) AS avg_prc FROM breakdownprc
        WHERE std_dt = ${targetDt} GROUP BY obj_cd
      )
      SELECT s.obj_cd, p.cntr_nm, p.curr, p.tp,
             s.avg_prc AS wink_prc, b.avg_prc AS report_prc,
             s.avg_prc - b.avg_prc AS diff
      FROM swap s
      JOIN bd b ON b.obj_cd = s.obj_cd
      JOIN strucprdp p ON p.obj_cd = s.obj_cd AND p.fnd_cd = '10206020'
      WHERE ABS(s.avg_prc - b.avg_prc) > 100
      ORDER BY ABS(s.avg_prc - b.avg_prc) DESC
    `;

    const rows: PriceDiffRow[] = result.rows.map((r) => ({
      objCd: String(r.obj_cd),
      cntrNm: String(r.cntr_nm || ''),
      curr: String(r.curr || 'KRW'),
      tp: String(r.tp || ''),
      winkPrc: Number(r.wink_prc),
      reportPrc: Number(r.report_prc),
      diff: Number(r.diff),
      diffEok: Number(r.diff) / 100000000,
    }));

    const totalDiff = rows.reduce((s, r) => s + r.diff, 0);

    return { rows, stdDt: targetDt, totalDiff };
  } catch (error) {
    console.error('fetchPriceDiff Error:', error);
    return { rows: [], stdDt: '', totalDiff: 0 };
  }
}

// =============================================
// PnL 관련 함수 (breakdownprc + excpnp)
// =============================================

/**
 * 특정 날짜 -1 영업일의 USD/KRW_MAR 환율 조회 헬퍼
 */
async function getMarRateBeforeDate(targetDate: string): Promise<number> {
  const r = await sql`
    SELECT clprc_val FROM eq_unasp
    WHERE unas_id = 'USD/KRW_MAR' AND std_dt < ${targetDate}
    ORDER BY std_dt DESC LIMIT 1
  `;
  return r.rows.length > 0 ? Number(r.rows[0].clprc_val) : 0;
}

/**
 * call_yn 자동 감지 및 업데이트
 * 발행일(eff_dt) 이후 breakdownprc의 전체 TP MTM 합산이 0이 되면
 * 해당 종목은 조기상환(call)된 것으로 판단하여 call_yn='Y'로 업데이트
 * 최초 MTM=0이 된 날짜를 call_dt로 기록
 * @returns 업데이트된 종목 수
 */
export async function autoDetectCallYn(): Promise<{ updated: number; details: { obj_cd: string; call_dt: string }[] }> {
  noStore();
  try {
    // call_yn='N'인 종목 중, 발행일 이후 어떤 영업일에 MTM 합산=0인 종목 찾기
    const result = await sql`
      WITH zero_mtm AS (
        SELECT
          s.obj_cd,
          s.eff_dt,
          b.std_dt,
          SUM(b.avg_prc) AS total_mtm
        FROM strucprdp s
        JOIN breakdownprc b ON b.obj_cd = s.obj_cd
        WHERE s.call_yn = 'N'
          AND b.std_dt > s.eff_dt
        GROUP BY s.obj_cd, s.eff_dt, b.std_dt
        HAVING ABS(SUM(b.avg_prc)) < 0.01
      ),
      first_zero AS (
        SELECT obj_cd, MIN(std_dt) AS call_dt
        FROM zero_mtm
        GROUP BY obj_cd
      )
      SELECT obj_cd, call_dt FROM first_zero ORDER BY obj_cd
    `;

    const details: { obj_cd: string; call_dt: string }[] = [];

    for (const row of result.rows) {
      const objCd = String(row.obj_cd);
      const callDt = String(row.call_dt);
      // call_yn='Y', call_dt 업데이트
      await sql`
        UPDATE strucprdp
        SET call_yn = 'Y', call_dt = ${callDt}, updated_at = NOW()
        WHERE obj_cd = ${objCd} AND call_yn = 'N'
      `;
      details.push({ obj_cd: objCd, call_dt: callDt });
    }

    return { updated: details.length, details };
  } catch (error) {
    console.error('autoDetectCallYn Error:', error);
    return { updated: 0, details: [] };
  }
}

/**
 * breakdownprc에 존재하는 영업일 목록 (최신 → 과거 순)
 */
export async function fetchAvailableDates(): Promise<string[]> {
  noStore();
  try {
    const result = await sql`
      SELECT DISTINCT std_dt FROM breakdownprc ORDER BY std_dt DESC
    `;
    return result.rows.map((r) => String(r.std_dt));
  } catch (error) {
    console.error('fetchAvailableDates Error:', error);
    return [];
  }
}

/**
 * 종목별 Daily PnL 조회
 * targetDate를 지정하면 해당일 기준, 미지정시 최신일 기준
 * USD PnL = (당일가격/당일-1MAR) - (전일가격/전일-1MAR)
 * USD 쿠폰 = coupon_amt / (pay_dt-1영업일 MAR)
 */
export async function fetchProductDailyPnl(targetDate?: string): Promise<{
  pnlMap: Record<string, ProductDailyPnl>;
  latestDate: string;
  prevDate: string;
  latestMar: number;
  prevMar: number;
}> {
  noStore();

  try {
    // targetDate 기준 또는 최신 2영업일 조회
    let latestDate: string;
    let prevDate: string;

    if (targetDate) {
      // targetDate 직전 영업일을 prevDate로 사용
      const datesResult = await sql`
        SELECT DISTINCT std_dt FROM breakdownprc
        WHERE std_dt <= ${targetDate}
        ORDER BY std_dt DESC LIMIT 2
      `;
      if (datesResult.rows.length < 2) {
        return { pnlMap: {}, latestDate: '', prevDate: '', latestMar: 0, prevMar: 0 };
      }
      latestDate = String(datesResult.rows[0].std_dt);
      prevDate = String(datesResult.rows[1].std_dt);
    } else {
      const datesResult = await sql`
        SELECT DISTINCT std_dt FROM breakdownprc
        ORDER BY std_dt DESC LIMIT 2
      `;
      if (datesResult.rows.length < 2) {
        return { pnlMap: {}, latestDate: '', prevDate: '', latestMar: 0, prevMar: 0 };
      }
      latestDate = String(datesResult.rows[0].std_dt);
      prevDate = String(datesResult.rows[1].std_dt);
    }

    // 당일-1영업일 MAR, 전일-1영업일 MAR 각각 조회
    const [latestMar, prevMar] = await Promise.all([
      getMarRateBeforeDate(latestDate),
      getMarRateBeforeDate(prevDate),
    ]);

    // 종목별 가격 변동 + 통화 — 전체 TP(자산/MTM/캐리) 합산
    const mtmResult = await sql`
      SELECT
        b1.obj_cd,
        s.curr,
        SUM(b1.avg_prc) AS today_mtm,
        SUM(b2.avg_prc) AS prev_mtm
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

    // 해당일 쿠폰 유출입 (prevDate < pay_dt <= latestDate 범위)
    const couponResult = await sql`
      SELECT obj_cd, SUM(amt) AS coupon_amt
      FROM excpnp
      WHERE pay_dt > ${prevDate} AND pay_dt <= ${latestDate}
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
      const todayMtmRaw = Number(r.today_mtm);
      const prevMtmRaw = Number(r.prev_mtm);
      const couponAmtRaw = couponMap[objCd] || 0;

      let todayMtm: number;
      let prevMtmVal: number;
      let couponAmt: number;

      // USD 종목: 각 날짜의 MAR로 나눠서 달러 기준
      // PnL = (당일가격/당일-1MAR) - (전일가격/전일-1MAR)
      if (curr === 'USD' && latestMar > 0 && prevMar > 0) {
        todayMtm = todayMtmRaw / latestMar;
        prevMtmVal = prevMtmRaw / prevMar;
        couponAmt = couponAmtRaw / latestMar;
      } else {
        todayMtm = todayMtmRaw;
        prevMtmVal = prevMtmRaw;
        couponAmt = couponAmtRaw;
      }

      const dailyPnl = todayMtm - prevMtmVal;
      const totalPnl = dailyPnl + couponAmt;

      // KRW 환산: USD 종목은 달러 PnL × latestMar, KRW는 원본값 그대로
      const krwMultiplier = (curr === 'USD' && latestMar > 0) ? latestMar : 1;
      const dailyPnlKrw = dailyPnl * krwMultiplier;
      const couponAmtKrw = couponAmt * krwMultiplier;

      pnlMap[objCd] = {
        obj_cd: objCd,
        curr,
        today_mtm: todayMtm,
        prev_mtm: prevMtmVal,
        daily_pnl: dailyPnl,
        coupon_amt: couponAmt,
        total_pnl: totalPnl,
        daily_pnl_krw: dailyPnlKrw,
        coupon_amt_krw: couponAmtKrw,
        total_pnl_krw: dailyPnlKrw + couponAmtKrw,
      };
    }

    return { pnlMap, latestDate, prevDate, latestMar, prevMar };
  } catch (error) {
    console.error('fetchProductDailyPnl Error:', error);
    return { pnlMap: {}, latestDate: '', prevDate: '', latestMar: 0, prevMar: 0 };
  }
}

/**
 * 통화 × 유형(struct_type: type1/type2/type3)별 Daily PnL 요약
 * targetDate를 지정하면 해당일 기준, 미지정시 최신일 기준
 * \를 ₩로 치환하여 반환
 */
export async function fetchPnlSummaryByType(targetDate?: string): Promise<PnlSummaryByType[]> {
  noStore();

  try {
    let latestDate: string;
    let prevDate: string;

    if (targetDate) {
      const datesResult = await sql`
        SELECT DISTINCT std_dt FROM breakdownprc
        WHERE std_dt <= ${targetDate}
        ORDER BY std_dt DESC LIMIT 2
      `;
      if (datesResult.rows.length < 2) return [];
      latestDate = String(datesResult.rows[0].std_dt);
      prevDate = String(datesResult.rows[1].std_dt);
    } else {
      const datesResult = await sql`
        SELECT DISTINCT std_dt FROM breakdownprc
        ORDER BY std_dt DESC LIMIT 2
      `;
      if (datesResult.rows.length < 2) return [];
      latestDate = String(datesResult.rows[0].std_dt);
      prevDate = String(datesResult.rows[1].std_dt);
    }

    const [latestMar, prevMar] = await Promise.all([
      getMarRateBeforeDate(latestDate),
      getMarRateBeforeDate(prevDate),
    ]);

    const result = await sql`
      SELECT
        s.curr,
        COALESCE(NULLIF(s.type1, ''), '기타') AS type1,
        COALESCE(
          CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')),
          '기타'
        ) AS struct_type,
        COUNT(DISTINCT b1.obj_cd) AS count,
        SUM(b1.avg_prc) AS today_mtm,
        SUM(b2.avg_prc) AS prev_mtm,
        COALESCE(SUM(e.coupon_amt), 0) AS total_coupon
      FROM breakdownprc b1
      JOIN breakdownprc b2
        ON b1.obj_cd = b2.obj_cd
        AND b1.sp_num = b2.sp_num
        AND b1.tp = b2.tp
      JOIN strucprdp s ON s.obj_cd = b1.obj_cd
      LEFT JOIN (
        SELECT obj_cd, SUM(amt) AS coupon_amt
        FROM excpnp WHERE pay_dt > ${prevDate} AND pay_dt <= ${latestDate}
        GROUP BY obj_cd
      ) e ON e.obj_cd = b1.obj_cd
      WHERE b1.std_dt = ${latestDate}
        AND b2.std_dt = ${prevDate}
        AND s.fnd_cd = '10206020'
        AND s.tp != '자체발행'
      GROUP BY s.curr, type1, struct_type
      ORDER BY s.curr, ABS(SUM(b1.avg_prc) - SUM(b2.avg_prc)) DESC
    `;

    // 자산 종목 수 + 액면 합계를 struct_type별로 별도 조회
    const assetResult = await sql`
      SELECT
        s.curr,
        COALESCE(
          CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')),
          '기타'
        ) AS struct_type,
        COUNT(DISTINCT s.obj_cd) AS asset_count,
        SUM(s.notn) AS total_notional
      FROM strucprdp s
      WHERE s.fnd_cd = '10206020'
        AND s.tp = '자산'
        AND s.call_yn = 'N'
      GROUP BY s.curr, struct_type
    `;

    // struct_type → { asset_count, total_notional } 맵 구축
    const assetMap: Record<string, { asset_count: number; total_notional: number }> = {};
    for (const r of assetResult.rows) {
      const key = `${String(r.curr)}::${String(r.struct_type).replace(/\\/g, '₩')}`;
      assetMap[key] = {
        asset_count: Number(r.asset_count),
        total_notional: Number(r.total_notional),
      };
    }

    return result.rows.map((r) => {
      const curr = String(r.curr);
      let todayMtm = Number(r.today_mtm);
      let prevMtm = Number(r.prev_mtm);
      let totalCoupon = Number(r.total_coupon);

      if (curr === 'USD' && latestMar > 0 && prevMar > 0) {
        todayMtm = todayMtm / latestMar;
        prevMtm = prevMtm / prevMar;
        totalCoupon = totalCoupon / latestMar;
      }

      const totalDailyPnl = todayMtm - prevMtm;
      const totalPnl = totalDailyPnl + totalCoupon;
      const krwMul = (curr === 'USD' && latestMar > 0) ? latestMar : 1;
      const totalDailyPnlKrw = totalDailyPnl * krwMul;
      const totalCouponKrw = totalCoupon * krwMul;

      const structType = String(r.struct_type).replace(/\\/g, '₩');
      const assetInfo = assetMap[`${curr}::${structType}`] || { asset_count: 0, total_notional: 0 };

      return {
        curr,
        type1: String(r.type1).replace(/\\/g, '₩'),
        struct_type: structType,
        count: Number(r.count),
        asset_count: assetInfo.asset_count,
        total_notional: assetInfo.total_notional,
        total_daily_pnl: totalDailyPnl,
        total_coupon: totalCoupon,
        total_pnl: totalPnl,
        total_daily_pnl_krw: totalDailyPnlKrw,
        total_coupon_krw: totalCouponKrw,
        total_pnl_krw: totalDailyPnlKrw + totalCouponKrw,
      };
    });
  } catch (error) {
    console.error('fetchPnlSummaryByType Error:', error);
    return [];
  }
}

/**
 * 모든 펀드 대상 유형(type1)별 Daily PnL 요약
 * 펀드 필터 없이 전체 구조화 상품의 PnL을 유형별로 집계
 */
export async function fetchPnlSummaryByTypeAllFunds(targetDate?: string): Promise<PnlSummaryByType[]> {
  noStore();

  try {
    let latestDate: string;
    let prevDate: string;

    if (targetDate) {
      // 지정 날짜와 그 직전 영업일
      latestDate = targetDate;
      const prevResult = await sql`
        SELECT DISTINCT std_dt FROM breakdownprc
        WHERE std_dt < ${targetDate}
        ORDER BY std_dt DESC LIMIT 1
      `;
      if (prevResult.rows.length === 0) return [];
      prevDate = String(prevResult.rows[0].std_dt);
    } else {
      const datesResult = await sql`
        SELECT DISTINCT std_dt FROM breakdownprc
        ORDER BY std_dt DESC LIMIT 2
      `;
      if (datesResult.rows.length < 2) return [];
      latestDate = String(datesResult.rows[0].std_dt);
      prevDate = String(datesResult.rows[1].std_dt);
    }

    const [latestMar, prevMar] = await Promise.all([
      getMarRateBeforeDate(latestDate),
      getMarRateBeforeDate(prevDate),
    ]);

    const result = await sql`
      SELECT
        s.curr,
        COALESCE(NULLIF(s.type1, ''), '기타') AS type1,
        COALESCE(
          CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')),
          '기타'
        ) AS struct_type,
        COUNT(DISTINCT b1.obj_cd) AS count,
        SUM(b1.avg_prc) AS today_mtm,
        SUM(b2.avg_prc) AS prev_mtm,
        COALESCE(SUM(e.coupon_amt), 0) AS total_coupon
      FROM breakdownprc b1
      JOIN breakdownprc b2
        ON b1.obj_cd = b2.obj_cd
        AND b1.sp_num = b2.sp_num
        AND b1.tp = b2.tp
      JOIN strucprdp s ON s.obj_cd = b1.obj_cd
      LEFT JOIN (
        SELECT obj_cd, SUM(amt) AS coupon_amt
        FROM excpnp WHERE pay_dt > ${prevDate} AND pay_dt <= ${latestDate}
        GROUP BY obj_cd
      ) e ON e.obj_cd = b1.obj_cd
      WHERE b1.std_dt = ${latestDate}
        AND b2.std_dt = ${prevDate}
        AND s.tp != '자체발행'
      GROUP BY s.curr, type1, struct_type
      ORDER BY s.curr, ABS(SUM(b1.avg_prc) - SUM(b2.avg_prc)) DESC
    `;

    // 자산 종목 수 + 액면 합계 (펀드 필터 없음)
    const assetResult = await sql`
      SELECT
        s.curr,
        COALESCE(
          CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')),
          '기타'
        ) AS struct_type,
        COUNT(DISTINCT s.obj_cd) AS asset_count,
        SUM(s.notn) AS total_notional
      FROM strucprdp s
      WHERE s.tp = '자산'
        AND s.call_yn = 'N'
      GROUP BY s.curr, struct_type
    `;
    const assetMap: Record<string, { asset_count: number; total_notional: number }> = {};
    for (const r of assetResult.rows) {
      const key = `${String(r.curr)}::${String(r.struct_type).replace(/\\/g, '₩')}`;
      assetMap[key] = {
        asset_count: Number(r.asset_count),
        total_notional: Number(r.total_notional),
      };
    }

    return result.rows.map((r) => {
      const curr = String(r.curr);
      let todayMtm = Number(r.today_mtm);
      let prevMtm = Number(r.prev_mtm);
      let totalCoupon = Number(r.total_coupon);

      if (curr === 'USD' && latestMar > 0 && prevMar > 0) {
        todayMtm = todayMtm / latestMar;
        prevMtm = prevMtm / prevMar;
        totalCoupon = totalCoupon / latestMar;
      }

      const totalDailyPnl = todayMtm - prevMtm;
      const totalPnl = totalDailyPnl + totalCoupon;
      const krwMul = (curr === 'USD' && latestMar > 0) ? latestMar : 1;
      const totalDailyPnlKrw = totalDailyPnl * krwMul;
      const totalCouponKrw = totalCoupon * krwMul;

      const structType = String(r.struct_type).replace(/\\/g, '₩');
      const assetInfo = assetMap[`${curr}::${structType}`] || { asset_count: 0, total_notional: 0 };

      return {
        curr,
        type1: String(r.type1).replace(/\\/g, '₩'),
        struct_type: structType,
        count: Number(r.count),
        asset_count: assetInfo.asset_count,
        total_notional: assetInfo.total_notional,
        total_daily_pnl: totalDailyPnl,
        total_coupon: totalCoupon,
        total_pnl: totalPnl,
        total_daily_pnl_krw: totalDailyPnlKrw,
        total_coupon_krw: totalCouponKrw,
        total_pnl_krw: totalDailyPnlKrw + totalCouponKrw,
      };
    });
  } catch (error) {
    console.error('fetchPnlSummaryByTypeAllFunds Error:', error);
    return [];
  }
}

/**
 * YTD PnL 추이 데이터
 * 단일 쿼리로 모든 연속 날짜 쌍의 PnL을 한번에 계산 (성능 최적화)
 */
export async function fetchPnlTrend(): Promise<{
  trend: { date: string; dateFull: string; daily: number; cumulative: number; byType: Record<string, number>; byStructType: Record<string, number> }[];
  carryTrend: { date: string; dateFull: string; daily: number; cumulative: number; byStructType: Record<string, number> }[];
  latestDate: string;
  allDates: string[];
  allTypes: string[];
  allStructTypes: string[];
  allCarryStructTypes: string[];
}> {
  noStore();

  try {
    // 모든 날짜 조회
    const datesResult = await sql`
      SELECT DISTINCT std_dt FROM breakdownprc ORDER BY std_dt ASC
    `;
    const allDates = datesResult.rows.map((r) => String(r.std_dt));
    if (allDates.length < 2) return { trend: [], carryTrend: [], latestDate: '', allDates: [], allTypes: [], allStructTypes: [], allCarryStructTypes: [] };

    // 모든 MAR 데이터 조회
    const marResult = await sql`
      SELECT std_dt, clprc_val FROM eq_unasp
      WHERE unas_id = 'USD/KRW_MAR'
      ORDER BY std_dt ASC
    `;
    const marTimeline = marResult.rows.map((r) => ({
      dt: String(r.std_dt),
      val: Number(r.clprc_val),
    }));

    function getMarBefore(targetDate: string): number {
      let bestVal = 0;
      for (const m of marTimeline) {
        if (m.dt < targetDate) bestVal = m.val;
        else break;
      }
      return bestVal;
    }

    // 종목별 날짜×MTM + struct_type을 한번에 가져옴 (N+1 쿼리 회피)
    const allMtmResult = await sql`
      SELECT
        b.obj_cd,
        b.std_dt,
        s.curr,
        s.tp,
        COALESCE(NULLIF(s.type1, ''), '기타') AS type1,
        CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')) AS struct_type,
        SUM(b.avg_prc) AS mtm
      FROM breakdownprc b
      JOIN strucprdp s ON s.obj_cd = b.obj_cd
      WHERE s.tp != '자체발행'
      GROUP BY b.obj_cd, b.std_dt, s.curr, s.tp, s.type1, s.type2, s.type3
    `;

    // obj_cd → { curr, tp, type1, structType, byDate: { dt → mtm } }
    const objMap: Record<string, { curr: string; tp: string; type1: string; structType: string; byDate: Record<string, number> }> = {};
    for (const r of allMtmResult.rows) {
      const objCd = String(r.obj_cd);
      const dt = String(r.std_dt);
      const curr = String(r.curr);
      const tp = String(r.tp);
      const type1 = String(r.type1).replace(/\\/g, '₩');
      const structType = (String(r.struct_type) || type1).replace(/\\/g, '₩');
      const mtm = Number(r.mtm);
      if (!objMap[objCd]) objMap[objCd] = { curr, tp, type1, structType, byDate: {} };
      objMap[objCd].byDate[dt] = mtm;
    }

    // 쿠폰 전체 조회
    const couponResult = await sql`
      SELECT
        e.pay_dt,
        s.curr,
        SUM(e.amt) AS coupon
      FROM excpnp e
      JOIN strucprdp s ON s.obj_cd = e.obj_cd
      WHERE s.tp != '자체발행'
      GROUP BY e.pay_dt, s.curr
    `;

    const couponMap: Record<string, Record<string, number>> = {};
    for (const r of couponResult.rows) {
      const dt = String(r.pay_dt);
      const curr = String(r.curr);
      if (!couponMap[dt]) couponMap[dt] = {};
      couponMap[dt][curr] = Number(r.coupon);
    }

    // type1별 쿠폰 조회 (pay_dt × type1별)
    const couponByTypeResult = await sql`
      SELECT
        e.pay_dt,
        s.tp,
        COALESCE(NULLIF(s.type1, ''), '기타') AS type1,
        CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')) AS struct_type,
        s.curr,
        SUM(e.amt) AS coupon
      FROM excpnp e
      JOIN strucprdp s ON s.obj_cd = e.obj_cd
      WHERE s.tp != '자체발행'
      GROUP BY e.pay_dt, s.tp, s.type1, s.type2, s.type3, s.curr
    `;
    const couponByTypeMap: Record<string, Record<string, Record<string, number>>> = {};
    // struct_type별 쿠폰 맵도 병렬 구축
    const couponByStructTypeMap: Record<string, Record<string, Record<string, number>>> = {};
    // 캐리 전용 struct_type별 쿠폰 맵
    const carryCouponByStructTypeMap: Record<string, Record<string, Record<string, number>>> = {};
    for (const r of couponByTypeResult.rows) {
      const dt = String(r.pay_dt);
      const tp = String(r.tp);
      const type1 = String(r.type1).replace(/\\/g, '₩');
      const structType = (String(r.struct_type) || type1).replace(/\\/g, '₩');
      const curr = String(r.curr);
      const coupon = Number(r.coupon);
      // type1별
      if (!couponByTypeMap[dt]) couponByTypeMap[dt] = {};
      if (!couponByTypeMap[dt][type1]) couponByTypeMap[dt][type1] = {};
      couponByTypeMap[dt][type1][curr] = (couponByTypeMap[dt][type1][curr] || 0) + coupon;
      // struct_type별
      if (!couponByStructTypeMap[dt]) couponByStructTypeMap[dt] = {};
      if (!couponByStructTypeMap[dt][structType]) couponByStructTypeMap[dt][structType] = {};
      couponByStructTypeMap[dt][structType][curr] = (couponByStructTypeMap[dt][structType][curr] || 0) + coupon;
      // 캐리 전용
      if (tp === '캐리') {
        if (!carryCouponByStructTypeMap[dt]) carryCouponByStructTypeMap[dt] = {};
        if (!carryCouponByStructTypeMap[dt][structType]) carryCouponByStructTypeMap[dt][structType] = {};
        carryCouponByStructTypeMap[dt][structType][curr] = (carryCouponByStructTypeMap[dt][structType][curr] || 0) + coupon;
      }
    }

    // 일별 PnL 계산 (연속 날짜 쌍에서 양쪽 모두 존재하는 종목만 비교)
    const allTypesSet = new Set<string>();
    const allStructTypesSet = new Set<string>();
    const allCarryStructTypesSet = new Set<string>();
    const trend: { date: string; dateFull: string; daily: number; cumulative: number; byType: Record<string, number>; byStructType: Record<string, number> }[] = [];
    const carryTrend: { date: string; dateFull: string; daily: number; cumulative: number; byStructType: Record<string, number> }[] = [];
    let cumulative = 0;
    let carryCumulative = 0;

    for (let i = 1; i < allDates.length; i++) {
      const prevDt = allDates[i - 1];
      const currDt = allDates[i];
      const currMar = getMarBefore(currDt);
      const prevMarVal = getMarBefore(prevDt);

      // type1별 / struct_type별 PnL 집계
      const typePnlKrw: Record<string, number> = {};
      const structTypePnlKrw: Record<string, number> = {};
      // 캐리 전용 struct_type별 PnL
      const carryStructTypePnlKrw: Record<string, number> = {};

      for (const [, entry] of Object.entries(objMap)) {
        const tMtm = entry.byDate[currDt];
        const pMtm = entry.byDate[prevDt];
        if (tMtm === undefined || pMtm === undefined) continue;

        const curr = entry.curr;
        const tp = entry.tp;
        const type1 = entry.type1;
        const structType = entry.structType;
        allTypesSet.add(type1);
        allStructTypesSet.add(structType);

        let pnlKrw: number;
        if (curr === 'USD' && currMar > 0 && prevMarVal > 0) {
          // dual MAR: (mtm_today/currMar - mtm_prev/prevMar) × currMar → KRW
          const usdPnl = (tMtm / currMar) - (pMtm / prevMarVal);
          pnlKrw = usdPnl * currMar;
        } else {
          pnlKrw = tMtm - pMtm;
        }

        typePnlKrw[type1] = (typePnlKrw[type1] || 0) + pnlKrw;
        structTypePnlKrw[structType] = (structTypePnlKrw[structType] || 0) + pnlKrw;

        // 캐리 TP 전용 집계
        if (tp === '캐리') {
          allCarryStructTypesSet.add(structType);
          carryStructTypePnlKrw[structType] = (carryStructTypePnlKrw[structType] || 0) + pnlKrw;
        }
      }

      // type1별 쿠폰 추가 (prevDt < pay_dt <= currDt 범위, 날짜 갭 누락 방지)
      for (const [payDt, typeMap] of Object.entries(couponByTypeMap)) {
        if (payDt > prevDt && payDt <= currDt) {
          for (const [type1, currMap] of Object.entries(typeMap)) {
            allTypesSet.add(type1);
            for (const [, coupon] of Object.entries(currMap)) {
              typePnlKrw[type1] = (typePnlKrw[type1] || 0) + coupon;
            }
          }
        }
      }

      // struct_type별 쿠폰 추가 (prevDt < pay_dt <= currDt 범위)
      for (const [payDt, stMap] of Object.entries(couponByStructTypeMap)) {
        if (payDt > prevDt && payDt <= currDt) {
          for (const [structType, currMap] of Object.entries(stMap)) {
            allStructTypesSet.add(structType);
            for (const [, coupon] of Object.entries(currMap)) {
              structTypePnlKrw[structType] = (structTypePnlKrw[structType] || 0) + coupon;
            }
          }
        }
      }

      // 캐리 전용 struct_type별 쿠폰 추가
      for (const [payDt, stMap] of Object.entries(carryCouponByStructTypeMap)) {
        if (payDt > prevDt && payDt <= currDt) {
          for (const [structType, currMap] of Object.entries(stMap)) {
            allCarryStructTypesSet.add(structType);
            for (const [, coupon] of Object.entries(currMap)) {
              carryStructTypePnlKrw[structType] = (carryStructTypePnlKrw[structType] || 0) + coupon;
            }
          }
        }
      }

      // 일별 총 PnL
      let dailyPnlKrw = 0;
      const byType: Record<string, number> = {};
      for (const [type1, pnl] of Object.entries(typePnlKrw)) {
        const eok = pnl / 100000000;
        byType[type1] = Math.round(eok * 100) / 100;
        dailyPnlKrw += pnl;
      }
      const byStructType: Record<string, number> = {};
      for (const [st, pnl] of Object.entries(structTypePnlKrw)) {
        byStructType[st] = Math.round((pnl / 100000000) * 100) / 100;
      }

      cumulative += dailyPnlKrw;
      const dailyEok = dailyPnlKrw / 100000000;
      const cumulativeEok = cumulative / 100000000;

      trend.push({
        date: `${currDt.slice(4, 6)}/${currDt.slice(6, 8)}`,
        dateFull: currDt,
        daily: Math.round(dailyEok * 100) / 100,
        cumulative: Math.round(cumulativeEok * 100) / 100,
        byType,
        byStructType,
      });

      // Carry 전용 trend
      let carryDailyKrw = 0;
      const carryByStructType: Record<string, number> = {};
      for (const [st, pnl] of Object.entries(carryStructTypePnlKrw)) {
        carryByStructType[st] = Math.round((pnl / 100000000) * 100) / 100;
        carryDailyKrw += pnl;
      }
      carryCumulative += carryDailyKrw;
      carryTrend.push({
        date: `${currDt.slice(4, 6)}/${currDt.slice(6, 8)}`,
        dateFull: currDt,
        daily: Math.round((carryDailyKrw / 100000000) * 100) / 100,
        cumulative: Math.round((carryCumulative / 100000000) * 100) / 100,
        byStructType: carryByStructType,
      });
    }

    const allTypes = Array.from(allTypesSet).sort();
    const allStructTypes = Array.from(allStructTypesSet).sort();
    const allCarryStructTypes = Array.from(allCarryStructTypesSet).sort();
    return { trend, carryTrend, latestDate: allDates[allDates.length - 1], allDates, allTypes, allStructTypes, allCarryStructTypes };
  } catch (error) {
    console.error('fetchPnlTrend Error:', error);
    return { trend: [], carryTrend: [], latestDate: '', allDates: [], allTypes: [], allStructTypes: [], allCarryStructTypes: [] };
  }
}

/**
 * PnL 요약 카드 데이터 (Daily/MTD/YTD/Carry)
 * fetchPnlTrend 결과를 받아서 계산 (중복 호출 방지)
 * targetDate: 선택된 날짜의 MM/DD 포맷 (trend.date와 동일)
 */
export function computePnlSummaryCards(
  trend: { date: string; dateFull?: string; daily: number; cumulative: number }[],
  carryTrend: { date: string; dateFull?: string; daily: number; cumulative: number }[],
  targetDateMMDD?: string,
): {
  dailyPnl: number;
  mtdPnl: number;
  ytdPnl: number;
  carryPnl: number;
  ytdCarryPnl: number;
} {
  if (trend.length === 0) {
    return { dailyPnl: 0, mtdPnl: 0, ytdPnl: 0, carryPnl: 0, ytdCarryPnl: 0 };
  }

  // targetDate까지 슬라이스
  let slicedTrend = trend;
  let slicedCarry = carryTrend;
  if (targetDateMMDD) {
    const idx = trend.findIndex((t) => t.date === targetDateMMDD);
    if (idx >= 0) {
      slicedTrend = trend.slice(0, idx + 1);
      slicedCarry = carryTrend.slice(0, idx + 1);
    }
  }

  // Daily: 선택 날짜의 PnL (억)
  const dailyPnl = slicedTrend[slicedTrend.length - 1].daily;

  // YTD: 누적 합계 (억)
  const ytdPnl = slicedTrend[slicedTrend.length - 1].cumulative;

  // MTD: 해당 월의 PnL 합계 (억)
  const lastDate = slicedTrend[slicedTrend.length - 1].date; // MM/DD
  const targetMonth = lastDate.slice(0, 2);
  const mtdPnl = slicedTrend
    .filter((t) => t.date.slice(0, 2) === targetMonth)
    .reduce((s, t) => s + t.daily, 0);

  // Carry PnL: tp='캐리' 상품의 해당일 PnL (억 단위)
  const carryPnl = slicedCarry.length > 0
    ? slicedCarry[slicedCarry.length - 1].daily
    : 0;

  // YTD Carry PnL: 캐리 스왑 누적 PnL (억 단위)
  const ytdCarryPnl = slicedCarry.length > 0
    ? slicedCarry[slicedCarry.length - 1].cumulative
    : 0;

  return {
    dailyPnl: Math.round(dailyPnl * 100) / 100,
    mtdPnl: Math.round(mtdPnl * 100) / 100,
    ytdPnl: Math.round(ytdPnl * 100) / 100,
    carryPnl: Math.round(carryPnl * 100) / 100,
    ytdCarryPnl: Math.round(ytdCarryPnl * 100) / 100,
  };
}

/**
 * Risk Delta 추이 데이터
 * pnlrtp의 HDG_TNR_DLT(Net) + market_rates의 KTB/UST 10Y 금리
 * KRW Delta = KTB + KRW Net, USD Delta = UST + USD Net
 */
export async function fetchRiskDelta(): Promise<{
  data: {
    date: string;       // MM/DD
    dateFull: string;   // YYYYMMDD
    krwDelta: number;   // KRW+KTB Net 델타 (억) — 원화
    usdDelta: number;   // USD+UST Net 델타 (억) — 이미 원화 환산됨
    totalDelta: number; // KRW+USD 합계 (억)
    ktb10y: number | null;  // KTB 10Y 금리 (%)
    ust10y: number | null;  // UST 10Y 금리 (%)
  }[];
  // 최신일 개별 커브 델타 (카드 표시용, 원 단위)
  latestCurves: {
    krw: number;  // KRW 커브 원 단위
    ktb: number;  // KTB 커브 원 단위
    usd: number;  // USD 커브 원 단위
    ust: number;  // UST 커브 원 단위
  } | null;
}> {
  noStore();

  try {
    // KRW Delta (KTB+KRW Net) — 차트용
    const krwResult = await sql`
      SELECT std_dt, SUM(hdg_tnr_dlt) AS delta
      FROM pnlrtp
      WHERE intl_ytm_curv_cd IN ('KRW','KTB') AND tnr_cd = 'Net'
      GROUP BY std_dt ORDER BY std_dt
    `;

    // USD Delta (UST+USD Net) — 차트용, 이미 원화 환산된 값
    const usdResult = await sql`
      SELECT std_dt, SUM(hdg_tnr_dlt) AS delta
      FROM pnlrtp
      WHERE intl_ytm_curv_cd IN ('USD','UST') AND tnr_cd = 'Net'
      GROUP BY std_dt ORDER BY std_dt
    `;

    // 개별 커브 최신일 델타 (카드 표시용)
    const curveResult = await sql`
      SELECT intl_ytm_curv_cd, SUM(hdg_tnr_dlt) AS delta
      FROM pnlrtp
      WHERE tnr_cd = 'Net'
        AND std_dt = (SELECT MAX(std_dt) FROM pnlrtp)
      GROUP BY intl_ytm_curv_cd
    `;

    // 시장 금리
    const rateResult = await sql`
      SELECT std_dt, ktb_10y, ust_10y FROM market_rates ORDER BY std_dt
    `;

    // 맵 변환
    const krwMap: Record<string, number> = {};
    for (const r of krwResult.rows) krwMap[String(r.std_dt)] = Number(r.delta);

    const usdMap: Record<string, number> = {};
    for (const r of usdResult.rows) usdMap[String(r.std_dt)] = Number(r.delta);

    const rateMap: Record<string, { ktb: number; ust: number }> = {};
    for (const r of rateResult.rows) {
      rateMap[String(r.std_dt)] = { ktb: Number(r.ktb_10y), ust: Number(r.ust_10y) };
    }

    // 개별 커브 델타 맵
    const curveMap: Record<string, number> = {};
    for (const r of curveResult.rows) {
      curveMap[String(r.intl_ytm_curv_cd)] = Number(r.delta);
    }
    const latestCurves = curveResult.rows.length > 0 ? {
      krw: curveMap['KRW'] || 0,
      ktb: curveMap['KTB'] || 0,
      usd: curveMap['USD'] || 0,
      ust: curveMap['UST'] || 0,
    } : null;

    // 모든 날짜 (pnlrtp 기준)
    const allDates = [...new Set([
      ...krwResult.rows.map((r) => String(r.std_dt)),
      ...usdResult.rows.map((r) => String(r.std_dt)),
    ])].sort();

    const data = allDates.map((dt) => {
      const krwDeltaRaw = krwMap[dt] || 0;   // 원 단위 (원화)
      const usdDeltaRaw = usdMap[dt] || 0;   // 원 단위 (이미 원화 환산)
      const rate = rateMap[dt] || null;

      // KRW Delta: 억 단위
      const krwDelta = Math.round((krwDeltaRaw / 100000000) * 100) / 100;
      // USD Delta: 억 단위 (이미 원화이므로 동일하게 억 변환)
      const usdDelta = Math.round((usdDeltaRaw / 100000000) * 100) / 100;
      // Total: 단순 합산 (억)
      const totalDelta = Math.round(((krwDeltaRaw + usdDeltaRaw) / 100000000) * 100) / 100;

      return {
        date: `${dt.slice(4, 6)}/${dt.slice(6, 8)}`,
        dateFull: dt,
        krwDelta,
        usdDelta,
        totalDelta,
        ktb10y: rate ? rate.ktb : null,
        ust10y: rate ? rate.ust : null,
      };
    });

    return { data, latestCurves };
  } catch (error) {
    console.error('fetchRiskDelta Error:', error);
    return { data: [], latestCurves: null };
  }
}

/**
 * pnlrtp 최신일 전체 데이터 (커브별 테너 상세)
 * KRW, KTB, USD, UST 순으로 반환
 */
export type PnlrtpRow = {
  intl_ytm_curv_cd: string;
  curv_tp_cd: string;
  tnr_cd: string;
  nt_tnr_dlt: number;
  str_tnr_dlt: number;
  str_tnr_delta_chg: number;
  hdg_tnr_dlt: number;
  hdg_tnr_dlt_chg: number;
  sprdvl_sprd: number;
  sprdvl_sprd_yr: number;
  sprdvl_dlt: number;
  sprdvl_crry_d: number;
  crry: number;
  rll: number;
};

export async function fetchPnlrtpDetail(): Promise<{
  rows: PnlrtpRow[];
  stdDt: string;
}> {
  noStore();

  try {
    const result = await sql`
      SELECT
        intl_ytm_curv_cd, curv_tp_cd, tnr_cd,
        COALESCE(nt_tnr_dlt, 0) AS nt_tnr_dlt,
        COALESCE(str_tnr_dlt, 0) AS str_tnr_dlt,
        COALESCE(str_tnr_delta_chg, 0) AS str_tnr_delta_chg,
        COALESCE(hdg_tnr_dlt, 0) AS hdg_tnr_dlt,
        COALESCE(hdg_tnr_dlt_chg, 0) AS hdg_tnr_dlt_chg,
        COALESCE(sprdvl_sprd, 0) AS sprdvl_sprd,
        COALESCE(sprdvl_sprd_yr, 0) AS sprdvl_sprd_yr,
        COALESCE(sprdvl_dlt, 0) AS sprdvl_dlt,
        COALESCE(sprdvl_crry_d, 0) AS sprdvl_crry_d,
        COALESCE(crry, 0) AS crry,
        COALESCE(rll, 0) AS rll
      FROM pnlrtp
      WHERE std_dt = (SELECT MAX(std_dt) FROM pnlrtp)
      ORDER BY
        CASE intl_ytm_curv_cd
          WHEN 'KRW' THEN 1 WHEN 'KTB' THEN 2
          WHEN 'USD' THEN 3 WHEN 'UST' THEN 4
          ELSE 5
        END,
        curv_tp_cd,
        CASE tnr_cd
          WHEN 'Net' THEN 9999
          ELSE CAST(REGEXP_REPLACE(tnr_cd, '[^0-9]', '', 'g') AS INTEGER)
        END NULLS LAST
    `;

    const dtResult = await sql`SELECT MAX(std_dt) AS dt FROM pnlrtp`;
    const stdDt = dtResult.rows.length > 0 ? String(dtResult.rows[0].dt) : '';

    const rows: PnlrtpRow[] = result.rows.map((r) => ({
      intl_ytm_curv_cd: String(r.intl_ytm_curv_cd),
      curv_tp_cd: String(r.curv_tp_cd),
      tnr_cd: String(r.tnr_cd),
      nt_tnr_dlt: Number(r.nt_tnr_dlt),
      str_tnr_dlt: Number(r.str_tnr_dlt),
      str_tnr_delta_chg: Number(r.str_tnr_delta_chg),
      hdg_tnr_dlt: Number(r.hdg_tnr_dlt),
      hdg_tnr_dlt_chg: Number(r.hdg_tnr_dlt_chg),
      sprdvl_sprd: Number(r.sprdvl_sprd),
      sprdvl_sprd_yr: Number(r.sprdvl_sprd_yr),
      sprdvl_dlt: Number(r.sprdvl_dlt),
      sprdvl_crry_d: Number(r.sprdvl_crry_d),
      crry: Number(r.crry),
      rll: Number(r.rll),
    }));

    return { rows, stdDt };
  } catch (error) {
    console.error('fetchPnlrtpDetail Error:', error);
    return { rows: [], stdDt: '' };
  }
}

// ========== 괴리(자산+MTM) 분석 ==========

export type GapDataPoint = {
  structType: string;
  curr: string;
  productCount: number;
  notionalEok: number; // 잔액 (억 단위)
  gap: number;        // 자산+MTM 합계 (원 단위)
  asset: number;      // 자산 합계
  mtm: number;        // MTM 합계
  gapEok: number;     // 억 단위 변환
  prevGapEok: number; // 전일 괴리 (억)
  change: number;     // 일일 변동 (억)
};

export type GapTrendPoint = {
  date: string;
  structType: string;
  curr: string;
  gapEok: number;
};

// 개별 종목별 괴리 (상위 N개 표시용)
export type GapProductDetail = {
  objCd: string;
  fndNm: string;     // 종목명
  structType: string;
  curr: string;
  gapEok: number;    // 괴리 (억)
  notionalEok: number; // 잔액 (억)
};

/**
 * struct_type별 괴리(자산+MTM) 현황 + 전일 대비 변동
 * 요약 탭 버블 차트용
 */
export async function fetchGapAnalysis(targetDate?: string): Promise<{
  data: GapDataPoint[];
  trend: GapTrendPoint[];
  details: GapProductDetail[];
  stdDt: string;
}> {
  try {
    // 최신 10일 날짜 가져오기
    const datesRes = targetDate
      ? await sql`SELECT DISTINCT std_dt FROM breakdownprc WHERE std_dt <= ${targetDate} ORDER BY std_dt DESC LIMIT 10`
      : await sql`SELECT DISTINCT std_dt FROM breakdownprc ORDER BY std_dt DESC LIMIT 10`;
    if (datesRes.rows.length === 0) return { data: [], trend: [], stdDt: '' };

    const latestDt = datesRes.rows[0].std_dt as string;
    const prevDt = datesRes.rows.length > 1 ? (datesRes.rows[1].std_dt as string) : null;
    const trendDates = datesRes.rows.map((r: any) => r.std_dt as string);

    // USD 종목별 MAR 환율 (eff_dt -1영업일 기준)
    const marRates = await fetchUsdMarRates();
    // fallback 환율
    const fxFallback = await sql`
      SELECT close_value FROM tb_macro_index
      WHERE ticker = 'USD/KRW' AND asset_class = 'FX'
      ORDER BY base_date DESC LIMIT 1
    `;
    const defaultFxRate = fxFallback.rows.length > 0 ? Number(fxFallback.rows[0].close_value) : 1450;

    // USD 종목 obj_cd → MAR 환율 매핑 (struct_type 그룹 가중평균용)
    const usdProductsRes = await sql`
      SELECT obj_cd, curr, notn,
        CONCAT_WS(' / ', NULLIF(type1,''), NULLIF(type2,''), NULLIF(type3,'')) as struct_type
      FROM strucprdp
      WHERE curr = 'USD' AND tp = '자산'
        AND (call_yn = 'N' OR call_yn IS NULL)
    `;
    // struct_type별 USD 잔액 원화환산 합계
    const usdNotionalKrwByType: Record<string, number> = {};
    for (const p of usdProductsRes.rows) {
      const key = `${p.struct_type}|USD`;
      const mar = marRates[String(p.obj_cd)] || defaultFxRate;
      usdNotionalKrwByType[key] = (usdNotionalKrwByType[key] || 0) + Number(p.notn) * mar;
    }

    // 최신일 struct_type별 괴리
    const gapRes = await sql`
      SELECT
        CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')) as struct_type,
        s.curr,
        COUNT(DISTINCT b.obj_cd) as product_cnt,
        COALESCE(SUM(DISTINCT s.notn), 0) as total_notional,
        SUM(CASE WHEN b.tp IN ('자산','MTM') THEN b.avg_prc ELSE 0 END) as gap,
        SUM(CASE WHEN b.tp = '자산' THEN b.avg_prc ELSE 0 END) as asset,
        SUM(CASE WHEN b.tp = 'MTM' THEN b.avg_prc ELSE 0 END) as mtm
      FROM breakdownprc b
      JOIN strucprdp s ON b.obj_cd = s.obj_cd AND s.tp != '자체발행'
      WHERE b.std_dt = ${latestDt}
        AND (s.call_yn = 'N' OR s.call_yn IS NULL)
      GROUP BY struct_type, s.curr
      ORDER BY ABS(SUM(CASE WHEN b.tp IN ('자산','MTM') THEN b.avg_prc ELSE 0 END)) DESC
    `;

    // 전일 struct_type별 괴리 (변동 계산용)
    let prevGapMap: Record<string, number> = {};
    if (prevDt) {
      const prevRes = await sql`
        SELECT
          CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')) as struct_type,
          s.curr,
          SUM(CASE WHEN b.tp IN ('자산','MTM') THEN b.avg_prc ELSE 0 END) as gap
        FROM breakdownprc b
        JOIN strucprdp s ON b.obj_cd = s.obj_cd AND s.tp != '자체발행'
        WHERE b.std_dt = ${prevDt}
          AND (s.call_yn = 'N' OR s.call_yn IS NULL)
        GROUP BY struct_type, s.curr
      `;
      for (const r of prevRes.rows) {
        prevGapMap[`${r.struct_type}|${r.curr}`] = Number(r.gap) / 100000000;
      }
    }

    const data: GapDataPoint[] = gapRes.rows.map((r: any) => {
      const curr = r.curr as string;
      const key = `${r.struct_type}|${curr}`;
      const rawNotional = Number(r.total_notional);

      // USD → 원화환산 (MAR 기준), KRW → 그대로
      let notionalKrw: number;
      if (curr === 'USD') {
        notionalKrw = usdNotionalKrwByType[key] || rawNotional * defaultFxRate;
      } else {
        notionalKrw = rawNotional;
      }

      const gapEok = Number(r.gap) / 100000000;
      const prevGapEok = prevGapMap[key] ?? gapEok;
      return {
        structType: r.struct_type,
        curr,
        productCount: Number(r.product_cnt),
        notionalEok: Math.round(notionalKrw / 100000000 * 10) / 10,
        gap: Number(r.gap),
        asset: Number(r.asset),
        mtm: Number(r.mtm),
        gapEok: Math.round(gapEok * 10) / 10,
        prevGapEok: Math.round(prevGapEok * 10) / 10,
        change: Math.round((gapEok - prevGapEok) * 10) / 10,
      };
    });

    // 최근 10일 추이 데이터: 최소~최대 날짜 범위로 조회
    const minDt = trendDates[trendDates.length - 1];
    const maxDt = trendDates[0];
    const trendRes = await sql`
      SELECT
        b.std_dt,
        CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')) as struct_type,
        s.curr,
        SUM(CASE WHEN b.tp IN ('자산','MTM') THEN b.avg_prc ELSE 0 END) as gap
      FROM breakdownprc b
      JOIN strucprdp s ON b.obj_cd = s.obj_cd AND s.tp != '자체발행'
      WHERE b.std_dt >= ${minDt} AND b.std_dt <= ${maxDt}
        AND (s.call_yn = 'N' OR s.call_yn IS NULL)
      GROUP BY b.std_dt, struct_type, s.curr
      ORDER BY b.std_dt
    `;

    const trend: GapTrendPoint[] = trendRes.rows.map((r: any) => ({
      date: r.std_dt,
      structType: r.struct_type,
      curr: r.curr,
      gapEok: Math.round(Number(r.gap) / 100000000 * 10) / 10,
    }));

    // 개별 종목별 괴리 (사이드 패널 상위 3개 표시용)
    const detailRes = await sql`
      SELECT
        b.obj_cd,
        s.fnd_nm,
        CONCAT_WS(' / ', NULLIF(s.type1,''), NULLIF(s.type2,''), NULLIF(s.type3,'')) as struct_type,
        s.curr,
        s.notn,
        SUM(CASE WHEN b.tp IN ('자산','MTM') THEN b.avg_prc ELSE 0 END) as gap
      FROM breakdownprc b
      JOIN strucprdp s ON b.obj_cd = s.obj_cd AND s.tp = '자산'
      WHERE b.std_dt = ${latestDt}
        AND (s.call_yn = 'N' OR s.call_yn IS NULL)
      GROUP BY b.obj_cd, s.fnd_nm, struct_type, s.curr, s.notn
      ORDER BY ABS(SUM(CASE WHEN b.tp IN ('자산','MTM') THEN b.avg_prc ELSE 0 END)) DESC
    `;

    const details: GapProductDetail[] = detailRes.rows.map((r: any) => {
      const curr = r.curr as string;
      const rawNotn = Number(r.notn);
      const notionalKrw = curr === 'USD'
        ? rawNotn * (marRates[String(r.obj_cd)] || defaultFxRate)
        : rawNotn;
      return {
        objCd: String(r.obj_cd),
        fndNm: String(r.fnd_nm || r.obj_cd),
        structType: r.struct_type,
        curr,
        gapEok: Math.round(Number(r.gap) / 100000000 * 10) / 10,
        notionalEok: Math.round(notionalKrw / 100000000 * 10) / 10,
      };
    });

    return { data, trend, details, stdDt: latestDt };
  } catch (error) {
    console.error('fetchGapAnalysis Error:', error);
    return { data: [], trend: [], details: [], stdDt: '' };
  }
}
