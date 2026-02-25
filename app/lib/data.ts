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
